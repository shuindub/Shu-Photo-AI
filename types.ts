
export enum AppTab {
  TEXT2IMAGE = 'text2image',
  IMAGE2IMAGE = 'image2image',
  IMAGE2TEXT = 'image2text',
  FRAME2IMAGE = 'frame2image',
  ENCH_UPSCL = 'ench&upscl',
}

export interface ImageData {
  file: File;
  url: string;
  base64: string;
  mimeType: string;
}

// Internal History Item (App State)
export interface HistoryItemBase {
  id: string;
  type: AppTab;
  timestamp: number;
  prompt: string;
  modelOutput?: string; // Added to store text responses
}

export interface HistoryItemText2Image extends HistoryItemBase {
  type: AppTab.TEXT2IMAGE;
  results: string[];
  numberOfImages: number;
  aspectRatio: string;
  model?: string;
}

export interface HistoryItemImage2Image extends HistoryItemBase {
  type: AppTab.IMAGE2IMAGE;
  inputImages: string[];
  results: string[];
  aspectRatio: string;
}

export interface HistoryItemImage2Text extends HistoryItemBase {
  type: AppTab.IMAGE2TEXT;
  inputImages: string[];
  results: string[];
  engine?: string;
  modelOutput?: string; // Explicitly included for analysis results
}

export interface HistoryItemFrame2Image extends HistoryItemBase {
  type: AppTab.FRAME2IMAGE;
  videoName: string;
  results: string[];
}

export interface HistoryItemEnchUpscl extends HistoryItemBase {
  type: AppTab.ENCH_UPSCL;
  inputImages: string[];
  results: string[];
}

export type HistoryItem = HistoryItemText2Image | HistoryItemImage2Image | HistoryItemImage2Text | HistoryItemFrame2Image | HistoryItemEnchUpscl;

// Export Format (Requested Structure)
export interface HistoryStep {
  step: number;
  timestamp: string;
  userInput: string;
  modelOutput: string;
  imageInputs?: string[];
  imageOutputs?: string[];
}

export interface LoadingStates {
  [AppTab.TEXT2IMAGE]: boolean;
  [AppTab.IMAGE2IMAGE]: boolean;
  [AppTab.IMAGE2TEXT]: boolean;
  [AppTab.FRAME2IMAGE]: boolean;
  [AppTab.ENCH_UPSCL]: boolean;
}

export interface ChatMessage {
  id: string;
  author: 'user' | 'model';
  text?: string;
  images?: string[];
  isLoading?: boolean;
}

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ru';
export type IconTheme = 'cyberpunk' | 'minimal' | 'standard';

export interface BackRoomConfig {
  systemInstructions: {
    [key in AppTab]?: string;
  };
  glossary: string;
  openRouterKey?: string;
  sdApiUrl?: string;
  iconTheme: IconTheme;
}

export interface HandoffData {
    image: ImageData;
    targetTab: AppTab;
}

export interface LindaConfig {
  name: string;
  description: string;
  instructions: string;
  voiceName?: string;
  customVoiceBase64?: string;
}

export interface MiniMessage {
  role: 'user' | 'model';
  text: string;
  images?: string[]; // Added to support image rendering in ChatWidget
  sources?: { uri: string; title: string }[];
}
