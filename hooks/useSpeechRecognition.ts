
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

const getSpeechRecognition = (): any => {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

export const useSpeechRecognition = () => {
  const { language } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to keep track of the instance without triggering re-renders or dependency loops
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (SpeechRecognitionCtor) {
      const recog = new SpeechRecognitionCtor();
      recog.continuous = true; // Enable continuous listening
      recog.interimResults = true; // Show realtime results
      
      recog.onresult = (event: any) => {
        let finalTranscript = '';
        // In continuous mode, we need to iterate over all results
        for (let i = 0; i < event.results.length; ++i) {
             finalTranscript += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript);
      };

      recog.onerror = (event: any) => {
        // Ignore 'no-speech' errors as they just mean silence
        if (event.error !== 'no-speech') {
             console.error('Speech recognition error', event.error);
             setError(event.error);
        }
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
    
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    };
  }, []);

  // Update language dynamically
  useEffect(() => {
      if (recognitionRef.current) {
          recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';
      }
  }, [language]);

  const startListening = useCallback(() => {
    setTranscript('');
    setError(null);
    if (recognitionRef.current) {
      try {
        // Ensure language is set before starting
        recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Handle case where start is called while already started
        console.error("Failed to start recognition", e);
      }
    } else {
        setError("Speech recognition not supported in this browser.");
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // State update handled in onend
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    hasSupport: !!getSpeechRecognition()
  };
};
