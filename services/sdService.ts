
export interface SDGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler_name?: string;
  batch_size?: number;
  init_images?: string[]; // For img2img (base64)
  denoising_strength?: number; // For img2img
}

export const generateImageSD = async (
  apiUrl: string,
  params: SDGenerationParams
): Promise<string[]> => {
  if (!apiUrl) throw new Error("SD API URL is missing");
  
  // Clean URL trailing slash
  const cleanUrl = apiUrl.replace(/\/$/, "");
  
  const isImg2Img = params.init_images && params.init_images.length > 0;
  const endpoint = isImg2Img ? `${cleanUrl}/sdapi/v1/img2img` : `${cleanUrl}/sdapi/v1/txt2img`;

  // Default parameters compatible with SDXL
  const payload = {
    prompt: params.prompt,
    negative_prompt: params.negative_prompt || "ugly, deformed, noisy, blurry, distorted, low quality",
    steps: params.steps || 30,
    cfg_scale: params.cfg_scale || 7,
    width: params.width || 1024,
    height: params.height || 1024,
    sampler_name: params.sampler_name || "DPM++ 2M Karras",
    batch_size: params.batch_size || 1,
    // Img2Img specific
    ...(isImg2Img && {
      init_images: params.init_images,
      denoising_strength: params.denoising_strength || 0.75,
    })
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" // Needed if using ngrok free tier
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`SD API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (!data.images || data.images.length === 0) {
        throw new Error("No images returned from SD API");
    }

    return data.images.map((img: string) => `data:image/png;base64,${img}`);

  } catch (error) {
    console.error("Stable Diffusion Request Failed:", error);
    throw error;
  }
};
