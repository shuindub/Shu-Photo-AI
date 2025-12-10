import React, { useState, useCallback, useEffect } from 'react';
import { AppTab, HistoryItem, LoadingStates, HandoffData } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { BackRoomProvider, useBackRoom } from './contexts/BackRoomContext';
import Header from './components/Header';
import TabButton from './components/TabButton';
import Studio from './features/Studio';
import HistorySidebar from './components/HistorySidebar';
import ChatWidget from './components/Chatbot/ChatWidget';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { SparklesIcon, PencilSquareIcon, PhotoIcon, ArrowTrendingUpIcon, FilmIcon } from './components/Icons';

const MainLayout: React.FC = () => {
  const { t } = useSettings();
  const { config } = useBackRoom();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TEXT2IMAGE);
  
  // Persistent History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
      try {
          const saved = localStorage.getItem('app_history');
          return saved ? JSON.parse(saved) : [];
      } catch (e) {
          console.error("Failed to load history", e);
          return [];
      }
  });

  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [revisitData, setRevisitData] = useState<HistoryItem | null>(null);
  const [handoffData, setHandoffData] = useState<HandoffData | null>(null);
  
  // Independent loading states for each tab
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    [AppTab.TEXT2IMAGE]: false,
    [AppTab.IMAGE2IMAGE]: false,
    [AppTab.IMAGE2TEXT]: false,
    [AppTab.FRAME2IMAGE]: false,
    [AppTab.ENCH_UPSCL]: false,
  });

  // Save history on change
  useEffect(() => {
      localStorage.setItem('app_history', JSON.stringify(history));
  }, [history]);

  const handleSetLoading = useCallback((tab: AppTab, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [tab]: loading }));
  }, []);

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  }, []);

  const revisitHistoryItem = useCallback((item: HistoryItem) => {
    setActiveTab(item.type);
    setRevisitData(item);
    setIsHistoryVisible(false);
    setHandoffData(null);
  }, []);

  const clearRevisitData = useCallback(() => {
    setRevisitData(null);
  }, []);

  const handleHandoff = useCallback((data: HandoffData) => {
      setActiveTab(data.targetTab);
      setHandoffData(data);
      setRevisitData(null);
  }, []);
  
  const clearHandoffData = useCallback(() => {
      setHandoffData(null);
  }, []);

  const handleTabClick = (tab: AppTab) => {
    if (activeTab !== tab) {
      setRevisitData(null);
      setHandoffData(null);
      setActiveTab(tab);
    }
  };

  const getTabIcon = (tab: AppTab) => {
      const theme = config.iconTheme;
      
      if (theme === 'standard') {
          const iconClass = "w-5 h-5";
          switch (tab) {
              case AppTab.TEXT2IMAGE: return <SparklesIcon className={iconClass} />;
              case AppTab.IMAGE2IMAGE: return <PencilSquareIcon className={iconClass} />;
              case AppTab.IMAGE2TEXT: return <PhotoIcon className={iconClass} />;
              case AppTab.ENCH_UPSCL: return <ArrowTrendingUpIcon className={iconClass} />;
              case AppTab.FRAME2IMAGE: return <FilmIcon className={iconClass} />;
          }
      } else if (theme === 'cyberpunk') {
          switch (tab) {
              case AppTab.TEXT2IMAGE:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                        <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M6 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M13 7V17" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2"/>
                        <rect x="16" y="8" width="4" height="4" fill="currentColor" rx="1"/>
                        <rect x="16" y="14" width="4" height="2" fill="currentColor" rx="1"/>
                        <rect x="12" y="14" width="2" height="2" fill="currentColor" rx="1"/>
                    </svg>
                  );
              case AppTab.IMAGE2IMAGE:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                        <rect x="3" y="6" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <rect x="11" y="8" width="10" height="10" rx="2" stroke="#a855f7" strokeWidth="1.5"/>
                        <path d="M8 11L16 13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="12" cy="12" r="1.5" fill="white"/>
                    </svg>
                  );
              case AppTab.IMAGE2TEXT:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                        <rect x="4" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M4 10H20" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 2"/>
                        <path d="M6 19H18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M6 22H14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  );
              case AppTab.ENCH_UPSCL:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                        <rect x="5" y="13" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M14 5L19 10V19H10L14 15V5Z" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M14 11V3M14 3L11 6M14 3L17 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  );
              case AppTab.FRAME2IMAGE:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                        <path d="M3 6V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4H5C3.89543 4 3 4.89543 3 6Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M7 4V20" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M17 4V20" stroke="currentColor" strokeWidth="1.5"/>
                        <rect x="10" y="7" width="4" height="10" rx="1" fill="#a855f7"/>
                        <path d="M12 12L15 9M15 9L18 12M15 9V15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(2,0)"/>
                    </svg>
                  );
          }
      } else {
          // Minimal Theme
          switch (tab) {
              case AppTab.TEXT2IMAGE:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <path d="M4 7V19M4 7H10M4 7H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 12L17 15L20 12M17 15V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="14" y="5" width="8" height="14" rx="1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  );
              case AppTab.IMAGE2IMAGE:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M14 12L16 14M16 14L18 12M16 14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(1,1)"/>
                    </svg>
                  );
              case AppTab.IMAGE2TEXT:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="2" fill="var(--bg-color, white)"/>
                        <path d="M12 13H16M12 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  );
              case AppTab.ENCH_UPSCL:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="14" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <path d="M10 10L13 7M13 7V10M13 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  );
              case AppTab.FRAME2IMAGE:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <path d="M3 6H21V18H3V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M7 6V18" stroke="currentColor" strokeWidth="2"/>
                        <path d="M17 6V18" stroke="currentColor" strokeWidth="2"/>
                        <rect x="10" y="9" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  );
          }
      }
      return null;
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-sans flex flex-col items-center p-2 sm:p-4 transition-colors duration-300 overflow-hidden">
      <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col h-full max-h-full">
        <div className="flex-shrink-0">
            <Header onToggleHistory={() => setIsHistoryVisible(v => !v)} />
        </div>
        
        {/* Navigation Tabs - Single Horizontal Row */}
        <div className="w-full flex justify-center mb-4 flex-shrink-0 relative z-20">
             <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl p-1.5 flex flex-nowrap overflow-x-auto no-scrollbar justify-start sm:justify-center gap-1 w-full sm:w-auto shadow-sm px-1 py-1.5 snap-x">
                <div className="flex-shrink-0 min-w-[110px] snap-center">
                    <TabButton 
                    label={t.tabs.text2image} 
                    isActive={activeTab === AppTab.TEXT2IMAGE} 
                    onClick={() => handleTabClick(AppTab.TEXT2IMAGE)}
                    icon={getTabIcon(AppTab.TEXT2IMAGE)}
                    isLoading={loadingStates[AppTab.TEXT2IMAGE]}
                    />
                </div>
                <div className="flex-shrink-0 min-w-[110px] snap-center">
                    <TabButton 
                    label={t.tabs.image2image} 
                    isActive={activeTab === AppTab.IMAGE2IMAGE} 
                    onClick={() => handleTabClick(AppTab.IMAGE2IMAGE)}
                    icon={getTabIcon(AppTab.IMAGE2IMAGE)}
                    isLoading={loadingStates[AppTab.IMAGE2IMAGE]}
                    />
                </div>
                <div className="flex-shrink-0 min-w-[110px] snap-center">
                    <TabButton 
                    label={t.tabs.image2text} 
                    isActive={activeTab === AppTab.IMAGE2TEXT} 
                    onClick={() => handleTabClick(AppTab.IMAGE2TEXT)}
                    icon={getTabIcon(AppTab.IMAGE2TEXT)}
                    isLoading={loadingStates[AppTab.IMAGE2TEXT]}
                    />
                </div>
                <div className="flex-shrink-0 min-w-[110px] snap-center">
                    <TabButton 
                    label={t.tabs.enchUpscl} 
                    isActive={activeTab === AppTab.ENCH_UPSCL} 
                    onClick={() => handleTabClick(AppTab.ENCH_UPSCL)}
                    icon={getTabIcon(AppTab.ENCH_UPSCL)}
                    isLoading={loadingStates[AppTab.ENCH_UPSCL]}
                    />
                </div>
                <div className="flex-shrink-0 min-w-[110px] snap-center">
                    <TabButton 
                    label={t.tabs.frame2image} 
                    isActive={activeTab === AppTab.FRAME2IMAGE} 
                    onClick={() => handleTabClick(AppTab.FRAME2IMAGE)}
                    icon={getTabIcon(AppTab.FRAME2IMAGE)}
                    isLoading={loadingStates[AppTab.FRAME2IMAGE]}
                    />
                </div>
            </div>
        </div>

        <main className="w-full flex-grow min-h-0 relative">
          {Object.values(AppTab).map((tab) => (
            <div key={tab} className={activeTab === tab ? 'block animate-fadeIn h-full' : 'hidden h-full'}>
              <Studio
                activeTab={tab}
                addToHistory={addToHistory}
                revisitData={revisitData?.type === tab ? revisitData : null}
                onRevisitHandled={clearRevisitData}
                isLoading={loadingStates[tab]}
                setIsLoading={(loading) => handleSetLoading(tab, loading)}
                onHandoff={handleHandoff}
                handoffData={handoffData?.targetTab === tab ? handoffData : null}
                onHandoffHandled={clearHandoffData}
              />
            </div>
          ))}
        </main>
      </div>

      <HistorySidebar 
        isVisible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        history={history}
        onRevisit={revisitHistoryItem}
      />
      
      <ChatWidget />
      <PWAInstallPrompt />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <BackRoomProvider>
        <MainLayout />
      </BackRoomProvider>
    </SettingsProvider>
  );
};

export default App;