
import React, { useState, useCallback, useEffect } from 'react';
import { AppTab, HistoryItem, LoadingStates, HandoffData, UserProfile } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { BackRoomProvider, useBackRoom } from './contexts/BackRoomContext';
import Header from './components/Header';
import TabButton from './components/TabButton';
import Studio from './features/Studio';
import HistorySidebar from './components/HistorySidebar';
import ChatWidget from './components/Chatbot/ChatWidget';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { SparklesIcon, PencilSquareIcon, PhotoIcon, ArrowTrendingUpIcon, FilmIcon, BeakerIcon } from './components/Icons';
import { getHistory, saveHistoryItem, clearHistoryDB } from './utils/db';
import { Logger } from './utils/logger';
import { initGoogleAuth, syncHistoryWithDrive, isConnected, signOut } from './services/googleDriveService';

const MainLayout: React.FC = () => {
  const { t } = useSettings();
  const { config } = useBackRoom();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TEXT2IMAGE);
  
  // Persistent History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

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
    [AppTab.XPRMNT]: false,
  });

  const performSync = async (currentHistory: HistoryItem[]) => {
      if (isConnected()) {
          try {
              const merged = await syncHistoryWithDrive(currentHistory);
              // Update state with merged results
              setHistory(merged);
              // Update Local DB with merged results (so offline works next time)
              merged.forEach(item => saveHistoryItem(item));
          } catch (e) {
              Logger.error("App", "Sync failed", e);
          }
      }
  };

  // Init Google Auth on config change
  useEffect(() => {
      if (config.googleClientId) {
          initGoogleAuth(config.googleClientId, (loggedInUser) => {
              setUser(loggedInUser);
              Logger.info("App", `User logged in: ${loggedInUser.name}`);
              // Trigger sync immediately upon login
              getHistory().then(localData => performSync(localData));
          });
      }
  }, [config.googleClientId]);

  // Load history from IndexedDB on mount
  useEffect(() => {
      const loadHistory = async () => {
          try {
              const data = await getHistory();
              const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
              setHistory(sorted);
              Logger.info("App", `Loaded ${sorted.length} history items from DB`);
          } catch (e) {
              Logger.error("App", "Failed to load history from DB", e);
          }
      };
      loadHistory();
  }, []);

  const handleSetLoading = useCallback((tab: AppTab, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [tab]: loading }));
  }, []);

  const addToHistory = useCallback((item: HistoryItem) => {
    // Update UI immediately
    const newHistory = [item, ...history];
    setHistory(newHistory);
    
    // Save to IndexedDB
    saveHistoryItem(item).catch(e => {
        Logger.error("App", "Failed to save history item to DB", e);
    });

    // Trigger Cloud Sync
    if (isConnected()) {
        performSync(newHistory);
    }
  }, [history]);

  const handleSignOut = () => {
      signOut();
      setUser(null);
  };

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
              case AppTab.XPRMNT: return <BeakerIcon className={iconClass} />;
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
              case AppTab.XPRMNT:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                        <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
              case AppTab.XPRMNT:
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
            <Header 
                onToggleHistory={() => setIsHistoryVisible(v => !v)} 
                user={user}
                onSignOut={handleSignOut}
            />
        </div>
        
        {/* Navigation Tabs */}
        <div className="w-full flex justify-center mb-4 flex-shrink-0 relative z-20">
             <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl p-1.5 flex flex-nowrap overflow-x-auto no-scrollbar justify-start sm:justify-center gap-1 w-full sm:w-auto shadow-sm px-1 py-1.5 snap-x">
                {Object.values(AppTab).map(tab => (
                    <div key={tab} className="flex-shrink-0 min-w-[110px] snap-center">
                        <TabButton 
                            label={t.tabs[tab === 'ench&upscl' ? 'enchUpscl' : tab]} 
                            isActive={activeTab === tab} 
                            onClick={() => handleTabClick(tab)}
                            icon={getTabIcon(tab)}
                            isLoading={loadingStates[tab]}
                        />
                    </div>
                ))}
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
