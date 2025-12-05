
import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, SparklesIcon, BackRoomIcon } from '../Icons';
import { useBackRoom } from '../../contexts/BackRoomContext';
import { AppTab } from '../../types';

interface BackRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackRoomModal: React.FC<BackRoomModalProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig, resetToDefaults, isUnlocked, unlock } = useBackRoom();
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'glossary' | 'keys' | 'sd' | 'appearance'>('system');
  const [error, setError] = useState('');
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    } else {
      setPassword('');
      setError('');
    }
  }, [isOpen, config]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'rtd_2024') {
      unlock();
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleSave = () => {
    updateConfig(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BackRoomIcon className="w-8 h-8" unlocked={isUnlocked} />
            BackRoom
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
            <XMarkIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-hidden flex flex-col">
          {!isUnlocked ? (
            <div className="flex flex-col items-center justify-center h-64 p-8">
              <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-600 dark:text-gray-300">Enter admin password to access configuration.</p>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg">
                  Unlock
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('system')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'system' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  System Instructions
                </button>
                <button
                  onClick={() => setActiveTab('glossary')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'glossary' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Glossary
                </button>
                <button
                  onClick={() => setActiveTab('keys')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'keys' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  API Keys
                </button>
                <button
                  onClick={() => setActiveTab('sd')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'sd' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  SD / Colab
                </button>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'appearance' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Appearance
                </button>
              </div>

              {/* Editor Area */}
              <div className="flex-grow p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                {activeTab === 'system' ? (
                  <div className="space-y-6">
                    {Object.values(AppTab).map((tab) => (
                      <div key={tab} className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{tab}</label>
                        <textarea
                          value={localConfig.systemInstructions[tab] || ''}
                          onChange={(e) => setLocalConfig(prev => ({
                            ...prev,
                            systemInstructions: { ...prev.systemInstructions, [tab]: e.target.value }
                          }))}
                          className="w-full h-32 p-3 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-y"
                        />
                      </div>
                    ))}
                  </div>
                ) : activeTab === 'glossary' ? (
                  <div className="h-full flex flex-col">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Global Glossary</label>
                    <textarea
                      value={localConfig.glossary}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, glossary: e.target.value }))}
                      className="flex-grow w-full p-4 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                ) : activeTab === 'keys' ? (
                  <div className="h-full flex flex-col space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                        <h3 className="text-yellow-800 dark:text-yellow-200 font-bold mb-1">Third-Party APIs</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            These keys are stored locally in your browser.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">OpenRouter API Key</label>
                        <input
                            type="password"
                            value={localConfig.openRouterKey || ''}
                            onChange={(e) => setLocalConfig(prev => ({ ...prev, openRouterKey: e.target.value }))}
                            placeholder="sk-or-..."
                            className="w-full p-3 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500">Required for Uncensored/Llava models in Image2Text.</p>
                    </div>
                  </div>
                ) : activeTab === 'sd' ? (
                    <div className="h-full flex flex-col space-y-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-lg">
                            <h3 className="text-indigo-800 dark:text-indigo-200 font-bold mb-1">Stable Diffusion / Automatic1111</h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                Connect to a Google Colab instance or local server to run SDXL with custom LoRAs/Checkpoints.
                                Requires the API to be exposed (e.g., via ngrok).
                            </p>
                        </div>
                        
                         <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SD API URL</label>
                            <input
                                type="text"
                                value={localConfig.sdApiUrl || ''}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, sdApiUrl: e.target.value }))}
                                placeholder="https://xxxx-xx-xx-xx-xx.ngrok-free.app"
                                className="w-full p-3 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-500">
                                Enter the root URL of your Automatic1111 API (without /sdapi/...).
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col space-y-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Navigation Icon Theme</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <button 
                                    onClick={() => setLocalConfig(prev => ({ ...prev, iconTheme: 'cyberpunk' }))}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${localConfig.iconTheme === 'cyberpunk' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                                >
                                    <div className="p-3 bg-gray-900 rounded-lg">
                                        {/* Cyberpunk Preview */}
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter: "drop-shadow(0 0 3px #a855f7)"}}>
                                            <path d="M4 12H8" stroke="#d8b4fe" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M6 10V14" stroke="#d8b4fe" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M13 7V17" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2"/>
                                            <rect x="16" y="8" width="4" height="4" fill="#d8b4fe" rx="1"/>
                                        </svg>
                                    </div>
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Cyberpunk (Neon)</span>
                                    <span className="text-xs text-gray-500">Glowing, thin lines. Best for Dark Mode.</span>
                                </button>

                                <button 
                                    onClick={() => setLocalConfig(prev => ({ ...prev, iconTheme: 'minimal' }))}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${localConfig.iconTheme === 'minimal' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                                >
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white">
                                        {/* Minimal Preview */}
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 7V19M4 7H10M4 7H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M14 12L17 15L20 12M17 15V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <rect x="14" y="5" width="8" height="14" rx="1" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Minimal (Clean)</span>
                                    <span className="text-xs text-gray-500">Bold, simple shapes. High clarity.</span>
                                </button>

                                <button 
                                    onClick={() => setLocalConfig(prev => ({ ...prev, iconTheme: 'standard' }))}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${localConfig.iconTheme === 'standard' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                                >
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white">
                                        {/* Standard Preview (Sparkles) */}
                                        <SparklesIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Standard (Classic)</span>
                                    <span className="text-xs text-gray-500">Original icons. Familiar and simple.</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
                <button 
                    onClick={resetToDefaults}
                    className="px-4 py-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                    Reset to Defaults
                </button>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md flex items-center gap-2 transition-colors"
                    >
                        <CheckIcon /> Save Changes
                    </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackRoomModal;
