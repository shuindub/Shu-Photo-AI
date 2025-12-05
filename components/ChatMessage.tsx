
import React from 'react';
import ImageCard from './ImageCard';
import { SparklesIcon, SpeakerWaveIcon } from './Icons';
import CopyButton from './CopyButton';

interface ChatMessageProps {
  author: 'user' | 'model';
  text?: string;
  images?: string[];
  isLoading?: boolean;
  onImageAction?: (src: string, action: 'enhance' | 'upscale') => void;
  onRegenerate?: () => void;
  
  // Props for ChatWidget usage
  sources?: { uri: string; title: string }[];
  avatarUrl?: string;
  isPlaying?: boolean;
  isAudioLoading?: boolean;
  onPlayAudio?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
    author, 
    text, 
    images, 
    isLoading, 
    onImageAction, 
    onRegenerate,
    sources,
    avatarUrl,
    isPlaying,
    isAudioLoading,
    onPlayAudio
}) => {
  const isUser = author === 'user';

  // Check for Task Handoff Protocol
  const isGemTask = text?.includes(':::GEM_TASK_START:::');
  let processedText = text || '';
  let taskContent = '';

  if (isGemTask) {
      const match = text?.match(/:::GEM_TASK_START:::([\s\S]*?):::GEM_TASK_END:::/);
      if (match) {
          taskContent = match[1].trim();
          // Clean the text to hide the protocol raw data if needed, or just render the card
          processedText = text?.replace(/:::GEM_TASK_START:::[\s\S]*?:::GEM_TASK_END:::/, '') || '';
      }
  }

  // Style selection based on context (Studio vs ChatWidget)
  // If avatarUrl is provided, we are likely in ChatWidget (Mini Mode)
  const isMiniMode = !!avatarUrl;

  const containerClasses = isMiniMode 
    ? `flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`
    : `flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`;

  const bubbleClasses = isMiniMode
    ? `max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm relative group ${
        isUser 
        ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-sm' 
        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-600'
      }`
    : `max-w-2xl p-4 rounded-2xl shadow-sm ${
        isUser 
        ? 'bg-indigo-600 text-white rounded-br-sm' 
        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-600'
      }`;
  
  const ModelAvatar = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
      <SparklesIcon />
    </div>
  );

  return (
    <div className={containerClasses}>
      {!isUser && !isMiniMode && <ModelAvatar />}
      {isMiniMode && !isUser && (
          <img 
            src={avatarUrl} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0 mt-1" 
            loading="eager"
          />
      )}

      <div className={bubbleClasses}>
        {isLoading ? (
          <div className="flex items-center gap-2 py-1 px-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
        ) : (
          <>
            {processedText && <p className="whitespace-pre-wrap leading-relaxed">{processedText}</p>}
            
            {/* TASK CARD RENDER */}
            {isGemTask && taskContent && (
                <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-3 shadow-sm relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                            ⚡ Task for Gem
                        </span>
                        <CopyButton 
                            textToCopy={taskContent} 
                            className="bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200"
                        />
                    </div>
                    <div className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/20 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
                        {taskContent}
                    </div>
                </div>
            )}

            {images && images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((src, index) => (
                  <ImageCard 
                    key={index} 
                    src={src} 
                    alt={`Result image ${index + 1}`} 
                    showDownloadButton 
                    className="shadow-sm"
                    onEnhance={onImageAction ? () => onImageAction(src, 'enhance') : undefined}
                    onUpscale={onImageAction ? () => onImageAction(src, 'upscale') : undefined}
                    onRegenerate={onRegenerate}
                  />
                ))}
              </div>
            )}

            {/* Sources (ChatWidget Mode) */}
            {sources && sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                        Sources
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {sources.map((source, i) => (
                            <a 
                                key={i} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-300 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-1 rounded-md transition-colors max-w-full border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                                title={source.title}
                            >
                                <span className="truncate max-w-[120px]">{source.title || new URL(source.uri).hostname}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* TTS Play Button (ChatWidget Mode) */}
            {onPlayAudio && !isUser && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onPlayAudio(); }}
                    className={`absolute -right-9 bottom-0 p-1.5 rounded-full shadow-sm border transition-all
                        ${isPlaying 
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                            : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-500 border-gray-100 dark:border-gray-600 opacity-0 group-hover:opacity-100'}
                    `}
                    title="Read aloud"
                >
                    {isAudioLoading ? (
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <SpeakerWaveIcon className="w-4 h-4" />
                    )}
                </button>
            )}

            {/* Standard Copy Button (Studio Mode) */}
            {text && !isUser && !isMiniMode && (
                <CopyButton textToCopy={text} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
