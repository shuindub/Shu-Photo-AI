import React, { useState, useCallback } from 'react';
import { ClipboardIcon, CheckIcon } from './Icons';

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, className = '' }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!textToCopy || isCopied) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [textToCopy, isCopied]);

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy || isCopied}
      className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-indigo-500 ${
        !textToCopy
          ? 'text-gray-600 cursor-not-allowed bg-gray-800/50'
          : isCopied
          ? 'text-green-400 bg-gray-700'
          : 'text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white'
      } ${className}`}
      aria-label={isCopied ? 'Copied!' : 'Copy prompt'}
      title={isCopied ? 'Copied!' : 'Copy prompt'}
    >
      {isCopied ? <CheckIcon /> : <ClipboardIcon />}
    </button>
  );
};

export default CopyButton;
