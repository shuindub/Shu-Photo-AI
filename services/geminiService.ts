
import { GoogleGenAI, Modality, Chat, FunctionDeclaration, HarmCategory, HarmBlockThreshold } from "@google/genai";

const getGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable not set");
    // Return a dummy object or throw a specific error that UI can catch gracefully
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
        console.error("Failed to create chat session:", e);
        throw e; // Re-throw to be caught by UI components
    }
};

export const generateImage = async (prompt: string, numberOfImages: number, aspectRatio: string, model: string = 'imagen-4.0-generate-001'): Promise<string[]> => {
  const ai = getGenAI();

  if (model.includes('gemini')) { 
    // Handle Gemini models (Nano Banana and Banana Pro)
    // Parallelize requests to support multiple images
    const promises = [];
    
    for (let i = 0; i < numberOfImages; i++) {
        const config: any = {
             responseModalities: [Modality.IMAGE],
        };
        
        let finalPrompt = prompt;
        
        // Model-specific config logic
        if (model === 'gemini-3-pro-image-preview') {
            config.imageConfig = { 
                aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio, // Ensure valid enum if needed
                imageSize: '1K'
            }; 
        } else if (model === 'gemini-2.5-flash-image') {
             // Flash image doesn't support imageConfig for AR in the same way, inject into prompt
             if (aspectRatio && aspectRatio !== '1:1') {
                 finalPrompt = `${prompt}. Aspect ratio: ${aspectRatio}`;
             }
        }

        promises.push(ai.models.generateContent({
            model,
            contents: { parts: [{ text: finalPrompt }] },
            config
        }));
    }

    const responses = await Promise.all(promises);
    const images: string[] = [];
    
    responses.forEach(response => {
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                }
            }
        }
    });
    return images;

  } else {
    // Imagen 3/4 logic
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages,
        outputMimeType: 'image/jpeg',
        aspectRatio,
      },
    });

    return response.generatedImages.map(image => `data:image/jpeg;base64,${image.image.imageBytes}`);
  }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getGenAI();
  
  // Fallback Strategy: "Double Tap"
  // 1. Try with safetySettings (BLOCK_NONE) to bypass censorship
  // 2. If incompatible (IMAGE_OTHER), try without config
  
  const runEdit = async (useSafety: boolean) => {
      const config: any = {
          responseModalities: [Modality.IMAGE],
      };
      if (useSafety) {
          config.safetySettings = SAFETY_SETTINGS;
      }

      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            { text: prompt },
          ],
        },
        config,
      });
  };

  let response;
  try {
      // Attempt 1: With Safety Settings (Aggressive)
      response = await runEdit(true);
  } catch (e: any) {
      console.warn("Edit Attempt 1 failed, retrying without safety settings:", e.message);
      // Attempt 2: Clean (Compatible)
      response = await runEdit(false);
  }

  if (response.promptFeedback?.blockReason) {
    throw new Error(`Request was blocked due to: ${response.promptFeedback.blockReason}`);
  }

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidate response received from the model.");
  }

  // Check for non-stop finish reasons which indicate a problem.
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`Image editing failed. Reason: ${candidate.finishReason}. ${candidate.finishMessage || ''}`);
  }

  // Find the part that contains the image data, as the order isn't guaranteed.
  const imagePart = candidate.content?.parts?.find(part => part.inlineData);

  if (imagePart?.inlineData) {
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }
  
  // Log the response for debugging if no image is found
  console.error("Gemini API response did not contain an image:", response);
  throw new Error("Failed to edit image or no image was returned.");
};


export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
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
    }
  });

  return response.text || "No analysis provided.";
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore', customVoiceBase64?: string): Promise<string> => {
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
      throw new Error("No audio data returned from the model.");
  }
  return base64Audio;
};
