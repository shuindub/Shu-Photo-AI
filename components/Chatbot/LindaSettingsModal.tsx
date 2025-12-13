
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ArrowTrendingUpIcon, CogIcon, MicrophoneIcon, StopCircleIcon, UploadIcon, TrashIcon, SpeakerWaveIcon } from '../Icons';
import { LindaConfig } from '../../types';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface LindaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: LindaConfig;
  onSave: (config: LindaConfig) => void;
  currentAvatarUrl: string;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const LindaSettingsModal: React.FC<LindaSettingsModalProps> = ({ isOpen, onClose, initialConfig, onSave, currentAvatarUrl }) => {
  const [config, setConfig] = useState<LindaConfig>(initialConfig);
  
  // Voice Dictation
  const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition();
  const [voiceField, setVoiceField] = useState<'description' | 'instructions' | null>(null);
  const [initialTextSnapshot, setInitialTextSnapshot] = useState('');

  // Custom Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when initialConfig changes (e.g. first load)
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Handle Dictation Transcript Updates
  useEffect(() => {
    if (isListening && transcript && voiceField) {
         setConfig(prev => ({
             ...prev,
             [voiceField]: initialTextSnapshot + (initialTextSnapshot ? ' ' : '') + transcript
         }));
    }
  }, [transcript, isListening, voiceField, initialTextSnapshot]);

  const toggleDictation = (field: 'description' | 'instructions') => {
      if (isListening && voiceField === field) {
          stopListening();
          setVoiceField(null);
      } else {
          if (isListening) stopListening();
          setInitialTextSnapshot(config[field]);
          setVoiceField(field);
          startListening();
      }
  };

  // --- Custom Voice Recording Logic ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // WebM usually supported
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  setConfig(prev => ({ ...prev, customVoiceBase64: base64 }));
              };
              reader.readAsDataURL(blob);
              
              // Stop tracks
              stream.getTracks().forEach(track => track.stop());
          };

          recorder.start();
          setIsRecordingVoice(true);
          setRecordingTime(0);
          timerRef.current = window.setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);

      } catch (err) {
          console.error("Failed to start recording", err);
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecordingVoice) {
          mediaRecorderRef.current.stop();
          setIsRecordingVoice(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              alert("File size too large. Please upload a file under 5MB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
               const base64 = (reader.result as string).split(',')[1];
               setConfig(prev => ({ ...prev, customVoiceBase64: base64 }));
          };
          reader.readAsDataURL(file);
      }
  };

  const togglePreview = () => {
      if (isPlayingPreview && audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlayingPreview(false);
      } else if (config.customVoiceBase64) {
          if (!audioRef.current) audioRef.current = new Audio();
          audioRef.current.src = `data:audio/webm;base64,${config.customVoiceBase64}`; // Assuming WebM for now, browser handles mime usually
          audioRef.current.onended = () => setIsPlayingPreview(false);
          audioRef.current.play().catch(e => console.error("Playback failed", e));
          setIsPlayingPreview(true);
      }
  };

  const deleteCustomVoice = () => {
      setConfig(prev => ({ ...prev, customVoiceBase64: undefined }));
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      setIsPlayingPreview(false);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#131314] text-[#e3e3e3] font-sans flex flex-col h-screen w-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#444746] bg-[#1e1f20]">
        <div className="flex items-center gap-4">
          <img src={currentAvatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-xl font-medium">{config.name || 'Linda'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#c4c7c5] italic">Gem not saved</span>
          <button
            onClick={handleSave}
            className="bg-[#a8c7fa] text-[#062e6f] px-6 py-2 rounded-full font-medium hover:bg-[#d3e3fd] transition-colors"
          >
            Save
          </button>
          <button onClick={onClose} className="p-2 hover:bg-[#303132] rounded-full transition-colors">
            <XMarkIcon />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-1/2 p-8 overflow-y-auto border-r border-[#444746] bg-[#1e1f20]">
          <div className="space-y-6 max-w-2xl mx-auto">
            
            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#e3e3e3]">Name</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full bg-transparent border border-[#444746] rounded-lg px-4 py-3 text-[#e3e3e3] focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa] transition-all"
                placeholder="Name your Gem"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#e3e3e3]">Description</label>
              <div className="relative">
                <input
                    type="text"
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    className="w-full bg-[#2a2b2d] border-none rounded-lg px-4 py-3 pr-10 text-[#e3e3e3] placeholder-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#444746]"
                    placeholder="Describe your Gem and explain what it does"
                />
                <div className="absolute right-2 top-2 flex gap-2">
                    {hasSupport && (
                        <button 
                            onClick={() => toggleDictation('description')}
                            className={`p-1.5 rounded-full transition-colors ${isListening && voiceField === 'description' ? 'text-[#a8c7fa] bg-[#062e6f]/30' : 'text-[#8e918f] hover:text-[#e3e3e3]'}`}
                        >
                            {isListening && voiceField === 'description' ? <StopCircleIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
                        </button>
                    )}
                </div>
              </div>
            </div>

            {/* Voice Selection Section */}
            <div className="space-y-4 bg-[#2a2b2d] rounded-xl p-4 border border-[#444746]">
              <label className="block text-sm font-medium text-[#e3e3e3]">Voice Settings</label>
              
              {/* Custom Voice Recorder/Uploader */}
               <div className="space-y-3">
                   <div className="flex items-center justify-between">
                       <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-semibold">Clone Custom Voice</span>
                        {config.customVoiceBase64 && (
                           <div className="flex items-center gap-2">
                                <button 
                                    onClick={togglePreview}
                                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md ${isPlayingPreview ? 'bg-[#a8c7fa] text-[#062e6f]' : 'bg-[#444746] text-[#e3e3e3]'}`}
                                >
                                    {isPlayingPreview ? <StopCircleIcon className="w-3 h-3" /> : <SpeakerWaveIcon className="w-3 h-3" />}
                                    {isPlayingPreview ? 'Stop' : 'Preview'}
                                </button>
                                <button onClick={deleteCustomVoice} className="p-1 text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4" /></button>
                           </div>
                        )}
                   </div>
                   
                   {!config.customVoiceBase64 ? (
                       <div className="flex gap-2">
                            {/* Record Button */}
                            <button
                                onClick={isRecordingVoice ? stopRecording : startRecording}
                                className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                                    isRecordingVoice 
                                    ? 'border-red-500 bg-red-500/10 text-red-400 animate-pulse' 
                                    : 'border-dashed border-[#5e615f] text-[#c4c7c5] hover:border-[#a8c7fa] hover:text-[#a8c7fa]'
                                }`}
                            >
                                {isRecordingVoice ? <StopCircleIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                                {isRecordingVoice ? `Recording... ${recordingTime}s` : 'Record Voice'}
                            </button>
                            
                            {/* Upload Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-3 rounded-lg border-2 border-dashed border-[#5e615f] text-[#c4c7c5] hover:border-[#a8c7fa] hover:text-[#a8c7fa] flex items-center justify-center gap-2 transition-all"
                            >
                                <UploadIcon className="w-5 h-5" />
                                Upload File
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="audio/*" 
                                onChange={handleFileUpload} 
                                className="hidden" 
                            />
                       </div>
                   ) : (
                       <div className="p-3 bg-[#1e1f20] rounded-lg border border-[#444746] flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                               <SpeakerWaveIcon className="w-4 h-4 text-white" />
                           </div>
                           <div className="flex-1">
                               <p className="text-sm text-white font-medium">Custom Voice Active</p>
                               <p className="text-xs text-gray-400">Used for text-to-speech responses</p>
                           </div>
                           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                       </div>
                   )}
                   
                   <p className="text-xs text-[#8e918f]">
                       Record yourself or upload a short audio clip (~15-30s recommended) to clone the voice.
                   </p>
               </div>

               <div className="w-full h-px bg-[#444746] my-2"></div>

              {/* Standard Voice Selector (Fallback) */}
              <div className={`relative transition-opacity ${config.customVoiceBase64 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <label className="block text-xs text-[#c4c7c5] mb-1 uppercase tracking-wider font-semibold">Prebuilt Voice (Fallback)</label>
                <select
                  value={config.voiceName || 'Zephyr'}
                  onChange={(e) => setConfig({ ...config, voiceName: e.target.value })}
                  className="w-full bg-[#1e1f20] border border-[#444746] rounded-lg px-4 py-2.5 text-[#e3e3e3] appearance-none focus:outline-none focus:ring-2 focus:ring-[#444746] cursor-pointer"
                >
                  {VOICES.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-8 pointer-events-none text-[#8e918f]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </div>
              </div>

              {/* Text-to-Speech Toggle */}
              <div className="flex items-center justify-between pt-2">
                  <div>
                      <span className="block text-sm font-medium text-[#e3e3e3]">Always Speak Responses</span>
                      <span className="text-xs text-[#8e918f]">Automatically read out text replies</span>
                  </div>
                  <button 
                      onClick={() => setConfig(prev => ({ ...prev, textToSpeech: !prev.textToSpeech }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${config.textToSpeech ? 'bg-[#a8c7fa]' : 'bg-[#444746]'}`}
                  >
                      <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${config.textToSpeech ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
              </div>
            </div>

            {/* Instructions Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-[#e3e3e3]">Instructions</label>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#8e918f" className="cursor-help"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>
                </div>
                 {hasSupport && (
                        <button 
                            onClick={() => toggleDictation('instructions')}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${isListening && voiceField === 'instructions' ? 'text-[#a8c7fa] bg-[#062e6f]/30' : 'text-[#8e918f] hover:text-[#e3e3e3] bg-[#303132]'}`}
                        >
                            {isListening && voiceField === 'instructions' ? <StopCircleIcon className="w-3 h-3" /> : <MicrophoneIcon className="w-3 h-3" />}
                            {isListening && voiceField === 'instructions' ? 'Listening...' : 'Dictate'}
                        </button>
                  )}
              </div>
              <textarea
                value={config.instructions}
                onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                className="w-full h-64 bg-[#2a2b2d] border-none rounded-xl p-4 text-[#e3e3e3] placeholder-[#5e615f] resize-none focus:outline-none focus:ring-2 focus:ring-[#444746]"
                placeholder="Example: You are a horticulturist..."
              />
            </div>

          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 bg-[#131314] flex flex-col relative">
          <div className="absolute top-4 left-4 text-[#e3e3e3] font-medium text-sm">Preview</div>
          
          {/* Empty State Preview */}
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="mb-6 text-[#444746] text-6xl font-serif opacity-20">Д</div>
              <div className="mb-6 text-[#444746] text-6xl font-serif opacity-20">Д</div>
          </div>

          {/* Chat Input Area (Mock) */}
          <div className="p-6">
            <div className="bg-[#1e1f20] rounded-[2rem] p-2 pl-6 flex items-center shadow-lg border border-[#444746]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 mr-4 flex-shrink-0 overflow-hidden">
                     {/* Placeholder Avatar */}
                     <img src={currentAvatarUrl} alt="avatar" className="w-full h-full object-cover opacity-100" />
                </div>
                <input 
                    type="text" 
                    placeholder={`Ask ${config.name || 'Gemini'}`}
                    disabled
                    className="bg-transparent flex-1 text-[#e3e3e3] placeholder-[#5e615f] outline-none cursor-default"
                />
                 <div className="flex items-center gap-2 pr-2">
                    <span className="text-[#5e615f] text-sm">Thinking</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5e615f"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                    <div className="w-px h-6 bg-[#444746] mx-2"></div>
                    <button className="text-[#e3e3e3] p-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>
                 </div>
            </div>
          </div>
        </div>
      </div>
       
        {/* Footer disclaimer */}
       <div className="text-center py-3 text-xs text-[#8e918f] bg-[#131314] border-t border-[#444746]">
          Gemini can make mistakes, so double-check responses.
       </div>
    </div>
  );
};

export default LindaSettingsModal;
