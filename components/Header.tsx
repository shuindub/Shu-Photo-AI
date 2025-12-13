
import React, { useState } from 'react';
import { ClockIcon, SunIcon, MoonIcon, BackRoomIcon, CloudIcon, CloudCheckIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useBackRoom } from '../contexts/BackRoomContext';
import BackRoomModal from './BackRoom/BackRoomModal';
import { signIn, isConnected } from '../services/googleDriveService';
import { UserProfile } from '../types';

interface HeaderProps {
  onToggleHistory: () => void;
  user?: UserProfile | null;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory, user, onSignOut }) => {
  const { theme, toggleTheme, language, toggleLanguage, t } = useSettings();
  const { isUnlocked, config } = useBackRoom();
  const [isBackRoomOpen, setIsBackRoomOpen] = useState(false);
  const [backRoomInitialTab, setBackRoomInitialTab] = useState<'system' | 'glossary' | 'keys' | 'sd' | 'appearance' | 'logs'>('system');
  
  // Local state for immediate drive connection status (before user profile loads)
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  // Poll connection status since it's external service
  React.useEffect(() => {
      const interval = setInterval(() => {
          setIsDriveConnected(isConnected());
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  const handleDriveClick = () => {
      if (!config.googleClientId) {
          setBackRoomInitialTab('keys');
          setIsBackRoomOpen(true);
          return;
      }
      // If connected but we want to manage settings or sign out, open BackRoom Keys
      if (isConnected()) {
          setBackRoomInitialTab('keys');
          setIsBackRoomOpen(true);
      } else {
          signIn();
      }
  };

  const openBackRoom = () => {
      setBackRoomInitialTab('system');
      setIsBackRoomOpen(true);
  };

  return (
    <>
      <header className="w-full shrink-0 py-2 px-4 flex justify-center">
        <div className="w-full max-w-4xl relative flex items-center justify-center">
            {/* Top Left Controls: Language & Theme */}
            <div className="absolute top-2 left-4 sm:left-6 flex items-center gap-2 scale-90 origin-top-left z-20">
            <button
                onClick={toggleLanguage}
                className="px-2 py-1 rounded-md text-xs font-bold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors uppercase w-8 text-center"
                title="Switch Language"
            >
                {language}
            </button>
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            </div>

            {/* Center Title */}
            <div className="text-center mt-1 mb-1 relative z-10 px-16 sm:px-0">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-gradient-x">
                    {t.title}
                </h1>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-light hidden sm:block">
                    {t.subtitle}
                </p>
            </div>

            {/* Top Right Controls: History & BackRoom */}
            <div className="absolute top-2 right-4 sm:right-6 flex items-center gap-2 scale-90 origin-top-right z-20">
            
            {/* Cloud Sync Button / User Avatar */}
            {user ? (
                <button
                    onClick={handleDriveClick}
                    className="relative group transition-all"
                    title={`Connected as ${user.name}`}
                >
                    <img 
                        src={user.picture} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full border-2 border-green-500 shadow-sm"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-[2px]">
                        <div className="bg-green-500 rounded-full p-[2px]">
                            <CloudCheckIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                    </div>
                </button>
            ) : (
                <button
                    onClick={handleDriveClick}
                    className={`p-2 rounded-full transition-colors group ${
                        !config.googleClientId 
                            ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300' 
                            : isDriveConnected 
                                ? 'text-green-500 bg-green-100 dark:bg-green-900/20' 
                                : 'text-blue-500 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200'
                    }`}
                    title={isDriveConnected ? "Drive Connected" : (config.googleClientId ? "Connect Google Drive" : "Setup Google Drive Sync")}
                >
                    {isDriveConnected ? <CloudCheckIcon /> : <CloudIcon />}
                </button>
            )}

            <button 
                onClick={onToggleHistory}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={t.history}
            >
                <ClockIcon />
            </button>
            <button
                onClick={openBackRoom}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors group"
                title="BackRoom"
            >
                <BackRoomIcon className="w-6 h-6 drop-shadow-sm group-hover:scale-105 transition-transform" unlocked={isUnlocked} />
            </button>
            </div>
        </div>
      </header>
      
      <BackRoomModal 
        isOpen={isBackRoomOpen} 
        onClose={() => setIsBackRoomOpen(false)} 
        initialTab={backRoomInitialTab}
        onSignOut={onSignOut}
      />
    </>
  );
};

export default Header;
