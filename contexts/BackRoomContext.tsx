
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BackRoomConfig } from '../types';
import { defaultBackRoomConfig } from '../config/defaults';

interface BackRoomContextType {
  config: BackRoomConfig;
  updateConfig: (newConfig: BackRoomConfig) => void;
  resetToDefaults: () => void;
  isUnlocked: boolean;
  unlock: () => void;
}

const BackRoomContext = createContext<BackRoomContextType | undefined>(undefined);

export const BackRoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<BackRoomConfig>(() => {
    const saved = localStorage.getItem('backroom_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure new keys exist
        return {
          ...defaultBackRoomConfig,
          ...parsed,
          systemInstructions: {
            ...defaultBackRoomConfig.systemInstructions,
            ...(parsed.systemInstructions || {})
          }
        };
      } catch (e) {
        console.error("Failed to parse BackRoom config", e);
        return defaultBackRoomConfig;
      }
    }
    return defaultBackRoomConfig;
  });

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
      return localStorage.getItem('backroom_unlocked') === 'true';
  });

  const updateConfig = (newConfig: BackRoomConfig) => {
    setConfig(newConfig);
    localStorage.setItem('backroom_config', JSON.stringify(newConfig));
  };

  const resetToDefaults = () => {
    setConfig(defaultBackRoomConfig);
    localStorage.removeItem('backroom_config');
  };

  const unlock = () => {
      setIsUnlocked(true);
      localStorage.setItem('backroom_unlocked', 'true');
  };

  return (
    <BackRoomContext.Provider value={{ config, updateConfig, resetToDefaults, isUnlocked, unlock }}>
      {children}
    </BackRoomContext.Provider>
  );
};

export const useBackRoom = () => {
  const context = useContext(BackRoomContext);
  if (!context) {
    throw new Error('useBackRoom must be used within a BackRoomProvider');
  }
  return context;
};
