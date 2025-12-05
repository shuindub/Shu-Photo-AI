
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { UploadIcon, CheckIcon, ArrowPathIcon } from './Icons';
import ImageCard from './ImageCard';

interface ImageUploaderProps {
  onImageUpload: (files: File[]) => void;
  imagePreviewUrls: string[];
  label: string;
  multiple?: boolean;
  accept?: string;
  onImageAction?: (src: string, action: 'enhance' | 'upscale') => void;
  onSelectionChange?: (selectedIndices: number[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
    onImageUpload, 
    imagePreviewUrls, 
    label, 
    multiple = false, 
    accept = "image/*",
    onImageAction,
    onSelectionChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
        onSelectionChange(Array.from(selectedIndices));
    }
  }, [selectedIndices, onSelectionChange]);

  // Reset selection if image list changes reference (new upload usually replaces array)
  useEffect(() => {
      setSelectedIndices(new Set());
  }, [imagePreviewUrls]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImageUpload(Array.from(files));
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const typePrefix = accept.split('/')[0]; 
      const validFiles = Array.from(files).filter((file: File) => file.type.startsWith(typePrefix + '/'));
      
      if (validFiles.length > 0) {
        onImageUpload(multiple ? validFiles : [validFiles[0]]);
      }
    }
  }, [onImageUpload, multiple, accept]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSelectAll = () => {
      if (selectedIndices.size === imagePreviewUrls.length) {
          setSelectedIndices(new Set());
      } else {
          // Select all indices
          setSelectedIndices(new Set(imagePreviewUrls.map((_, i) => i)));
      }
  };

  const toggleSelection = (index: number) => {
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) {
          newSet.delete(index);
      } else {
          newSet.add(index);
      }
      setSelectedIndices(newSet);
  };

  const isAllSelected = imagePreviewUrls.length > 0 && selectedIndices.size === imagePreviewUrls.length;

  return (
    <div
      className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 group"
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        multiple={multiple}
      />
      {imagePreviewUrls.length > 0 ? (
        <div className="flex flex-col gap-3 w-full" onClick={(e) => e.stopPropagation()}>
          
          {/* Selection Header */}
          <div className="flex items-center justify-between px-2">
              <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors focus:outline-none"
              >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isAllSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white dark:bg-gray-700 border-gray-400 dark:border-gray-600'}`}>
                      {isAllSelected && <CheckIcon />}
                  </div>
                  Select All {selectedIndices.size > 0 && `(${selectedIndices.size})`}
              </button>

              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50"
                  title="Replace current images with new upload"
              >
                  <ArrowPathIcon />
                  <span>Re-upload</span>
              </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-1 custom-scrollbar">
            {imagePreviewUrls.map((url, index) => {
               const isSelected = selectedIndices.has(index);
               return (
                <div key={index} className="relative group/item" onClick={(e) => e.stopPropagation()}>
                    <div className={`relative rounded-xl transition-all duration-200 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-800' : ''}`}>
                        <ImageCard 
                            src={url} 
                            alt={`Preview ${index + 1}`} 
                            className="h-24 border border-gray-200 dark:border-gray-700"
                            imgClassName="w-full h-24 object-cover"
                            showDownloadButton={false}
                            onEnhance={onImageAction ? () => onImageAction(url, 'enhance') : undefined}
                            onUpscale={onImageAction ? () => onImageAction(url, 'upscale') : undefined}
                        />
                    </div>
                    
                    {/* Selection Checkbox Overlay */}
                    <div
                        onClick={() => toggleSelection(index)}
                        className="absolute top-2 left-2 z-30 cursor-pointer rounded-full shadow-sm"
                    >
                         <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all backdrop-blur-md ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/70 dark:bg-black/50 border-gray-300 dark:border-gray-500 hover:border-indigo-400'}`}>
                            {isSelected && <div className="transform scale-75"><CheckIcon /></div>}
                         </div>
                    </div>
                </div>
               );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48">
          <div className="p-4 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:scale-110 transition-transform duration-300 mb-4">
            <UploadIcon />
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium text-lg">{label}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 mb-4">{multiple ? "Drop multiple files here" : "or drag & drop / paste from clipboard"}</p>
          
          <button 
            type="button"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <UploadIcon className="w-5 h-5" />
            <span>Select Files</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
