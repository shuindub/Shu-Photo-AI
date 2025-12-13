
import React, { useState, useRef, useEffect } from 'react';
import { transformSingle, transformBatch } from '../services/transformService';
import { compressImage } from '../utils/fileUtils';
import { ImageData, HistoryItem, AppTab } from '../types';
import { UploadIcon, DownloadIcon, ArrowPathIcon, CheckIcon, XMarkIcon, BeakerIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, ClipboardIcon, BoltIcon, CogIcon, TrashIcon } from '../components/Icons';
import ImageCard from '../components/ImageCard';
import ErrorAlert from '../components/ErrorAlert';
import { useBackRoom } from '../contexts/BackRoomContext';

interface ExperimentToolProps {
  addToHistory: (item: HistoryItem) => void;
}

interface BatchItem {
  id: string;
  data: ImageData;
  status: 'queued' | 'processing' | 'done' | 'error';
  resultUrl?: string;
  error?: string;
}

// Helper to check if error is a network/CORS failure
const isNetworkError = (msg: string) => {
    const m = msg.toLowerCase();
    return m.includes("failed to fetch") || m.includes("networkerror") || m.includes("cors");
};

const BackendDiagnostics: React.FC<{ endpoint: string, onSwitchToMock: () => void }> = ({ endpoint, onSwitchToMock }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const curlCmd = `curl -i -X POST ${endpoint} \\
  -F "files[]=@test.jpg"`;

    const optionsCmd = `curl -i -X OPTIONS ${endpoint}`;

    return (
        <div className="mt-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5 text-sm animate-fadeIn">
            <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400 font-bold uppercase tracking-wider text-xs">
                <BoltIcon className="w-4 h-4" />
                Network Error Detected
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
                The backend endpoint is unreachable from the browser. This is usually due to CORS configuration or the server being offline.
            </p>

            <div className="space-y-4 mb-6">
                <div>
                    <strong className="block text-gray-900 dark:text-white mb-1 text-xs">1. Verify POST works via CURL</strong>
                    <div className="relative group">
                        <pre className="bg-gray-800 text-green-400 p-3 rounded-lg border border-gray-700 font-mono text-xs overflow-x-auto">
                            {curlCmd}
                        </pre>
                        <button onClick={() => copyToClipboard(curlCmd)} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <ClipboardIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div>
                    <strong className="block text-gray-900 dark:text-white mb-1 text-xs">2. Enable CORS Headers (Server-Side)</strong>
                    <div className="bg-gray-100 dark:bg-black/50 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre">
                        Access-Control-Allow-Origin: *<br/>
                        Access-Control-Allow-Methods: POST, OPTIONS<br/>
                        Access-Control-Allow-Headers: Content-Type
                    </div>
                </div>

                <div>
                    <strong className="block text-gray-900 dark:text-white mb-1 text-xs">3. Verify OPTIONS request returns 200 OK</strong>
                    <div className="relative group">
                        <pre className="bg-gray-800 text-blue-400 p-3 rounded-lg border border-gray-700 font-mono text-xs overflow-x-auto">
                            {optionsCmd}
                        </pre>
                        <button onClick={() => copyToClipboard(optionsCmd)} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <ClipboardIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-red-200 dark:border-red-800">
                <span className="text-xs text-red-600 dark:text-red-400">Need to test UI without backend?</span>
                <button 
                    onClick={onSwitchToMock}
                    className="px-4 py-2 bg-white dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <BeakerIcon className="w-3 h-3" /> Switch to Mock Mode
                </button>
            </div>
        </div>
    );
};

const ExperimentTool: React.FC<ExperimentToolProps> = ({ addToHistory }) => {
  const { config } = useBackRoom();
  // State to track if we are forcing mock mode locally
  const [useMockMode, setUseMockMode] = useState(false);
  
  const transformApiUrl = config.transformApiUrl || "https://YOUR_EXTERNAL_ENDPOINT/api/transform";
  
  // Determine if we are *actually* using the placeholder (which forces mock in service) or explicit mock
  const isActuallyMock = useMockMode || transformApiUrl.includes("YOUR_EXTERNAL_ENDPOINT");

  // --- SINGLE MODE STATE ---
  const [singleImage, setSingleImage] = useState<ImageData | null>(null);
  const [singleResult, setSingleResult] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState('');
  const singleInputRef = useRef<HTMLInputElement>(null);

  // --- BATCH MODE STATE ---
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const batchInputRef = useRef<HTMLInputElement>(null);

  // --- SINGLE MODE HANDLERS ---
  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSingleError('');
      setSingleResult(null);
      try {
        const file = e.target.files[0];
        const { base64, mimeType } = await compressImage(file);
        setSingleImage({
          file,
          url: URL.createObjectURL(file),
          base64,
          mimeType
        });
      } catch (err) {
        setSingleError("Failed to process image.");
      }
      e.target.value = '';
    }
  };

  const generateSingle = async () => {
    if (!singleImage) return;
    setSingleLoading(true);
    setSingleError('');
    setSingleResult(null);

    try {
      // Pass the configured URL and the mock override flag
      const resultUrl = await transformSingle(singleImage.file, transformApiUrl, useMockMode);
      setSingleResult(resultUrl);
      
      // Save to history
      addToHistory({
          id: Date.now().toString(),
          type: AppTab.XPRMNT,
          timestamp: Date.now(),
          prompt: `Transform (Single) [${isActuallyMock ? 'MOCK' : 'REAL'}]`,
          inputImages: [singleImage.url],
          results: [resultUrl]
      } as any);

    } catch (err: any) {
      setSingleError(err.message || "Generation failed.");
    } finally {
      setSingleLoading(false);
    }
  };

  // --- BATCH MODE HANDLERS ---
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const remainingSlots = 5 - batchItems.length;
      const filesToProcess = files.slice(0, remainingSlots);

      if (filesToProcess.length === 0) return;

      const newItems: BatchItem[] = [];
      for (const file of filesToProcess) {
        try {
          const { base64, mimeType } = await compressImage(file);
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            data: {
              file,
              url: URL.createObjectURL(file),
              base64,
              mimeType
            },
            status: 'queued'
          });
        } catch (err) {
          console.error("Batch upload error", err);
        }
      }
      setBatchItems(prev => [...prev, ...newItems]);
      e.target.value = '';
    }
  };

  const generateBatch = async () => {
    if (batchItems.length === 0) return;
    setBatchLoading(true);
    setBatchError('');

    // Mark all queued items as processing
    setBatchItems(prev => prev.map(item => 
        item.status === 'queued' || item.status === 'error' ? { ...item, status: 'processing', error: undefined } : item
    ));

    try {
      // Filter items that need processing
      const itemsToProcess = batchItems.filter(item => item.status !== 'done');
      if (itemsToProcess.length === 0) {
          setBatchLoading(false);
          return;
      }

      // Prepare files for the batch request
      const files = itemsToProcess.map(item => item.data.file);
      
      // Call External API
      const results = await transformBatch(files, transformApiUrl, useMockMode);

      // Map results back to items
      setBatchItems(prev => {
          const newItems = [...prev];
          let resultIdx = 0;
          
          for (let i = 0; i < newItems.length; i++) {
              // Match items that were part of this batch request
              if (newItems[i].status === 'processing') {
                  const res = results[resultIdx];
                  if (res) {
                      if (res.ok && res.image_url) {
                          newItems[i] = { ...newItems[i], status: 'done', resultUrl: res.image_url };
                      } else {
                          newItems[i] = { ...newItems[i], status: 'error', error: res.error || 'Failed' };
                      }
                  } else {
                      newItems[i] = { ...newItems[i], status: 'error', error: 'No result from server' };
                  }
                  resultIdx++;
              }
          }
          return newItems;
      });

      // Save successful batch to history
      const doneItems = batchItems.filter(i => i.status === 'done' || (itemsToProcess.includes(i) && results[batchItems.indexOf(i)]?.ok));
      if (doneItems.length > 0) {
           addToHistory({
            id: Date.now().toString(),
            type: AppTab.XPRMNT,
            timestamp: Date.now(),
            prompt: `Transform (Batch ${doneItems.length}) [${isActuallyMock ? 'MOCK' : 'REAL'}]`,
            inputImages: batchItems.map(i => i.data.url),
            results: doneItems.map(i => i.resultUrl!)
        } as any);
      }

    } catch (err: any) {
      const errMsg = err.message || "Batch Failed";
      setBatchError(errMsg);
      // If the whole batch fails (network error)
      setBatchItems(prev => prev.map(item => 
          item.status === 'processing' ? { ...item, status: 'error', error: errMsg } : item
      ));
    } finally {
      setBatchLoading(false);
    }
  };

  const clearBatch = () => {
    setBatchItems([]);
    setBatchError('');
  };

  const downloadAllBatch = () => {
    batchItems.forEach((item, idx) => {
      if (item.resultUrl) {
        const link = document.createElement('a');
        link.href = item.resultUrl;
        link.download = `transform_result_${idx + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <div className="flex flex-col w-full h-full max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      
      {/* HEADER */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
                <BeakerIcon className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Image Transform</h2>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Experimental Mono-Tool</p>
                    {/* Status Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${isActuallyMock ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'}`}>
                        {isActuallyMock ? 'MOCK MODE' : 'LIVE API'}
                    </span>
                </div>
            </div>
        </div>
        
        {/* Toggle Mock Mode Button */}
        <button 
            onClick={() => setUseMockMode(!useMockMode)}
            className={`p-2 rounded-lg text-xs font-medium transition-colors border ${useMockMode ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title={useMockMode ? "Disable Mock Mode (Use Real API)" : "Enable Mock Mode (Ignore Connection)"}
        >
            {useMockMode ? "Mocking ON" : "Use Real API"}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Pipeline Info Bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 break-all border border-gray-200 dark:border-gray-700">
            <BoltIcon className="w-3 h-3 flex-shrink-0" />
            <span className="opacity-70">Target Endpoint:</span>
            <span className={isActuallyMock ? "line-through opacity-50" : "text-indigo-600 dark:text-indigo-400"}>
                {transformApiUrl}
            </span>
            {isActuallyMock && <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-bold">(Bypassed)</span>}
        </div>

        {/* SECTION 1: SINGLE IMAGE */}
        <section className="bg-white dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">1</span>
                    Single Image
                </h3>
                {singleImage && !singleLoading && (
                    <button onClick={() => { setSingleImage(null); setSingleResult(null); setSingleError(''); }} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                        <XMarkIcon className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
                {/* Upload Area */}
                <div className="w-full sm:w-1/3">
                    <div 
                        onClick={() => singleInputRef.current?.click()}
                        className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${singleImage ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
                    >
                        {singleImage ? (
                            <img src={singleImage.url} alt="Single" className="w-full h-full object-contain rounded-lg p-2" />
                        ) : (
                            <div className="text-center p-4">
                                <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <span className="text-xs text-gray-500 font-medium">Click to Upload</span>
                            </div>
                        )}
                        <input type="file" ref={singleInputRef} onChange={handleSingleUpload} className="hidden" accept="image/*" />
                    </div>
                    {singleImage && (
                        <button 
                            onClick={generateSingle}
                            disabled={singleLoading}
                            className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {singleLoading ? 'Processing...' : (
                                <>
                                    <ArrowTrendingUpIcon className="w-4 h-4" /> Transform
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Result Area */}
                <div className="w-full sm:w-2/3 bg-gray-100 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center min-h-[200px] relative">
                    {singleLoading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-gray-500 font-mono animate-pulse">Running transform...</span>
                        </div>
                    ) : singleResult ? (
                        <div className="p-2 w-full h-full flex items-center justify-center relative group">
                            <img src={singleResult} alt="Result" className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm" />
                            <a 
                                href={singleResult} 
                                download="transform_result.jpg"
                                className="absolute bottom-4 right-4 p-2 bg-white/90 text-gray-900 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                title="Download"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </a>
                        </div>
                    ) : singleError ? (
                        <div className="text-center p-6 max-w-sm">
                            <ExclamationTriangleIcon className="w-10 h-10 text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">{singleError}</p>
                            {isNetworkError(singleError) && !useMockMode && (
                                <button 
                                    onClick={() => setUseMockMode(true)}
                                    className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-md text-xs font-bold hover:bg-yellow-200 transition-colors"
                                >
                                    Try Mock Mode?
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-400 dark:text-gray-600 text-sm font-medium">Result will appear here</div>
                    )}
                </div>
            </div>
            
            {/* Diagnostics Panel if Single Error is Network Related */}
            {singleError && isNetworkError(singleError) && !useMockMode && (
                <BackendDiagnostics endpoint={transformApiUrl} onSwitchToMock={() => setUseMockMode(true)} />
            )}
        </section>

        {/* SECTION 2: BATCH PROCESSING */}
        <section className="bg-white dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">2</span>
                    Batch Process (Max 5)
                </h3>
                <div className="flex gap-2">
                    {batchItems.length > 0 && (
                        <button onClick={clearBatch} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                            <TrashIcon className="w-3 h-3" /> Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Batch Toolbar */}
            <div className="flex gap-3 mb-4">
                 <button 
                    onClick={() => batchInputRef.current?.click()}
                    disabled={batchItems.length >= 5 || batchLoading}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                 >
                     <UploadIcon className="w-4 h-4" /> Add Images ({batchItems.length}/5)
                 </button>
                 <input type="file" ref={batchInputRef} onChange={handleBatchUpload} className="hidden" accept="image/*" multiple />

                 <button 
                    onClick={generateBatch}
                    disabled={batchItems.length === 0 || batchLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                 >
                     {batchLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowTrendingUpIcon className="w-4 h-4" />}
                     {batchLoading ? 'Processing...' : 'Run Batch'}
                 </button>
                 
                 {batchItems.some(i => i.status === 'done') && (
                     <button 
                        onClick={downloadAllBatch}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2"
                     >
                         <DownloadIcon className="w-4 h-4" /> Download Results
                     </button>
                 )}
            </div>
            
            {batchError && !isNetworkError(batchError) && (
                <div className="mb-4">
                    <ErrorAlert message={batchError} />
                </div>
            )}
            
            {/* Diagnostics Panel if Batch Error is Network Related */}
            {batchError && isNetworkError(batchError) && !useMockMode && (
                <BackendDiagnostics endpoint={transformApiUrl} onSwitchToMock={() => setUseMockMode(true)} />
            )}

            {/* Batch Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {batchItems.map((item, idx) => (
                    <div key={item.id} className="relative group bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 relative">
                             {item.status === 'done' && item.resultUrl ? (
                                 <img src={item.resultUrl} alt="Result" className="w-full h-full object-cover" />
                             ) : (
                                 <img src={item.data.url} alt="Input" className={`w-full h-full object-cover ${item.status === 'processing' ? 'opacity-50 blur-sm' : ''}`} />
                             )}
                             
                             {/* Status Overlays */}
                             {item.status === 'processing' && (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                     <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                 </div>
                             )}
                             {item.status === 'error' && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                     <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                                 </div>
                             )}
                             {item.status === 'done' && (
                                 <div className="absolute bottom-1 right-1 bg-green-500 text-white p-0.5 rounded-full shadow-sm">
                                     <CheckIcon />
                                 </div>
                             )}
                        </div>
                        
                        <div className="mt-2 flex justify-between items-center px-1">
                            <span className="text-[10px] text-gray-500 truncate max-w-[80px]" title={item.data.file.name}>{item.data.file.name}</span>
                            {item.status === 'done' && item.resultUrl ? (
                                <a href={item.resultUrl} download={`result_${idx}.jpg`} className="text-gray-400 hover:text-indigo-500">
                                    <DownloadIcon className="w-3 h-3" />
                                </a>
                            ) : (
                                <span className={`text-[9px] font-bold uppercase ${item.status === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                                    {item.status}
                                </span>
                            )}
                        </div>
                        {item.error && (
                             <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm rounded-xl p-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <p className="text-xs text-white text-center font-medium">{item.error}</p>
                             </div>
                        )}
                    </div>
                ))}
                
                {/* Empty State / Add Placeholder */}
                {batchItems.length < 5 && (
                    <div 
                        onClick={() => batchInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-indigo-500"
                    >
                        <PlusIcon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium">Add</span>
                    </div>
                )}
            </div>

            <div className="mt-4 text-xs text-gray-400 text-center">
                Use this tool for rapid background removal, style transfer, or format conversion. <br/>
                Requires external backend configured in BackRoom.
            </div>

        </section>

      </div>
    </div>
  );
};

// Icon Helper
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default ExperimentTool;
