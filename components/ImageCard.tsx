
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DownloadIcon, ArrowsPointingOutIcon, XMarkIcon, SparklesIcon, ArrowPathIcon } from './Icons';

interface ImageCardProps {
  src: string;
  alt: string;
  label?: string;
  showDownloadButton?: boolean;
  cropAspectRatio?: string;
  className?: string;
  imgClassName?: string;
  onEnhance?: () => void;
  onUpscale?: () => void; // Keeping prop for compatibility but merged into enhance UI
  onRegenerate?: () => void;
}

const getAspectRatioClass = (ratio: string | undefined): string => {
    if (!ratio || ratio === 'original') return '';
    switch (ratio) {
        case '1:1': return 'aspect-square';
        case '16:9': return 'aspect-video';
        case '9:16': return 'aspect-[9/16]';
        case '4:3': return 'aspect-[4/3]';
        case '3:4': return 'aspect-[3/4]';
        default: return '';
    }
}

const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;

const ImageCard: React.FC<ImageCardProps> = ({ 
  src, 
  alt, 
  label, 
  showDownloadButton, 
  cropAspectRatio, 
  className = '', 
  imgClassName = '',
  onEnhance,
  onUpscale,
  onRegenerate
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [meta, setMeta] = useState({ size: '', res: '', ratio: '', ext: 'JPG' });

  useEffect(() => {
      // Analyze basic file info from src string
      if (src.startsWith('data:')) {
          const mime = src.split(';')[0].split(':')[1];
          const ext = mime.split('/')[1].toUpperCase();
          // Base64 size estimation: (length * 3) / 4 - padding
          const sizeInBytes = (src.length * 3) / 4; 
          setMeta(prev => ({ ...prev, size: formatBytes(sizeInBytes), ext }));
      } else {
          // Blob url or remote url
           setMeta(prev => ({ ...prev, ext: 'IMG' }));
      }
  }, [src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const commonDivisor = gcd(w, h);
      const rw = w / commonDivisor;
      const rh = h / commonDivisor;
      // Simplify ratio if it's very large numbers (non-standard)
      let ratioStr = `${rw}:${rh}`;
      if (rw > 100 || rh > 100) {
          // Approximation
          ratioStr = (w/h).toFixed(2);
      }
      
      setMeta(prev => ({ ...prev, res: `${w}x${h}`, ratio: ratioStr }));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = (alt ? alt.replace(/[^\w\s.-]/g, '').replace(/[\s,.]+/g, '_') : 'gemini-image') + '.jpeg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPreviewOpen(!isPreviewOpen);
  };

  // Consolidate Enhance/Upscale logic
  const handleEnhanceClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEnhance) onEnhance();
      else if (onUpscale) onUpscale();
  };

  const aspectRatioClass = getAspectRatioClass(cropAspectRatio);
  
  const containerBase = "relative group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg dark:shadow-xl transform hover:scale-[1.02] transition-all duration-300 hover:z-10 border border-gray-200 dark:border-gray-700";
  const containerClass = `${containerBase} ${aspectRatioClass} ${className}`;

  const imageBase = aspectRatioClass ? "absolute inset-0 w-full h-full object-cover" : "w-full h-auto object-cover";
  const imageClass = `${imageBase} ${imgClassName}`;

  return (
    <>
      <div className={containerClass}>
        {label && (
            <p className={aspectRatioClass ? "absolute top-0 left-0 w-full text-center p-1 text-xs bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm font-semibold text-gray-700 dark:text-gray-300 z-10 border-b border-gray-200 dark:border-gray-700" : "text-center p-2 text-sm bg-gray-100 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300"}>
                {label}
            </p>
        )}
        <img 
            src={src} 
            alt={alt} 
            className={imageClass} 
            onLoad={handleImageLoad}
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
            <div className="flex gap-2">
                <button
                    onClick={togglePreview}
                    className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all transform hover:scale-110 focus:outline-none"
                    title="Full screen"
                >
                    <ArrowsPointingOutIcon />
                </button>
                {showDownloadButton && (
                    <button
                    onClick={handleDownload}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-all transform hover:scale-110 focus:outline-none"
                    title="Download"
                    >
                    <DownloadIcon />
                    </button>
                )}
            </div>
            
            {/* Action Buttons Row */}
            <div className="flex gap-2 mt-1">
                {(onEnhance || onUpscale) && (
                    <button 
                        onClick={handleEnhanceClick} 
                        className="p-2 bg-pink-500 hover:bg-pink-400 text-white rounded-full backdrop-blur-md shadow-lg flex items-center justify-center transform hover:scale-110 transition-all"
                        title="Enhance & Upscale"
                    >
                        <SparklesIcon />
                    </button>
                )}
                {onRegenerate && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRegenerate(); }} 
                        className="p-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-full backdrop-blur-md shadow-lg flex items-center justify-center transform hover:scale-110 transition-all border border-gray-500"
                        title="Regenerate"
                    >
                        <ArrowPathIcon />
                    </button>
                )}
            </div>
        </div>

        {/* Metadata Bar (Bottom Left) */}
        <div className="absolute bottom-0 left-0 w-full p-1 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-1.5 text-[8px] font-mono text-white/90 pl-1 pb-0.5">
                {meta.size && <span>{meta.size}</span>}
                {meta.res && (
                    <>
                        <span className="text-gray-400">•</span>
                        <span>{meta.res}</span>
                    </>
                )}
                {meta.ratio && (
                    <>
                        <span className="text-gray-400">•</span>
                        <span>{meta.ratio}</span>
                    </>
                )}
                 {meta.ext && (
                    <>
                        <span className="text-gray-400">•</span>
                        <span className="bg-white/20 px-0.5 rounded text-white">{meta.ext}</span>
                    </>
                )}
            </div>
        </div>
      </div>

      {isPreviewOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 transition-all duration-300" onClick={togglePreview}>
          <button 
            onClick={togglePreview}
            className="absolute top-6 right-6 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full transition-colors shadow-sm"
            aria-label="Close preview"
          >
            <XMarkIcon />
          </button>
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default ImageCard;
