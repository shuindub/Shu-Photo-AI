
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { WaveformIcon, MicrophoneIcon, StopCircleIcon } from '../components/Icons';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { LindaConfig } from '../types';

interface LiveVoiceSessionProps {
  config: LindaConfig;
  onSecretTrigger?: () => void;
  onTranscript?: (role: 'user' | 'model', text: string) => void;
  isLoveMode?: boolean;
}

const LiveVoiceSession: React.FC<LiveVoiceSessionProps> = ({ config, onSecretTrigger, onTranscript, isLoveMode }) => {
  const { t } = useSettings();
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'initializing' | 'connecting' | 'connected' | 'speaking' | 'updating'>('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [volume, setVolume] = useState(0);
  const [micLabel, setMicLabel] = useState('');
  
  // Refs for state that needs to be fresh in callbacks
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const latestConfigRef = useRef(config);
  
  // SINGLE Shared Audio Context - PERMANENT REF
  // We initialize this ONCE and never set it to null unless unmounting entirely requires it (but usually we just suspend)
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const sessionRef = useRef<any>(null); 
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  
  // Nodes that need to be re-created or disconnected per session
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null); // Main output volume
  const silenceNodeRef = useRef<GainNode | null>(null);

  const volumeIntervalRef = useRef<number | null>(null);
  
  const userTranscriptBuffer = useRef<string>('');
  const modelTranscriptBuffer = useRef<string>('');
  const prevConfigInstructionsRef = useRef(config.instructions);

  useEffect(() => {
      latestConfigRef.current = config;
  }, [config]);

  const getAudioContext = () => {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
      }
      return audioContextRef.current;
  };

  const startSession = async (isRetry = false) => {
    if (!navigator.onLine) {
        setErrorMessage("No internet connection.");
        return;
    }

    if (!isRetry) {
        setErrorMessage('');
        retryCountRef.current = 0;
    }

    if (status !== 'updating') {
        setStatus('initializing');
    }

    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key missing");
      }

      setStatus('initializing');

      // 1. Initialize / Resume SINGLE Shared Audio Context
      const ctx = getAudioContext();
      // Note: resume() is called synchronously in the button onClick for iOS, 
      // but we double check here for retries or desktop.
      if (ctx.state === 'suspended') {
          await ctx.resume();
      }

      // Setup Persistent Nodes if missing (Analysers/Gains can typically stay, but we refresh to be safe)
      if (!gainNodeRef.current) {
          gainNodeRef.current = ctx.createGain();
          gainNodeRef.current.connect(ctx.destination);
      }
      
      if (!analyserRef.current) {
          analyserRef.current = ctx.createAnalyser();
          analyserRef.current.fftSize = 256;
      }
      
      nextStartTimeRef.current = 0;

      // 2. Get Microphone Stream
      let stream: MediaStream;
      try {
          stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
              } 
          });
          streamRef.current = stream;
          const track = stream.getAudioTracks()[0];
          setMicLabel(track.label || 'Default Microphone');
      } catch (err: any) {
          console.error("Mic Error:", err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              throw new Error("Mic access denied. Tap button to enable permissions.");
          } else {
              throw new Error("Microphone error: " + err.message);
          }
      }

      setStatus('connecting');

      // 3. Connect to Gemini Live API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentConfig = latestConfigRef.current;
      
      const systemSampleRate = ctx.sampleRate;
      const targetSampleRate = 16000; 

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            setStatus('connected');
            setIsStreaming(true);
            retryCountRef.current = 0;
            
            if (!ctx) return;

            startVolumeMeter();

            // Connect Source -> Analyser -> ScriptProcessor -> Silence -> Destination
            sourceNodeRef.current = ctx.createMediaStreamSource(stream);
            scriptProcessorRef.current = ctx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                
                // Noise Gate
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
                const avg = sum / inputData.length;
                if (avg < 0.005) return; // Silence threshold

                // Downsample
                const downsampledData = downsampleBuffer(inputData, systemSampleRate, targetSampleRate);
                
                const l = downsampledData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                    const val = Math.max(-1, Math.min(1, downsampledData[i]));
                    int16[i] = val * 32768;
                }
                
                const pcmBlob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: `audio/pcm;rate=${targetSampleRate}`, 
                };
                
                sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

            // Create Silence Node (Mute self)
            if (!silenceNodeRef.current) {
                silenceNodeRef.current = ctx.createGain();
                silenceNodeRef.current.gain.value = 0;
                silenceNodeRef.current.connect(ctx.destination);
            }

            // Connect Graph
            sourceNodeRef.current.connect(analyserRef.current!);
            analyserRef.current!.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(silenceNodeRef.current);
          },
          onmessage: async (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
                const text = content.inputTranscription.text;
                userTranscriptBuffer.current += text;
                if (userTranscriptBuffer.current.toLowerCase().includes("мой любимый фейсер")) {
                     if (onSecretTrigger) {
                         onSecretTrigger();
                         userTranscriptBuffer.current = ''; 
                     }
                }
            }

            if (content?.outputTranscription?.text) {
                const text = content.outputTranscription.text;
                modelTranscriptBuffer.current += text;
            }

            if (content?.turnComplete) {
                if (userTranscriptBuffer.current.trim()) {
                    onTranscript?.('user', userTranscriptBuffer.current);
                    userTranscriptBuffer.current = '';
                }
                if (modelTranscriptBuffer.current.trim()) {
                    onTranscript?.('model', modelTranscriptBuffer.current);
                    modelTranscriptBuffer.current = '';
                }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current && gainNodeRef.current) {
               setStatus('speaking');
               
               const ctx = audioContextRef.current;
               const audioBuffer = await decodeAudioData(
                   decode(base64Audio),
                   ctx,
                   24000, 
                   1
               );
               
               const currentTime = ctx.currentTime;
               if (nextStartTimeRef.current < currentTime) {
                   nextStartTimeRef.current = currentTime;
               }
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(gainNodeRef.current); 
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               
               source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) {
                       setStatus(prev => prev === 'speaking' ? 'connected' : prev);
                   }
               });
               sourcesRef.current.add(source);
            }
            
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                sourcesRef.current.forEach(source => source.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setStatus('connected');
            }
          },
          onclose: () => {
             stopSession();
          },
          onerror: (e) => {
             console.warn("Live API Warning:", e);
             stopSession(true); 
             
             const currentRetry = retryCountRef.current;
             if (currentRetry < 3) {
                 const nextRetry = currentRetry + 1;
                 retryCountRef.current = nextRetry;
                 
                 const delay = Math.min(1000 * Math.pow(2, nextRetry), 5000);
                 setErrorMessage(`Connection drop. Retrying (${nextRetry})...`);
                 retryTimeoutRef.current = window.setTimeout(() => startSession(true), delay);
             } else {
                 setErrorMessage("Connection failed. Please restart.");
             }
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: currentConfig.voiceName || 'Zephyr' } },
            },
            systemInstruction: currentConfig.instructions,
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error("Connection failed", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to connect");
      stopSession();
    }
  };

  // Helper: Downsample audio buffer to save bandwidth
  const downsampleBuffer = (buffer: Float32Array, inputRate: number, outputRate: number) => {
      if (outputRate === inputRate) return buffer;
      const sampleRateRatio = inputRate / outputRate;
      const newLength = Math.round(buffer.length / sampleRateRatio);
      const result = new Float32Array(newLength);
      let offsetResult = 0;
      let offsetBuffer = 0;
      while (offsetResult < result.length) {
          const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
          // Simple averaging
          let accum = 0, count = 0;
          for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
              accum += buffer[i];
              count++;
          }
          result[offsetResult] = count > 0 ? accum / count : 0;
          offsetResult++;
          offsetBuffer = nextOffsetBuffer;
      }
      return result;
  };

  const startVolumeMeter = () => {
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      
      volumeIntervalRef.current = window.setInterval(() => {
          if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setVolume(Math.min(100, (average / 128) * 100)); 
          }
      }, 100);
  };

  const stopSession = useCallback((isRetrying = false) => {
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
    }
    if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
    }
    setVolume(0);

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Disconnect Nodes but DO NOT close Context
    // This allows us to reuse the hardware context later instantly
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
    }

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();

    setIsStreaming(false);
    
    setStatus(prev => {
        if (prev !== 'updating') return 'disconnected';
        return prev;
    });

    userTranscriptBuffer.current = '';
    modelTranscriptBuffer.current = '';
  }, []);

  // Monitor config changes
  useEffect(() => {
      if (isStreaming && config.instructions !== prevConfigInstructionsRef.current) {
           setStatus('updating'); 
           stopSession(true); // isRetrying=true means we intend to restart
           retryTimeoutRef.current = window.setTimeout(() => startSession(true), 800);
      }
      prevConfigInstructionsRef.current = config.instructions;
  }, [config]);

  useEffect(() => {
      return () => {
          stopSession(false); 
          // On full unmount, we can optionally close the context, but keeping it isn't harmful
      };
  }, [stopSession]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50 dark:bg-gray-900 space-y-8 relative overflow-hidden">
      
      <div className={`relative flex items-center justify-center transition-all duration-200`} style={{ transform: `scale(${status === 'speaking' ? 1.1 : 1})` }}>
        {/* Pulse Ring */}
        <div 
            className={`absolute rounded-full transition-all duration-100 ${isLoveMode ? 'bg-pink-500/20' : 'bg-indigo-500/20'}`}
            style={{ 
                width: `${10 + (volume * 2)}rem`, 
                height: `${10 + (volume * 2)}rem`,
                opacity: volume > 5 ? 0.5 : 0 
            }}
        ></div>

        {/* Static Ring */}
        <div className={`absolute w-32 h-32 rounded-full animate-pulse delay-75 ${isLoveMode ? 'bg-pink-500/30' : 'bg-indigo-500/30'} ${status !== 'disconnected' ? 'opacity-100' : 'opacity-0'}`}></div>
        
        {/* Icon */}
        <div className={`w-24 h-24 rounded-full shadow-2xl flex items-center justify-center relative z-10 border-4 border-white dark:border-gray-800 ${isLoveMode ? 'bg-gradient-to-br from-pink-500 to-red-600' : 'bg-gradient-to-br from-indigo-600 to-purple-700'}`}>
             {status === 'initializing' || status === 'connecting' || status === 'updating' ? (
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
             ) : (
                 <WaveformIcon className={`w-10 h-10 text-white ${status === 'speaking' ? 'animate-pulse' : ''}`} />
             )}
        </div>
      </div>

      <div className="text-center z-10 min-h-[80px]">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-all">
              {status === 'disconnected' 
                  ? 'Ready to talk?' 
                  : status === 'updating' 
                      ? 'Updating Persona...' 
                      : status === 'initializing'
                          ? 'Acquiring Mic...'
                          : status === 'connecting' 
                              ? 'Connecting Socket...' 
                              : status === 'speaking' 
                                  ? (isLoveMode ? 'Linda is whispering...' : 'Linda is speaking...') 
                                  : (volume > 10 ? 'Listening...' : 'Linda is listening...')}
          </h3>
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 h-5 transition-all">
                {errorMessage ? (
                    <span className="text-red-500 font-medium">{errorMessage}</span>
                ) : (
                    status === 'disconnected' 
                        ? 'Tap the microphone to start.' 
                        : (isLoveMode ? 'Private secure connection.' : (volume > 5 ? 'Voice detected' : 'Silence...'))
                )}
            </p>
            {micLabel && status !== 'disconnected' && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{micLabel}</p>
            )}
          </div>
      </div>

      <button
        onClick={() => {
            if (isStreaming) {
                stopSession(false);
            } else {
                // CRITICAL FIX for iOS/Safari:
                // AudioContext.resume() MUST be called inside a synchronous user event handler (click).
                // Doing it inside the async startSession function is too late and will be blocked.
                const ctx = getAudioContext();
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }
                startSession(false);
            }
        }}
        disabled={status === 'updating' || status === 'initializing'}
        className={`
            p-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95
            ${isStreaming 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-indigo-500'}
            ${(status === 'updating' || status === 'initializing') ? 'opacity-50 cursor-wait' : ''}
        `}
        style={{
            boxShadow: isStreaming && volume > 10 ? `0 0 ${volume}px ${isLoveMode ? '#ec4899' : '#6366f1'}` : ''
        }}
      >
        {isStreaming ? <StopCircleIcon className="w-8 h-8" /> : <MicrophoneIcon className="w-8 h-8" />}
      </button>
      
      {status === 'disconnected' && !errorMessage && (
        <p className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer hover:underline" onClick={() => {
             const ctx = getAudioContext();
             if (ctx.state === 'suspended') ctx.resume();
             startSession();
        }}>
            Tap to enable microphone
        </p>
      )}

    </div>
  );
};

export default LiveVoiceSession;
