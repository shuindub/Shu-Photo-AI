
import React, { useState } from 'react';
import { ClockIcon, SunIcon, MoonIcon, BackRoomIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useBackRoom } from '../contexts/BackRoomContext';
import BackRoomModal from './BackRoom/BackRoomModal';

interface HeaderProps {
  onToggleHistory: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
  const { theme, toggleTheme, language, toggleLanguage, t } = useSettings();
  const { isUnlocked } = useBackRoom();
  const [isBackRoomOpen, setIsBackRoomOpen] = useState(false);

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
            <button 
                onClick={onToggleHistory}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={t.history}
            >
                <ClockIcon />
            </button>
            <button
                onClick={() => setIsBackRoomOpen(true)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors group"
                title="BackRoom"
            >
                <BackRoomIcon className="w-6 h-6 drop-shadow-sm group-hover:scale-105 transition-transform" unlocked={isUnlocked} />
            </button>
            </div>
        </div>
      </header>
      
      <BackRoomModal isOpen={isBackRoomOpen} onClose={() => setIsBackRoomOpen(false)} />
    </>
  );
};

export default Header;
