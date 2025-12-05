
import { AppTab, BackRoomConfig } from '../types';

export const defaultBackRoomConfig: BackRoomConfig = {
  systemInstructions: {
    [AppTab.TEXT2IMAGE]: "You are a creative assistant. Your primary function is to generate images based on user prompts. You can also help users brainstorm ideas for prompts. When the user asks you to generate an image, you must call the `generateImage` tool with a detailed prompt.",
    [AppTab.IMAGE2IMAGE]: "You are an expert image editing assistant. The user will upload an image and ask for modifications. When the user asks you to edit the image, you must call the `editImage` tool. You can see the image the user has uploaded.",
    [AppTab.IMAGE2TEXT]: "You are a world-class image analysis expert. The user will upload an image and ask questions about it. You must use the `analyzeImage` tool to answer their questions. You can see the image the user has uploaded.",
    [AppTab.ENCH_UPSCL]: "You are an expert image restoration and enhancement specialist. Your goal is to improve the quality, resolution, and details of images uploaded by the user. Use the `editImage` tool to apply enhancements. Interpret user requests as instructions to upscale, denoise, sharpen, and refine the image."
  },
  glossary: `
Common Terms:
- Latent Space: A compressed representation of data.
- Upscaling: Increasing the resolution of an image.
- Inpainting: Restoring missing parts of an image.
  `.trim(),
  openRouterKey: '',
  sdApiUrl: '',
  iconTheme: 'cyberpunk'
};
