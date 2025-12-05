
import { FunctionDeclaration, Type } from '@google/genai';

export const generateImageTool: FunctionDeclaration = {
  name: 'generateImage',
  description: 'Generates images based on a user\'s text prompt. Use this when the user explicitly asks to generate, create, or make a new image.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed text description of the image to generate.',
      },
      numberOfImages: {
        type: Type.INTEGER,
        description: 'The number of images to generate. Must be between 1 and 4. Defaults to 1 if not specified.',
      },
      aspectRatio: {
        type: Type.STRING,
        description: 'The aspect ratio for the generated images. Supported values are "1:1", "16:9", "9:16", "4:3", "3:4". Defaults to "1:1" if not specified.',
      },
      model: {
        type: Type.STRING,
        description: 'The model to use for generation. Options are "imagen-4.0-generate-001" or "gemini-2.5-flash-image".',
      },
    },
    required: ['prompt', 'model'],
  },
};

export const editImageTool: FunctionDeclaration = {
  name: 'editImage',
  description: 'Edits a previously uploaded image based on a user\'s text prompt. Use this when the user asks to change, modify, or edit the image they provided.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed text description of the edits to apply to the image.',
      },
    },
    required: ['prompt'],
  },
};

export const analyzeImageTool: FunctionDeclaration = {
  name: 'analyzeImage',
  description: 'Analyzes a previously uploaded image and answers a user\'s question about it. Use this when the user asks a question about the provided image, such as "what is this?" or "describe this picture".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'The user\'s question or prompt about the image.',
      },
    },
    required: ['prompt'],
  },
};
