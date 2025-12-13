
import React from 'react';
import { HistoryItem, AppTab } from '../types';
import { XMarkIcon, SparklesIcon, PencilSquareIcon, PhotoIcon, FilmIcon, ArrowTrendingUpIcon, DownloadIcon, BeakerIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { exportHistoryToJson } from '../utils/historyEngine';

interface HistorySidebarProps {
  isVisible: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onRevisit: (item: HistoryItem) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isVisible, onClose, history, onRevisit }) => {
  const { t } = useSettings();

  const getIconForType = (type: AppTab) => {
    switch (type) {
      case AppTab.TEXT2IMAGE: return <SparklesIcon />;
      case AppTab.IMAGE2IMAGE: return <PencilSquareIcon />;
      case AppTab.IMAGE2TEXT: return <PhotoIcon />;
      case AppTab.FRAME2IMAGE: return <FilmIcon />;
      case AppTab.ENCH_UPSCL: return <ArrowTrendingUpIcon />;
      case AppTab.XPRMNT: return <BeakerIcon />;
      default: return null;
    }
  };

  const getTabLabel = (type: AppTab) => {
    switch (type) {
        case AppTab.TEXT2IMAGE: return t.tabs.text2image;
        case AppTab.IMAGE2IMAGE: return t.tabs.image2image;
        case AppTab.IMAGE2TEXT: return t.tabs.image2text;
        case AppTab.FRAME2IMAGE: return t.tabs.frame2image;
        case AppTab.ENCH_UPSCL: return t.tabs.enchUpscl;
        case AppTab.XPRMNT: return t.tabs.xprmnt;
        default: return type;
    }
  };

  const renderStyledLabel = (text: string) => {
    return text.split(/([2&])/).map((part, index) => {
      if (part === '2' || part === '&') {
        return <span key={index} className="text-pink-500 font-bold">{part}</span>;
      }
      return part;
    });
  };
  
  const getResultPreview = (item: HistoryItem) => {
    switch(item.type) {
        case AppTab.TEXT2IMAGE:
            return <img src={item.results[0]} alt="Generated" className="w-10 h-10 rounded object-cover" />;
        case AppTab.IMAGE2IMAGE:
            const editCount = item.results.length;
            return (
              <div className="relative">
                <img src={item.results[0]} alt="Edited" className="w-10 h-10 rounded object-cover" />
                {editCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-800">
                    {editCount}
                  </span>
                )}
              </div>
            );
        case AppTab.ENCH_UPSCL:
            const enchCount = item.results.length;
            return (
              <div className="relative">
                <img src={item.results[0]} alt="Enhanced" className="w-10 h-10 rounded object-cover" />
                {enchCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-800">
                    {enchCount}
                  </span>
                )}
              </div>
            );
        case AppTab.IMAGE2TEXT:
            const analyzeCount = item.inputImages.length;
            return (
              <div className="relative">
                <img src={item.inputImages[0]} alt="Analyzed" className="w-10 h-10 rounded object-cover" />
                {analyzeCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-800">
                    {analyzeCount}
                  </span>
                )}
              </div>
            );
        case AppTab.FRAME2IMAGE:
            const frameCount = item.results.length;
             return (
              <div className="relative">
                <img src={item.results[0]} alt="Frame" className="w-10 h-10 rounded object-cover" />
                {frameCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-800">
                    {frameCount}
                  </span>
                )}
              </div>
            );
        case AppTab.XPRMNT:
            const xprmntItem = item as any;
            if (xprmntItem.results && xprmntItem.results.length > 0) {
                 return <img src={xprmntItem.results[0]} alt="Result" className="w-10 h-10 rounded object-cover" />;
            } else if (xprmntItem.inputImages && xprmntItem.inputImages.length > 0) {
                 return <img src={xprmntItem.inputImages[0]} alt="Input" className="w-10 h-10 rounded object-cover" />;
            } else {
                 return <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-xs">TXT</div>;
            }
        default:
          return <div className="w-10 h-10 rounded bg-gray-700"></div>;
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-gray-800/90 backdrop-blur-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-3">
              <h2 id="history-title" className="text-xl font-bold text-white">{t.history}</h2>
              <button 
                onClick={() => exportHistoryToJson(history)}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
                title="Export History to JSON"
              >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Export</span>
              </button>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close history"
          >
            <XMarkIcon />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-65px)] custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 p-8">Your generation history will appear here.</p>
          ) : (
            <ul>
              {history.map(item => (
                <li key={item.id} className="border-b border-gray-700/50">
                  <button 
                    onClick={() => onRevisit(item)}
                    className="w-full flex items-center p-4 text-left hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 mr-4">
                      {getResultPreview(item)}
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <div className="flex items-center text-sm text-gray-400 gap-2">
                        {getIconForType(item.type)}
                        <span className="capitalize font-semibold">{renderStyledLabel(getTabLabel(item.type))}</span>
                        <span className="text-xs ml-auto">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-200 truncate mt-1">{item.prompt}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
