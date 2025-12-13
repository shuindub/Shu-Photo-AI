
import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, SparklesIcon, BackRoomIcon, TrashIcon, ClipboardIcon, CloudIcon } from '../Icons';
import { useBackRoom } from '../../contexts/BackRoomContext';
import { AppTab, UserProfile } from '../../types';
import { Logger, LogEntry } from '../../utils/logger';
import { signIn, signOut, isConnected } from '../../services/googleDriveService';

interface BackRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'system' | 'glossary' | 'keys' | 'sd' | 'appearance' | 'logs';
  onSignOut?: () => void;
}

const BackRoomModal: React.FC<BackRoomModalProps> = ({ isOpen, onClose, initialTab = 'system', onSignOut }) => {
  const { config, updateConfig, resetToDefaults, isUnlocked, unlock } = useBackRoom();
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'glossary' | 'keys' | 'sd' | 'appearance' | 'logs'>(initialTab);
  const [error, setError] = useState('');
  const [localConfig, setLocalConfig] = useState(config);
  
  // Log Viewer State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      if (initialTab) setActiveTab(initialTab);
      // Subscribe to logs when modal is open
      const unsubscribe = Logger.subscribe((newLogs) => {
          setLogs(newLogs);
      });
      return () => unsubscribe();
    } else {
      setPassword('');
      setError('');
    }
  }, [isOpen, config, initialTab]);

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

  const handleDriveConnect = () => {
      updateConfig(localConfig);
      signIn();
  };

  const handleDriveDisconnect = () => {
      if (onSignOut) onSignOut();
      else signOut(); // Fallback if prop not passed
      
      // Force UI update
      setLocalConfig({...localConfig});
  };

  const filteredLogs = logs.filter(log => 
      log.message.toLowerCase().includes(logFilter.toLowerCase()) || 
      log.module.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.level.toLowerCase().includes(logFilter.toLowerCase())
  );

  const getLevelColor = (level: string) => {
      switch(level) {
          case 'error': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
          case 'warn': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
          case 'success': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
          case 'debug': return 'text-purple-500 bg-purple-100 dark:bg-purple-900/20';
          default: return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
      }
  };

  const copyLogs = () => {
      const text = filteredLogs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] [${l.module}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`).join('\n');
      navigator.clipboard.writeText(text);
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
                  External APIs
                </button>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'appearance' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Appearance
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'logs' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  System Logs
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

                    <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Google Client ID (For Drive Sync)</label>
                            {localConfig.googleClientId && (
                                <button 
                                    onClick={isConnected() ? handleDriveDisconnect : handleDriveConnect}
                                    className={`text-xs font-bold text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 shadow-sm ${isConnected() ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                                >
                                    <CloudIcon className="w-3 h-3" /> {isConnected() ? 'Disconnect' : 'Connect'}
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={localConfig.googleClientId || ''}
                            onChange={(e) => setLocalConfig(prev => ({ ...prev, googleClientId: e.target.value }))}
                            placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                            className="w-full p-3 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        <div className="text-xs text-gray-500 space-y-1 bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <p>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a>.</p>
                            <p>2. Create <strong>OAuth 2.0 Client ID</strong> (Web Application).</p>
                            <p>3. Add <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded select-all">{window.location.origin}</code> to "Authorized JavaScript origins".</p>
                            <p>4. Enable <strong>"Google Drive API"</strong> in Library.</p>
                        </div>
                    </div>
                  </div>
                ) : activeTab === 'sd' ? (
                    <div className="h-full flex flex-col space-y-6">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-lg">
                            <h3 className="text-indigo-800 dark:text-indigo-200 font-bold mb-1">External API Integration</h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                Configure endpoints for external processing services.
                            </p>
                        </div>
                        
                         <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SD API URL (Stable Diffusion)</label>
                            <input
                                type="text"
                                value={localConfig.sdApiUrl || ''}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, sdApiUrl: e.target.value }))}
                                placeholder="https://xxxx-xx-xx-xx-xx.ngrok-free.app"
                                className="w-full p-3 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-500">
                                Root URL of your Automatic1111 API.
                            </p>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Transform API URL (Experiment Tool)</label>
                            <input
                                type="text"
                                value={localConfig.transformApiUrl || ''}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, transformApiUrl: e.target.value }))}
                                placeholder="https://your-api.com/api/transform"
                                className="w-full p-3 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-500">
                                Endpoint for the single/batch image transform tool. <br/>
                                <span className="text-yellow-600 dark:text-yellow-400">Note: If left as default, tool runs in Mock Mode (returns input image).</span>
                            </p>
                        </div>
                    </div>
                ) : activeTab === 'appearance' ? (
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
                ) : (
                    /* LOGS VIEWER */
                    <div className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-4 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                             <input 
                                type="text"
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                placeholder="Filter logs..."
                                className="flex-grow px-3 py-1.5 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200"
                             />
                             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                             <button 
                                onClick={copyLogs}
                                className="p-1.5 text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400"
                                title="Copy Logs"
                             >
                                 <ClipboardIcon />
                             </button>
                             <button 
                                onClick={() => Logger.clearLogs()}
                                className="p-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                                title="Clear Logs"
                             >
                                 <TrashIcon className="w-4 h-4" />
                             </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto bg-black rounded-lg p-4 font-mono text-xs custom-scrollbar border border-gray-700">
                             {filteredLogs.length === 0 ? (
                                 <div className="h-full flex items-center justify-center text-gray-600">No logs found.</div>
                             ) : (
                                 <div className="space-y-1">
                                     {filteredLogs.map(log => (
                                         <div key={log.id} className="flex gap-2 items-start break-all hover:bg-gray-900 p-1 rounded">
                                             <span className="text-gray-500 whitespace-nowrap">
                                                 {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}.{new Date(log.timestamp).getMilliseconds().toString().padStart(3,'0')}
                                             </span>
                                             <span className={`font-bold px-1 rounded text-[10px] uppercase w-16 text-center shrink-0 ${getLevelColor(log.level)}`}>
                                                 {log.level}
                                             </span>
                                             <span className="text-gray-400 shrink-0 w-24 truncate" title={log.module}>
                                                 [{log.module}]
                                             </span>
                                             <span className="text-gray-300">
                                                 {log.message}
                                                 {log.data && (
                                                     <div className="ml-4 mt-1 text-gray-500 overflow-x-auto">
                                                         {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : String(log.data)}
                                                     </div>
                                                 )}
                                             </span>
                                         </div>
                                     ))}
                                 </div>
                             )}
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
