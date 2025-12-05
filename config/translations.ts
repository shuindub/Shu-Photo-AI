
import { Language } from '../types';

export const translations = {
  en: {
    title: "Shu Photo ∆I",
    subtitle: "Generate, edit, and analyze images with the power of AI.",
    history: "History",
    uploadVideo: "Upload video footage",
    uploadImage: "Upload image(s) to",
    orDragDrop: "or drag & drop / paste from clipboard",
    send: "Send",
    processing: "Processing...",
    model: "Model",
    aspectRatio: "Aspect Ratio",
    promptTemplate: "Prompt Mode",
    chatPlaceholder: "Chat with Banana...",
    tabs: {
      text2image: "text2image",
      image2image: "image2image",
      image2text: "image2text",
      enchUpscl: "ench&upscl",
      frame2image: "frame2image"
    },
    templates: {
      standard: "Standard",
      biometric: "Biometric (Subject/Object)",
      global: "Global (Subject+Set+Setting)",
      setSetting: "Set & Setting"
    }
  },
  ru: {
    title: "Shu Photo ∆I",
    subtitle: "Генерация, фрейминг, биометрический промтинг, апскейл, пакетные операции",
    history: "История",
    uploadVideo: "Загрузить видео футаж",
    uploadImage: "Загрузить изображения в",
    orDragDrop: "или перетащите / вставьте из буфера",
    send: "Отправить",
    processing: "Обработка...",
    model: "Модель",
    aspectRatio: "Соотношение",
    promptTemplate: "Тип промта",
    chatPlaceholder: "Чат с Бананом...",
    tabs: {
      text2image: "text2image",
      image2image: "image2image",
      image2text: "image2text",
      enchUpscl: "ench&upscl",
      frame2image: "frame2image"
    },
    templates: {
      standard: "стандартный",
      biometric: "биометрический (субъект/объект)",
      global: "глобальный (субъект/объект+сэт+сэттинг)",
      setSetting: "сэт & сэттинг"
    }
  }
};

export const getTranslation = (lang: Language) => translations[lang];