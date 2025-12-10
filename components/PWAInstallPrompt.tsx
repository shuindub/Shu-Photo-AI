import React, { useEffect, useState } from 'react';
import { DownloadIcon, XMarkIcon } from './Icons';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Standard PWA prompt logic
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible && !isIOS) return null;
  
  // Don't show if already standalone (simple check)
  if (window.matchMedia('(display-mode: standalone)').matches) return null;

  return (
    <>
        {/* Android / Desktop Prompt */}
        {isVisible && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[80] w-[90%] max-w-sm animate-slideUp">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-indigo-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
                            <DownloadIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Install App</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Add to Home Screen for better experience</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setIsVisible(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={handleInstallClick}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-lg transition-colors whitespace-nowrap"
                        >
                            Install
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default PWAInstallPrompt;