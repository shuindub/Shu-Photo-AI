
import { GoogleGenAI, Modality, Chat, FunctionDeclaration, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Logger } from "../utils/logger";

const getGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    Logger.error("GeminiService", "API_KEY environment variable not set");
    throw new Error("Gemini API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const createChatSession = (systemInstruction: string, tools: FunctionDeclaration[], enableGoogleSearch: boolean = false): Chat => {
    try {
        Logger.info("GeminiService", "Creating new Chat Session", { toolsCount: tools.length, enableGoogleSearch });
        const ai = getGenAI();
        
        // Dynamic config construction
        const config: any = {
            systemInstruction,
            safetySettings: SAFETY_SETTINGS,
        };

        const toolList: any[] = [];

        if (tools && tools.length > 0) {
            toolList.push({ functionDeclarations: tools });
        }
        
        if (enableGoogleSearch) {
            toolList.push({ googleSearch: {} });
        }

        if (toolList.length > 0) {
            config.tools = toolList;
        }

        return ai.chats.create({
            model: 'gemini-2.5-flash',
            config,
        });
    } catch (e) {
        Logger.error("GeminiService", "Failed to create chat session", e);
        throw e; // Re-throw to be caught by UI components
    }
};

export const generateImage = async (prompt: string, numberOfImages: number, aspectRatio: string, model: string = 'imagen-4.0-generate-001'): Promise<string[]> => {
  Logger.info("GeminiService", `Generating images with ${model}`, { prompt, numberOfImages, aspectRatio });
  const ai = getGenAI();

  if (model.includes('gemini')) { 
    // Handle Gemini models (Nano Banana and Banana Pro)
    // Parallelize requests to support multiple images
    const promises = [];
    
    for (let i = 0; i < numberOfImages; i++) {
        const config: any = {};
        let finalPrompt = prompt;
        
        // Model-specific config logic
        if (model === 'gemini-3-pro-image-preview') {
            config.imageConfig = { 
                aspectRatio: aspectRatio, 
                imageSize: '1K'
            }; 
        } else if (model === 'gemini-2.5-flash-image') {
             // Flash image configuration
             config.responseModalities = [Modality.IMAGE];
             // Flash image doesn't support imageConfig for AR in the same way, inject into prompt
             if (aspectRatio && aspectRatio !== '1:1') {
                 finalPrompt = `${prompt}. Aspect ratio: ${aspectRatio}`;
             }
        }

        // Catch individual errors to prevent Promise.all from failing completely if one request fails
        promises.push(
            ai.models.generateContent({
                model,
                contents: { parts: [{ text: finalPrompt }] },
                config
            }).catch(e => {
                Logger.error("GeminiService", `Parallel request ${i+1} failed`, e);
                return null;
            })
        );
    }

    const responses = await Promise.all(promises);
    const images: string[] = [];
    
    responses.forEach(response => {
        if (!response) return; // Skip failed requests

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                }
            }
        } else {
            Logger.warn("GeminiService", "Response received but contained no image content", response);
        }
    });

    if (images.length === 0) {
        throw new Error("Failed to generate any images from the model.");
    }

    Logger.success("GeminiService", `Successfully generated ${images.length} images`);
    return images;

  } else {
    // Imagen 3/4 logic
    try {
        const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
            numberOfImages,
            outputMimeType: 'image/jpeg',
            aspectRatio,
        },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            Logger.warn("GeminiService", "Imagen returned no images", response);
            return [];
        }

        Logger.success("GeminiService", `Imagen generated ${response.generatedImages.length} images`);
        return response.generatedImages.map(image => `data:image/jpeg;base64,${image.image.imageBytes}`);
    } catch (e: any) {
        Logger.error("GeminiService", "Imagen generation failed", e);
        throw new Error(`Imagen Error: ${e.message}`);
    }
  }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  Logger.info("GeminiService", "Editing image", { promptLength: prompt.length, mimeType });
  const ai = getGenAI();
  
  // Helper to run the edit request and validate output immediately
  const runEdit = async (configOverride: any) => {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        config: configOverride,
      });

      const candidate = result.candidates?.[0];
      if (!candidate) throw new Error("No candidate returned");

      if (result.promptFeedback?.blockReason) {
         throw new Error(`Blocked by safety filter: ${result.promptFeedback.blockReason}`);
      }

      // If we have an image, we are good
      const imagePart = candidate.content?.parts?.find(part => part.inlineData);
      if (imagePart) return result;

      // If no image, check finish reason to determine if we should retry
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          throw new Error(`Finish Reason: ${candidate.finishReason}`);
      }

      return result;
  };

  let response;
  const errors: string[] = [];

  // Attempt 1: Standard Safety + Image Modality
  try {
      response = await runEdit({
          responseModalities: [Modality.IMAGE],
          safetySettings: SAFETY_SETTINGS
      });
  } catch (e: any) {
      errors.push(`Attempt 1: ${e.message}`);
      
      // Attempt 2: Clean Config (No forced modality, no explicit safety settings)
      // This often bypasses 'IMAGE_OTHER' or 'MODALITY' errors by allowing the model to default
      try {
          Logger.warn("GeminiService", "Edit Attempt 1 failed, retrying with clean config...", e.message);
          response = await runEdit({});
      } catch (e2: any) {
          errors.push(`Attempt 2: ${e2.message}`);
          Logger.error("GeminiService", "All edit attempts failed", errors);
          throw new Error(`Image editing failed. The model refused to generate the image.`);
      }
  }

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(part => part.inlineData);

  if (imagePart?.inlineData) {
    Logger.success("GeminiService", "Image edit successful");
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }
  
  // Fallback: Check if model returned text explaining refusal
  const textPart = candidate?.content?.parts?.find(part => part.text);
  if (textPart?.text) {
      Logger.warn("GeminiService", "Model returned text instead of image", textPart.text);
      throw new Error(`Model returned text instead of image: "${textPart.text.substring(0, 150)}..."`);
  }

  throw new Error("Failed to edit image or no image was returned.");
};


export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  Logger.info("GeminiService", "Analyzing image", { prompt });
  const ai = getGenAI();
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Image,
    },
  };
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
        safetySettings: SAFETY_SETTINGS,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking to ensure maxOutputTokens are used for response, not thinking
    }
  });

  const resultText = response.text || "No analysis provided.";
  Logger.success("GeminiService", "Analysis complete", { resultLength: resultText.length });
  return resultText;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore', customVoiceBase64?: string): Promise<string> => {
  Logger.info("GeminiService", "Generating speech", { voiceName, textLength: text.length });
  const ai = getGenAI();
  
  let speechConfig: any = {};

  if (customVoiceBase64) {
      speechConfig = {
          voiceConfig: {
              voiceClone: {
                  voiceCloneContent: {
                      audioContent: customVoiceBase64
                  }
              }
          }
      };
  } else {
      speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
      };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig,
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
      Logger.error("GeminiService", "No audio returned from TTS");
      throw new Error("No audio data returned from the model.");
  }
  return base64Audio;
};
