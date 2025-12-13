
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { generateImage, editImage, analyzeImage, createChatSession } from '../services/geminiService';
import { analyzeImageOpenRouter } from '../services/openRouterService';
import { generateImageSD } from '../services/sdService';
import { generateImageTool, editImageTool, analyzeImageTool } from '../services/tools';
import { fileToBase64, extractFramesFromVideo, dataURLtoFile, compressImage, urlToFile } from '../utils/fileUtils';
import { AppTab, HistoryItem, ImageData, ChatMessage, HandoffData } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useBackRoom } from '../contexts/BackRoomContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { BIOMETRIC_RULE } from '../config/biometric';
import { Logger } from '../utils/logger';

import ErrorAlert from '../components/ErrorAlert';
import ChatMessageComponent from '../components/ChatMessage';
import ImageCard from '../components/ImageCard';
import ExperimentTool from './ExperimentTool'; // NEW IMPORT
import { ArrowTrendingUpIcon, PlusIcon, TrashIcon, SparklesIcon, FilmIcon, PhotoIcon, PencilSquareIcon, MicrophoneIcon, StopCircleIcon, ExclamationTriangleIcon, PaperClipIcon, XMarkIcon, UploadIcon, GoogleDriveIcon, VideoPlusIcon, BodyPoseIcon, BeakerIcon } from '../components/Icons';

interface StudioProps {
  activeTab: AppTab;
  addToHistory: (item: HistoryItem) => void;
  revisitData: HistoryItem | null;
  onRevisitHandled: () => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  onHandoff?: (data: HandoffData) => void;
  handoffData?: HandoffData | null;
  onHandoffHandled?: () => void;
}

const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const models = [
    { label: 'Imagen 4', value: 'imagen-4.0-generate-001' },
    { label: 'Imagen 3', value: 'imagen-3.0-generate-001' },
    { label: 'Imagen 3 Fast', value: 'imagen-3.0-fast-generate-001' },
    { label: 'Banana Pro', value: 'gemini-3-pro-image-preview' },
    { label: 'Nano Banana', value: 'gemini-2.5-flash-image' },
    { label: '⚡ SDXL (Colab/Local)', value: 'sd-external' }
];
const imageCounts = [1, 2, 3, 4];

const analysisEngines = [
    { label: '🍌 Banana Vision (Gemini)', value: 'gemini' },
    { label: '🔥 Qwen 2.5 VL 72B (SOTA)', value: 'qwen/qwen-2.5-vl-72b-instruct' },
    { label: '🌪️ Pixtral 12B (Mistral)', value: 'mistralai/pixtral-12b' },
    { label: '💎 Gemini 2.0 Pro Vision (Exp)', value: 'google/gemini-2.0-pro-exp-02-05' },
    { label: '🦙 Llama 3.2 Vision', value: 'meta-llama/llama-3.2-11b-vision-instruct' }
];

const PROMPT_TEMPLATES = {
    standard: "",
    biometric: "", 
    global: "Subject: [Detailed Description], Action: [Dynamic Movement/Pose], Set: [Immediate Surroundings/Props], Setting: [Background/Location/Era], Lighting: [Source/Direction/Color], Mood: [Atmosphere/Vibe]",
    setSetting: "Location: [Architecture/Landscape], Time: [Hour/Season], Weather: [Conditions], Lighting: [Natural/Artificial Setup], Props: [Key Objects], Atmosphere: [Sensory Details]"
};

const STYLE_PRESETS = [
  { 
    label: '⭐ Фотореализм', 
    prompt: 'Ultra-realistic portrait photograph of a person, soft natural lighting, 50mm lens, shallow depth of field, detailed skin texture, cinematic mood, high dynamic range, crisp details, professional photography quality.' 
  },
  { 
    label: '⭐ Сверхчёткий рендер', 
    prompt: 'Hyper-detailed product render on a clean background, soft studio lighting, global illumination, sharp reflections, premium commercial photography style.' 
  },
  { 
    label: '⭐ Кино-эпизод', 
    prompt: 'Cinematic wide-angle shot, atmospheric lighting, volumetric fog, dramatic contrast, detailed environment, high realism, 4K film still quality.' 
  },
  { 
    label: '⭐ Минимал', 
    prompt: 'Minimalistic vector logo, clean geometric shapes, balanced composition, modern design, bold lines, high contrast, simple color palette, scalable vector style.' 
  }
];

const Studio: React.FC<StudioProps> = ({ 
  activeTab, 
  addToHistory, 
  revisitData, 
  onRevisitHandled, 
  isLoading, 
  setIsLoading, 
  onHandoff,
  handoffData,
  onHandoffHandled
}) => {
  const { t } = useSettings();
  const { config } = useBackRoom();
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [selectedModel, setSelectedModel] = useState<string>('imagen-4.0-generate-001');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [selectedEngine, setSelectedEngine] = useState<string>('gemini');
  const [progressText, setProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pose Copy State
  const [showPoseUpload, setShowPoseUpload] = useState(false);
  const [poseImage, setPoseImage] = useState<ImageData | null>(null);
  const poseInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Input Hook
  const { isListening, transcript, startListening, stopListening, hasSupport, error: speechError } = useSpeechRecognition();
  
  // Voice State for Batch and Main
  const [listeningBatchIndex, setListeningBatchIndex] = useState<number | null>(null);
  const [initialTextSnapshot, setInitialTextSnapshot] = useState('');

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchPrompts, setBatchPrompts] = useState<string[]>(['', '']);
  const [batchImages, setBatchImages] = useState<(ImageData | null)[]>([null, null]); // Parallel array for images in batch

  // === EXPERIMENT TAB OVERRIDE ===
  if (activeTab === AppTab.XPRMNT) {
      return <ExperimentTool addToHistory={addToHistory} />;
  }

  // Handle Transcript Updates
  useEffect(() => {
    // Only update if currently listening and we have a transcript
    if (isListening && transcript !== undefined) {
       // If in Batch Mode and a specific row is active
       if (isBatchMode && listeningBatchIndex !== null) {
           setBatchPrompts(prev => {
               const newPrompts = [...prev];
               const prefix = initialTextSnapshot ? initialTextSnapshot + ' ' : '';
               newPrompts[listeningBatchIndex] = prefix + transcript;
               return newPrompts;
           });
       } 
       // Normal Input Mode
       else if (!isBatchMode) {
           const prefix = initialTextSnapshot ? initialTextSnapshot + ' ' : '';
           setInputText(prefix + transcript);
       }
    }
  }, [transcript, isListening, isBatchMode, listeningBatchIndex, initialTextSnapshot]);
  
  const toggleMainListening = () => {
      if (isListening) {
          stopListening();
      } else {
          setInitialTextSnapshot(inputText);
          setListeningBatchIndex(null); 
          startListening();
      }
  };

  const toggleBatchListening = (index: number) => {
      if (isListening && listeningBatchIndex === index) {
          stopListening();
          setListeningBatchIndex(null);
      } else {
          if (isListening) stopListening(); 
          setInitialTextSnapshot(batchPrompts[index]);
          setListeningBatchIndex(index);
          startListening();
      }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Initialize chat session
  useEffect(() => {
    let systemInstruction = config.systemInstructions[activeTab] || '';
    
    if (config.glossary) {
        systemInstruction += `\n\nHere is a glossary of terms you should be aware of:\n${config.glossary}`;
    }

    let greeting = '';
    let tools = [];

    switch(activeTab) {
      case AppTab.TEXT2IMAGE:
        if (!systemInstruction) systemInstruction = "You are a creative assistant. Generate images based on user prompts using `generateImage`.";
        greeting = "I'm here to bring your ideas to life! Describe the image you want me to generate.";
        tools.push(generateImageTool);
        break;
      case AppTab.IMAGE2IMAGE:
        if (!systemInstruction) systemInstruction = "You are an expert image editing assistant. Use `editImage` to modify uploaded images.";
        greeting = "Upload an image and tell me how you'd like to change it.";
        tools.push(editImageTool);
        break;
      case AppTab.IMAGE2TEXT:
        if (!systemInstruction) systemInstruction = "You are an image analysis expert. Use `analyzeImage` to answer questions about uploaded images.";
        greeting = "I can tell you all about any image. Upload one and ask away!";
        tools.push(analyzeImageTool);
        break;
      case AppTab.ENCH_UPSCL:
        if (!systemInstruction) systemInstruction = "You are an image enhancement specialist. Use `editImage` to upscale and improve images. Interpret user requests as instructions to upscale, denoise, sharpen, and refine the image.";
        greeting = "Upload an image, and I'll enhance details, upscale resolution, and fix artifacts for you.";
        tools.push(editImageTool);
        break;
      case AppTab.FRAME2IMAGE:
        if (!systemInstruction) systemInstruction = "You are a video frame extraction assistant.";
        greeting = "Upload a video to extract high-quality frames.";
        break;
      // XPRMNT case handled by early return above, but kept here for fallback logic consistency in config
      case AppTab.XPRMNT:
        break;
    }

    try {
        const session = createChatSession(systemInstruction, tools);
        setChatSession(session);
        
        if (messages.length === 0 && !revisitData && !handoffData) {
            setMessages([{ id: 'init', author: 'model', text: greeting }]);
        }
    } catch (e) {
        console.error("Failed to init chat:", e);
        setError(e instanceof Error ? e.message : "Failed to initialize AI session. Check API Key.");
    }
  }, [activeTab, config]);

  // Handle Revisit Data
  useEffect(() => {
    if (revisitData && revisitData.type === activeTab) {
      setMessages([]);
      setInputText(revisitData.prompt);
      
      if (revisitData.type === AppTab.TEXT2IMAGE) {
          const item = revisitData as any; 
          setAspectRatio(item.aspectRatio || '1:1');
          setSelectedModel(item.model || 'imagen-4.0-generate-001');
          setNumberOfImages(item.numberOfImages || 1);
          
          const resultMessages: ChatMessage[] = [{
              id: 'revisit-res',
              author: 'model',
              images: item.results
          }];
          setMessages(prev => [...prev, ...resultMessages]);
      } else if (revisitData.type === AppTab.IMAGE2IMAGE || revisitData.type === AppTab.ENCH_UPSCL) {
           const item = revisitData as any;
           const resultMessages: ChatMessage[] = [{
              id: 'revisit-res',
              author: 'model',
              images: item.results
          }];
          setMessages(prev => [...prev, ...resultMessages]);
      } else if (revisitData.type === AppTab.IMAGE2TEXT) {
          const item = revisitData as any;
          // Set engine if available, otherwise default to gemini
          setSelectedEngine(item.engine || 'gemini');
          // Add text result if available
          if (item.modelOutput) {
              setMessages(prev => [...prev, { id: 'revisit-res', author: 'model', text: item.modelOutput }]);
          }
      }

      onRevisitHandled();
    }
  }, [revisitData, activeTab, onRevisitHandled]);

  // Handle Handoff Data
  useEffect(() => {
      if (handoffData && handoffData.targetTab === activeTab) {
          setImages([handoffData.image]);
          if (onHandoffHandled) onHandoffHandled();
      }
  }, [handoffData, activeTab, onHandoffHandled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files) as File[];
        handleFileSelect(files);
        // Reset input value so same file can be selected again
        e.target.value = '';
    }
  };

  const handleFileSelect = async (files: File[]) => {
    setError('');
    if (activeTab === AppTab.FRAME2IMAGE) {
       handleVideoSelect(files[0]);
       return;
    }

    const newImages: ImageData[] = [];
    for (const file of files) {
      try {
        // Compress image before storing
        const { base64, mimeType } = await compressImage(file);
        newImages.push({
          file,
          url: URL.createObjectURL(file),
          base64,
          mimeType
        });
      } catch (err) {
        Logger.error("Studio", "Image processing failed", err);
        setError('Failed to process image. It might be corrupted or too large.');
      }
    }

    // Logic: If multi-select allowed (i2i, ench), append. Else replace.
    if (activeTab === AppTab.IMAGE2IMAGE || activeTab === AppTab.ENCH_UPSCL) {
        setImages(prev => [...prev, ...newImages]);
    } else {
        setImages(newImages);
    }
  };
  
  const handleRemoveImage = (index: number) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handlePoseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          try {
              const file = e.target.files[0];
              const { base64, mimeType } = await compressImage(file);
              setPoseImage({
                  file,
                  url: URL.createObjectURL(file),
                  base64,
                  mimeType
              });
          } catch (e) {
              setError("Failed to process pose image");
          }
          e.target.value = '';
      }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
      if (activeTab === AppTab.TEXT2IMAGE) return; 
      
      const items = e.clipboardData.items;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
              const file = items[i].getAsFile();
              if (file) files.push(file);
          }
      }
      if (files.length > 0) {
          e.preventDefault();
          handleFileSelect(files);
      }
  };
  
  // DRAG AND DROP HANDLERS
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTab === AppTab.TEXT2IMAGE) return;
      
      const files = Array.from(e.dataTransfer.files) as File[];
      if (files.length > 0) {
          handleFileSelect(files);
      }
  };

  const handleVideoSelect = async (file: File) => {
      setIsLoading(true);
      try {
          const frames = await extractFramesFromVideo(file);
          const resultMsg: ChatMessage = {
              id: Date.now().toString(),
              author: 'model',
              text: `Extracted ${frames.length} frames from ${file.name}`,
              images: frames
          };
          setMessages(prev => [...prev, resultMsg]);
          
          addToHistory({
              id: Date.now().toString(),
              type: AppTab.FRAME2IMAGE,
              timestamp: Date.now(),
              prompt: `Frames from ${file.name}`,
              videoName: file.name,
              results: frames
          } as any);

      } catch (e) {
          setError("Failed to extract frames.");
      } finally {
          setIsLoading(false);
      }
  }

  const handleImageAction = async (src: string, action: 'enhance' | 'upscale') => {
      if (!onHandoff) return;
      
      try {
          // Use urlToFile to safely handle blob URLs or Data URLs
          const file = await urlToFile(src, `image_handoff_${Date.now()}.png`);
          // Compress handoff image too to be safe
          const { base64, mimeType } = await compressImage(file);
          
          const imageData: ImageData = {
              file,
              url: src, 
              base64,
              mimeType
          };

          onHandoff({
              image: imageData,
              targetTab: AppTab.ENCH_UPSCL
          });
      } catch (e) {
          console.error("Failed to handoff image", e);
          setError("Failed to prepare image for enhancement. " + (e instanceof Error ? e.message : ''));
      }
  };
  
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const tmplKey = e.target.value;
      setSelectedTemplate(tmplKey);
      if (tmplKey !== 'standard') {
          const tmplText = PROMPT_TEMPLATES[tmplKey as keyof typeof PROMPT_TEMPLATES];
          if (tmplText) {
              setInputText(tmplText);
          } else {
              // Clear input for templates like 'biometric' that inject rules silently
              setInputText('');
          }
      } else {
          setInputText('');
      }
  };

  const handleBatchImageUpload = async (index: number, files: File[]) => {
      if (files.length > 0) {
          try {
            const { base64, mimeType } = await compressImage(files[0]);
            const imgData: ImageData = {
                file: files[0],
                url: URL.createObjectURL(files[0]),
                base64,
                mimeType
            };
            const newImages = [...batchImages];
            newImages[index] = imgData;
            setBatchImages(newImages);
          } catch (e) {
              setError("Failed to process batch image");
          }
      }
  };

  const handleBatchChange = (index: number, value: string) => {
      const newPrompts = [...batchPrompts];
      newPrompts[index] = value;
      setBatchPrompts(newPrompts);
  }

  const handleSendMessage = async (overridePrompt?: string) => {
    const textToSend = overridePrompt !== undefined ? overridePrompt : inputText;

    // Allow empty input only if Biometric template is active in Image2Text
    const isBiometricAnalysis = activeTab === AppTab.IMAGE2TEXT && selectedTemplate === 'biometric';
    const hasRegularImages = images.length > 0;

    if ((!textToSend.trim() && !hasRegularImages) && !isBatchMode && !isBiometricAnalysis) return;
    
    if (!chatSession) return;
    
    Logger.info("Studio", "Processing user message", { 
        textLength: textToSend.length, 
        tab: activeTab, 
        images: images.length,
        isBatchMode 
    });

    // Batch Mode Handling
    if (isBatchMode && !overridePrompt) {
        
        if (activeTab === AppTab.TEXT2IMAGE) {
             const validPrompts = batchPrompts.filter(p => p.trim() !== '');
             if (validPrompts.length === 0) return;

             setIsLoading(true);
             setBatchPrompts(['', '']); 
             setIsBatchMode(false); 

             try {
                 const promises = validPrompts.map(async (prompt, idx) => {
                     await new Promise(resolve => setTimeout(resolve, idx * 1000));
                     
                     const msgId = Date.now().toString() + Math.random();
                     setMessages(prev => [...prev, { id: msgId, author: 'user', text: prompt }]);
                     
                     try {
                         const results = await generateImage(prompt, 1, aspectRatio, selectedModel);
                         setMessages(prev => [...prev, { id: msgId + '_res', author: 'model', images: results }]);
                         addToHistory({
                             id: msgId,
                             type: AppTab.TEXT2IMAGE,
                             timestamp: Date.now(),
                             prompt: prompt,
                             results: results,
                             numberOfImages: 1,
                             aspectRatio,
                             model: selectedModel
                         } as any);
                     } catch (e) {
                         setMessages(prev => [...prev, { id: msgId + '_err', author: 'model', text: `Error generating for: "${prompt}"` }]);
                     }
                 });
                 await Promise.all(promises);
             } catch (e) {
                 Logger.error("Studio", "Batch processing error", e);
                 setError("Batch processing error");
             } finally {
                 setIsLoading(false);
             }
             return;

        } else if (activeTab === AppTab.IMAGE2TEXT) {
             // Filter indices where we have an image
             const validIndices = batchImages.map((img, idx) => img ? idx : -1).filter(idx => idx !== -1);

             if (validIndices.length === 0) {
                 setError("Please upload images for batch processing.");
                 return;
             }

             setIsLoading(true);
             setBatchPrompts(['', '']);
             setBatchImages([null, null]);
             setIsBatchMode(false);
             
             try {
                 const promises = validIndices.map(async (originalIdx, delayFactor) => {
                     await new Promise(resolve => setTimeout(resolve, delayFactor * 1000));
                     
                     const image = batchImages[originalIdx];
                     const prompt = batchPrompts[originalIdx];
                     if (!image) return;

                     const msgId = Date.now().toString() + Math.random();

                     setMessages(prev => [...prev, { id: msgId, author: 'user', text: prompt, images: [image.url] }]);

                     let finalPrompt = prompt;
                     if (selectedTemplate === 'biometric') {
                          const userInstruction = prompt ? `User Focus/Question: ${prompt}` : "";
                          finalPrompt = `${BIOMETRIC_RULE}\n\n${userInstruction}\n\nINSTRUCTIONS: Analyze the provided image strictly according to the BIOMETRIC PROMPTING PROTOCOL defined above. Output the result in the exact format of the Reference Example provided in the protocol. Do NOT use the 'Subject:...' placeholder format.`;
                     } else {
                         finalPrompt = finalPrompt || "Describe this image";
                     }

                     try {
                        let resultText = '';
                        if (selectedEngine !== 'gemini') {
                            if (!config.openRouterKey) throw new Error("OpenRouter Key required for this engine.");
                            resultText = await analyzeImageOpenRouter(config.openRouterKey, image.base64, finalPrompt, selectedEngine);
                        } else {
                            resultText = await analyzeImage(image.base64, image.mimeType, finalPrompt);
                        }

                        setMessages(prev => [...prev, { id: msgId + '_res', author: 'model', text: resultText }]);
                        addToHistory({
                             id: msgId,
                             type: AppTab.IMAGE2TEXT,
                             timestamp: Date.now(),
                             prompt: prompt,
                             inputImages: [image.url],
                             results: [],
                             engine: selectedEngine,
                             modelOutput: resultText // Capture text result for batch
                        } as any);
                     } catch(e) {
                        const errMsg = e instanceof Error ? e.message : "Unknown error";
                        setMessages(prev => [...prev, { id: msgId + '_err', author: 'model', text: `Error analyzing: ${errMsg}` }]);
                     }
                 });
                 await Promise.all(promises);
             } catch (e) {
                  Logger.error("Studio", "Batch processing error", e);
                  setError("Batch processing error");
             } finally {
                  setIsLoading(false);
             }
             return;
        }
    }

    // Single Message Handling
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      author: 'user',
      text: textToSend,
      images: images.map(img => img.url)
    };

    setMessages(prev => [...prev, userMessage]);
    if (!overridePrompt) setInputText(''); 
    setImages([]);
    // Note: Don't clear pose image here so user can reuse it
    setIsLoading(true);
    setError('');

    try {
      let responseText = '';
      let resultImages: string[] = [];
      let processingErrors: string[] = [];

      // --- POSE EXTRACTION LOGIC (SMART ADAPTER) ---
      let augmentedPrompt = userMessage.text || "Edit this image";
      if (activeTab === AppTab.IMAGE2IMAGE && poseImage && showPoseUpload) {
          setProgressText("Extracting pose structure...");
          try {
              // Analyze the pose reference first
              let poseAnalysis = '';
              const analysisPrompt = "Describe the skeleton pose, limb position and camera angle. Use clinical, safe, geometric terms only. Do not describe clothing, skin, or gender. Provide a full and complete description. Output as much detail as possible. Do not truncate.";
              
              if (selectedEngine !== 'gemini') {
                  if (!config.openRouterKey) throw new Error("OpenRouter API Key missing for pose extraction.");
                  poseAnalysis = await analyzeImageOpenRouter(config.openRouterKey, poseImage.base64, analysisPrompt, selectedEngine);
              } else {
                  poseAnalysis = await analyzeImage(poseImage.base64, poseImage.mimeType, analysisPrompt);
              }

              augmentedPrompt += `\n\nTARGET POSE INSTRUCTION: Change the subject's pose to: ${poseAnalysis}.`;
              setMessages(prev => [...prev, { id: Date.now().toString() + '_pose', author: 'model', text: `🧠 Pose extracted:\n\n${poseAnalysis}` }]);
          } catch (err) {
              console.error("Pose extraction failed", err);
              const errMsg = err instanceof Error ? err.message : "Unknown error";
              processingErrors.push(`Failed to analyze pose reference: ${errMsg}. Proceeding with original prompt.`);
          }
      }

      // --- EXTERNAL SD SERVICE ROUTING ---
      let handledBySD = false;
      if (selectedModel === 'sd-external' && (activeTab === AppTab.TEXT2IMAGE || activeTab === AppTab.IMAGE2IMAGE)) {
           if (!config.sdApiUrl) {
               throw new Error("SD API URL missing. Please configure it in BackRoom -> SD / Colab.");
           }
           
           const [w, h] = aspectRatio === '1:1' ? [1024, 1024] :
                          aspectRatio === '16:9' ? [1344, 768] :
                          aspectRatio === '9:16' ? [768, 1344] :
                          [1024, 1024]; // Fallbacks
           
           const params: any = {
               prompt: augmentedPrompt,
               width: w,
               height: h,
               batch_size: numberOfImages,
               init_images: activeTab === AppTab.IMAGE2IMAGE && userMessage.images && images[0] ? [images[0].base64] : undefined
           };
           
           resultImages = await generateImageSD(config.sdApiUrl, params);
           responseText = `Generated with SDXL (${config.sdApiUrl})`;
           handledBySD = true;
      } 
      
      // --- STANDARD GEMINI / IMAGEN ROUTING ---
      if (!handledBySD) {
          if (activeTab === AppTab.TEXT2IMAGE) {
              const response = await chatSession.sendMessage({
                message: `User selected aspect ratio: ${aspectRatio}. User selected model: ${selectedModel}. User selected image count: ${numberOfImages}. Prompt: ${userMessage.text}`
              });
              
              if (response.functionCalls && response.functionCalls.length > 0) {
                   const call = response.functionCalls[0];
                   Logger.info("Studio", `Tool call: ${call.name}`);

                   if (call.name === 'generateImage') {
                       const args = call.args as any;
                       const prompt = args.prompt;
                       const ar = aspectRatio; 
                       const mod = selectedModel;
                       const num = numberOfImages; // Use state value
                       
                       resultImages = await generateImage(prompt, num, ar, mod);
                       
                       await chatSession.sendMessage({
                           message: [{
                               functionResponse: {
                                   id: call.id,
                                   name: call.name,
                                   response: { result: `${num} images generated successfully` }
                               }
                           }]
                       });
                   } 
              } else {
                 responseText = response.text || '';
              }

          } else if (activeTab === AppTab.IMAGE2IMAGE || activeTab === AppTab.ENCH_UPSCL) {
              if (images.length > 0) {
                  const promptText = augmentedPrompt; // Use the augmented prompt with pose data
                  
                  const results: string[] = [];
                  const total = images.length;
                  
                  for (let i = 0; i < total; i++) {
                      if (total > 1) {
                          setProgressText(`${t.processing} (${i + 1}/${total})`);
                      }
                      
                      if (i > 0) await new Promise(resolve => setTimeout(resolve, 2000));

                      let success = false;
                      let attempts = 0;
                      const MAX_RETRIES = 3;

                      while (!success && attempts < MAX_RETRIES) {
                          attempts++;
                          try {
                              const result = await editImage(images[i].base64, images[i].mimeType, promptText);
                              results.push(result);
                              success = true;
                          } catch (e: any) {
                              Logger.warn("Studio", `Edit Attempt ${attempts} failed for image ${i + 1}`, e);
                              
                              if (attempts === MAX_RETRIES) {
                                  const errorMsg = e instanceof Error ? e.message : String(e);
                                  processingErrors.push(`Image ${i + 1}: ${errorMsg}`);
                              } else {
                                  await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
                              }
                          }
                      }
                  }
                  
                  if (results.length === 0 && processingErrors.length > 0) {
                      responseText = "Failed to process images. Errors:\n" + processingErrors.join("\n");
                  } else {
                      resultImages = results;
                      if (processingErrors.length > 0) {
                           setMessages(prev => [...prev, { 
                               id: Date.now().toString() + '_warn', 
                               author: 'model', 
                               text: `Completed with ${processingErrors.length} errors:\n${processingErrors.join("\n")}` 
                           }]);
                      }
                  }
                  setProgressText('');
              } else {
                  responseText = "Please upload an image first.";
              }

          } else if (activeTab === AppTab.IMAGE2TEXT) {
              if (images.length > 0) {
                  let finalPrompt = userMessage.text;
                  
                  if (selectedTemplate === 'biometric') {
                      const userInstruction = userMessage.text ? `User Focus/Question: ${userMessage.text}` : "";
                      finalPrompt = `${BIOMETRIC_RULE}\n\n${userInstruction}\n\nINSTRUCTIONS: Analyze the provided image strictly according to the BIOMETRIC PROMPTING PROTOCOL defined above. Output the result in the exact format of the Reference Example provided in the protocol. Do NOT use the 'Subject:...' placeholder format.`;
                  } else {
                      finalPrompt = finalPrompt || "Describe this image";
                  }

                  // OpenRouter Logic Switch
                  if (selectedEngine !== 'gemini') {
                      if (!config.openRouterKey) {
                          throw new Error("OpenRouter API Key is missing. Please add it in BackRoom settings.");
                      }
                      responseText = await analyzeImageOpenRouter(config.openRouterKey, images[0].base64, finalPrompt, selectedEngine);
                  } else {
                      // Default Gemini
                      responseText = await analyzeImage(images[0].base64, images[0].mimeType, finalPrompt);
                  }
              } else {
                   responseText = "Please upload an image first.";
              }
          }
      }

      if (resultImages.length > 0) {
          const resultMsg: ChatMessage = {
              id: Date.now().toString() + '_res',
              author: 'model',
              images: resultImages
          };
          setMessages(prev => [...prev, resultMsg]);

          let historyItem: any = {
              id: Date.now().toString(),
              type: activeTab,
              timestamp: Date.now(),
              prompt: userMessage.text || 'Image Result',
              results: resultImages,
          };
          
          if (activeTab === AppTab.TEXT2IMAGE) {
              historyItem.numberOfImages = numberOfImages;
              historyItem.aspectRatio = aspectRatio;
              historyItem.model = selectedModel;
          } else if (activeTab === AppTab.IMAGE2IMAGE || activeTab === AppTab.ENCH_UPSCL) {
              historyItem.inputImages = userMessage.images;
          } else if (activeTab === AppTab.IMAGE2TEXT) {
              historyItem.inputImages = userMessage.images;
          }

          addToHistory(historyItem);

      } else if (responseText) {
           setMessages(prev => [...prev, { id: Date.now().toString() + '_res', author: 'model', text: responseText }]);
           if (activeTab === AppTab.IMAGE2TEXT && images.length > 0) {
               addToHistory({
                   id: Date.now().toString(),
                   type: activeTab,
                   timestamp: Date.now(),
                   prompt: userMessage.text || 'Analysis',
                   inputImages: images.map(i => i.url),
                   results: [],
                   engine: selectedEngine,
                   modelOutput: responseText // Capture text response for history export
               } as any);
           }
      }

    } catch (err) {
      Logger.error("Studio", "Workflow failed", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setMessages(prev => [...prev, { id: Date.now().toString() + '_err', author: 'model', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }]);
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  const handleRegenerate = (index: number) => {
      let promptToRun = '';
      for (let i = index - 1; i >= 0; i--) {
          if (messages[i].author === 'user' && messages[i].text) {
              promptToRun = messages[i].text || '';
              break;
          }
      }
      if (promptToRun) {
          handleSendMessage(promptToRun);
      }
  };

  const handleBatchAdd = () => {
      setBatchPrompts([...batchPrompts, '']);
      setBatchImages([...batchImages, null]);
  };
  
  const handleBatchRemove = (index: number) => {
      const newPrompts = [...batchPrompts];
      newPrompts.splice(index, 1);
      setBatchPrompts(newPrompts);
      
      const newImages = [...batchImages];
      newImages.splice(index, 1);
      setBatchImages(newImages);
  };

  const removeBatchImage = (index: number) => {
      const newImages = [...batchImages];
      newImages[index] = null;
      setBatchImages(newImages);
  };

  return (
    <div 
        className="flex flex-col w-full h-full max-w-5xl mx-auto bg-gray-50 dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
      <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div 
            onClick={() => activeTab !== AppTab.TEXT2IMAGE && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center h-full text-gray-400 transition-all duration-300 border-2 border-dashed border-transparent rounded-3xl group ${activeTab !== AppTab.TEXT2IMAGE ? 'cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600' : ''}`}
          >
             <div className="p-6 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:scale-110 transition-transform mb-4">
                 {activeTab === AppTab.FRAME2IMAGE ? <FilmIcon /> : (activeTab === AppTab.IMAGE2TEXT ? <PhotoIcon /> : (activeTab === AppTab.XPRMNT ? <BeakerIcon /> : (activeTab === AppTab.TEXT2IMAGE ? <SparklesIcon /> : <UploadIcon />)))}
             </div>
             <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                {activeTab === AppTab.FRAME2IMAGE 
                    ? 'Click to upload video footage' 
                    : (activeTab === AppTab.TEXT2IMAGE ? 'Ready to generate' : (activeTab === AppTab.XPRMNT ? 'Upload image (optional) & Start' : 'Click to upload image(s)'))}
             </p>
             {activeTab !== AppTab.TEXT2IMAGE && (
                 <p className="text-sm text-gray-400 mt-2">or drag & drop anywhere</p>
             )}
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <ChatMessageComponent 
            key={msg.id} 
            author={msg.author} 
            text={msg.text} 
            images={msg.images}
            onImageAction={handleImageAction}
            onRegenerate={(activeTab === AppTab.TEXT2IMAGE && msg.author === 'model' && msg.images?.length) ? () => handleRegenerate(idx) : undefined}
          />
        ))}
        
        {isLoading && (
           <ChatMessageComponent author="model" isLoading />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
          <div className="px-6 pb-2">
            <ErrorAlert message={error} />
          </div>
      )}

      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        {(activeTab === AppTab.TEXT2IMAGE || activeTab === AppTab.IMAGE2TEXT || activeTab === AppTab.IMAGE2IMAGE || (activeTab === AppTab.IMAGE2IMAGE && selectedModel === 'sd-external')) && (
             <div className="flex flex-wrap items-center justify-between gap-2 mb-4 w-full">
                
                {/* COMBINED TOOLBAR: Wrapped in single flex container for better density */}
                <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 w-full justify-between">
                    
                    {/* Left Side: Templates / Modes */}
                    <div className="flex items-center gap-2 flex-wrap justify-start">
                        {/* PROMPT TEMPLATE */}
                        {activeTab !== AppTab.IMAGE2IMAGE && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase tracking-wider hidden sm:inline">{t.promptTemplate}:</span>
                                <select 
                                    value={selectedTemplate}
                                    onChange={handleTemplateChange}
                                    className="bg-transparent text-xs font-medium text-gray-900 dark:text-white focus:outline-none py-1 pr-2 cursor-pointer max-w-[120px] truncate"
                                >
                                    <option value="standard" className="text-black">{t.templates.standard}</option>
                                    <option value="biometric" className="text-black">{t.templates.biometric}</option>
                                    <option value="global" className="text-black">{t.templates.global}</option>
                                    <option value="setSetting" className="text-black">{t.templates.setSetting}</option>
                                </select>
                            </div>
                        )}

                        {/* BATCH MODE TOGGLE */}
                        {(activeTab === AppTab.TEXT2IMAGE || activeTab === AppTab.IMAGE2TEXT) && (
                            <button 
                                onClick={() => setIsBatchMode(!isBatchMode)}
                                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors border ${isBatchMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                            >
                                Batch Mode
                            </button>
                        )}

                        {/* ENGINE SELECTOR FOR IMAGE2TEXT */}
                        {activeTab === AppTab.IMAGE2TEXT && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 ring-1 ring-indigo-500/30 border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 px-1 uppercase tracking-wider hidden sm:inline">Engine:</span>
                                <select 
                                    value={selectedEngine}
                                    onChange={(e) => setSelectedEngine(e.target.value)}
                                    className="bg-transparent text-xs font-medium text-gray-900 dark:text-white focus:outline-none py-1 pr-2 cursor-pointer max-w-[140px] truncate"
                                >
                                    {analysisEngines.map(e => (
                                        <option key={e.value} value={e.value} className="text-black">{e.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* POSE COPY TOGGLE FOR IMAGE2IMAGE */}
                        {activeTab === AppTab.IMAGE2IMAGE && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setShowPoseUpload(!showPoseUpload)}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all border ${showPoseUpload ? 'bg-pink-500 text-white shadow-lg border-pink-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                                    title="Copy Pose from Reference Image"
                                >
                                    <BodyPoseIcon className="w-3 h-3" />
                                    {showPoseUpload ? 'Pose Active' : 'Copy Pose'}
                                </button>
                                
                                {/* Pose Engine Selector (visible when active) */}
                                {showPoseUpload && (
                                    <div className="flex items-center gap-1 bg-pink-50 dark:bg-pink-900/20 rounded-lg p-1 ring-1 ring-pink-500/30">
                                        <span className="text-[9px] font-bold text-pink-500 px-1 hidden sm:inline">ENGINE:</span>
                                        <select 
                                            value={selectedEngine}
                                            onChange={(e) => setSelectedEngine(e.target.value)}
                                            className="bg-transparent text-[9px] font-medium text-gray-900 dark:text-white focus:outline-none cursor-pointer max-w-[70px] truncate"
                                        >
                                            <option value="gemini">Gemini</option>
                                            {analysisEngines.filter(e => e.value !== 'gemini').map(e => (
                                                <option key={e.value} value={e.value}>{e.label.split(' ')[1]}</option> 
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Model / AR / Count */}
                    {(activeTab === AppTab.TEXT2IMAGE || (activeTab === AppTab.IMAGE2IMAGE && selectedModel === 'sd-external')) && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase tracking-wider hidden sm:inline">{t.model}:</span>
                                <select 
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="bg-transparent text-xs font-medium text-gray-900 dark:text-white focus:outline-none py-1 pr-2 cursor-pointer max-w-[120px] truncate"
                                >
                                    {models.map(m => (
                                        <option key={m.value} value={m.value} className="text-black">{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase tracking-wider hidden sm:inline">{t.aspectRatio}:</span>
                                <select 
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="bg-transparent text-xs font-medium text-gray-900 dark:text-white focus:outline-none py-1 pr-2 cursor-pointer"
                                >
                                    {aspectRatios.map(r => (
                                        <option key={r} value={r} className="text-black">{r}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedModel !== 'sd-external' && (
                                 <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase tracking-wider hidden sm:inline">Count:</span>
                                    <select 
                                        value={numberOfImages}
                                        onChange={(e) => setNumberOfImages(Number(e.target.value))}
                                        className="bg-transparent text-xs font-medium text-gray-900 dark:text-white focus:outline-none py-1 pr-2 cursor-pointer"
                                    >
                                        {imageCounts.map(c => (
                                            <option key={c} value={c} className="text-black">{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
             </div>
        )}

        <div className="space-y-4">
           
           {/* POSE REFERENCE UPLOAD AREA (Image2Image) */}
           {activeTab === AppTab.IMAGE2IMAGE && showPoseUpload && !isBatchMode && (
               <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800 rounded-xl animate-fadeIn">
                   <div className="flex-shrink-0">
                       {poseImage ? (
                           <div className="relative w-16 h-16 group">
                               <img src={poseImage.url} alt="Pose Ref" className="w-16 h-16 rounded-lg object-cover border border-pink-300 dark:border-pink-700" />
                               <button 
                                    onClick={() => { setPoseImage(null); poseInputRef.current!.value = ''; }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                   <XMarkIcon className="w-3 h-3" />
                               </button>
                           </div>
                       ) : (
                           <button 
                                onClick={() => poseInputRef.current?.click()}
                                className="w-16 h-16 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-pink-300 dark:border-pink-700 flex flex-col items-center justify-center text-pink-400 hover:text-pink-500 hover:border-pink-500 transition-all"
                           >
                               <PlusIcon />
                               <span className="text-[8px] font-bold uppercase mt-1">Pose Ref</span>
                           </button>
                       )}
                       <input 
                            type="file" 
                            ref={poseInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handlePoseUpload} 
                       />
                   </div>
                   <div className="text-xs text-pink-700 dark:text-pink-300">
                       <strong>Pose Reference:</strong> Upload an image to copy its pose structure. <br/>
                       <span className="opacity-70">AI will analyze the skeleton/posture and apply it to your target.</span>
                   </div>
               </div>
           )}

           {isBatchMode ? (
               <div className="flex flex-col gap-3">
                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                       {batchPrompts.map((prompt, idx) => (
                           <div key={idx} className="flex gap-2 items-center">
                            
                           {/* Image Attachment Slot for IMAGE2TEXT Batch */}
                           {activeTab === AppTab.IMAGE2TEXT && (
                               <div className="flex-shrink-0">
                                   {batchImages[idx] ? (
                                       <div className="relative w-10 h-10 group/img">
                                           <img src={batchImages[idx]!.url} alt="batch thumb" className="w-10 h-10 rounded-lg object-cover border border-gray-300 dark:border-gray-600" />
                                           <button 
                                                onClick={() => removeBatchImage(idx)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover/img:opacity-100 transition-opacity"
                                           >
                                               <XMarkIcon className="w-3 h-3" />
                                           </button>
                                       </div>
                                   ) : (
                                       <>
                                           <button 
                                                onClick={() => document.getElementById(`batch-upload-${idx}`)?.click()}
                                                className="w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center text-gray-500 transition-colors"
                                                title="Upload Image"
                                           >
                                               <PlusIcon />
                                           </button>
                                           <input 
                                                id={`batch-upload-${idx}`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files) handleBatchImageUpload(idx, Array.from(e.target.files) as File[]);
                                                    e.target.value = '';
                                                }}
                                           />
                                       </>
                                   )}
                               </div>
                           )}

                           <div className="relative flex-grow">
                                <input 
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => handleBatchChange(idx, e.target.value)}
                                        placeholder={activeTab === AppTab.IMAGE2TEXT ? `Ask about image ${idx + 1} (optional)` : `Batch Prompt ${idx + 1}`}
                                        className="w-full px-4 py-2 pr-10 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-0"
                                />
                                {hasSupport && (
                                    <button
                                        onClick={() => toggleBatchListening(idx)}
                                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-all ${isListening && listeningBatchIndex === idx ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                        title="Dictate"
                                    >
                                        {isListening && listeningBatchIndex === idx ? <StopCircleIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
                                    </button>
                                )}
                           </div>
                           {batchPrompts.length > 1 && (
                               <button onClick={() => handleBatchRemove(idx)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><TrashIcon /></button>
                           )}
                       </div>
                   ))}
                   </div>

                   <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                       <button onClick={handleBatchAdd} className="text-sm text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                           <PlusIcon /> Add Row
                       </button>
                       <button 
                            onClick={() => handleSendMessage()}
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowTrendingUpIcon /> Run Batch
                       </button>
                   </div>
               </div>
           ) : (
                <div className="flex flex-col gap-2">
                    {/* Style Presets - Visible only for Ench&Upscl */}
                    {activeTab === AppTab.ENCH_UPSCL && !isBatchMode && (
                        <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
                            {STYLE_PRESETS.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInputText(preset.prompt)}
                                    className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all shadow-sm"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {/* Image Preview Strip */}
                    {images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative group flex-shrink-0">
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        <img src={img.url} alt={`Selected ${idx}`} className="h-16 w-16 object-cover" />
                                        <button 
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative flex items-end gap-2 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-inner border border-gray-200 dark:border-gray-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                         {/* Attachment Button Logic Split for Clarity */}
                        {activeTab === AppTab.FRAME2IMAGE && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 mb-1 text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Upload Video"
                            >
                                <VideoPlusIcon className="w-5 h-5" />
                            </button>
                        )}

                        {activeTab !== AppTab.TEXT2IMAGE && activeTab !== AppTab.FRAME2IMAGE && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 mb-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Attach files"
                            >
                                <PaperClipIcon />
                            </button>
                        )}
                        
                        {/* Shared File Input */}
                        {activeTab !== AppTab.TEXT2IMAGE && (
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleInputChange} 
                                multiple={activeTab === AppTab.IMAGE2IMAGE || activeTab === AppTab.ENCH_UPSCL} 
                                accept={activeTab === AppTab.FRAME2IMAGE ? "video/*" : "image/*"} 
                            />
                        )}

                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={t.chatPlaceholder}
                            className="flex-grow bg-transparent border-none focus:ring-0 p-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[44px]"
                        />
                        
                        <div className="flex items-center gap-1 pb-1">
                            {hasSupport && (
                                <button
                                    onClick={toggleMainListening}
                                    className={`p-2 rounded-lg transition-all ${
                                        speechError 
                                        ? 'text-red-500 bg-red-100 dark:bg-red-900/30' 
                                        : isListening && !isBatchMode 
                                            ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' 
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    title={speechError ? "Microphone access denied. Click to retry." : "Dictate prompt"}
                                >
                                    {speechError ? <ExclamationTriangleIcon className="w-5 h-5" /> : (isListening && !isBatchMode ? <StopCircleIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />)}
                                </button>
                            )}
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={(!inputText.trim() && images.length === 0) || isLoading}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                <ArrowTrendingUpIcon />
                            </button>
                        </div>
                    </div>
                </div>
           )}

            {progressText && (
                <div className="flex justify-start items-center gap-2 text-xs text-indigo-500 font-medium animate-pulse">
                    <SparklesIcon /> {progressText}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Studio;
