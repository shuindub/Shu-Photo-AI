
import { fileToBase64 } from '../utils/fileUtils';

const DEFAULT_API_ENDPOINT = "https://YOUR_EXTERNAL_ENDPOINT/api/transform";

export interface TransformResult {
  ok: boolean;
  image_url?: string;
  error?: string;
}

const isPlaceholder = (url: string) => url.includes("YOUR_EXTERNAL_ENDPOINT");

// Helper to simulate processing by modifying the image visually
const processMockImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                // Draw original
                ctx.drawImage(img, 0, 0);
                
                // Apply "Processing" effect (Negative + Sepia mix to look "analyzed")
                // Using composite operations to simulate a complex transform
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(255, 0, 128, 0.2)'; // Pink tint
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Add Mock Watermark
                ctx.font = `bold ${Math.max(24, canvas.width / 15)}px monospace`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText('[ MOCK RESULT ]', canvas.width / 2, canvas.height / 2);
                
                ctx.font = `bold ${Math.max(12, canvas.width / 30)}px monospace`;
                ctx.fillText('Connect Backend to Remove Clothes', canvas.width / 2, canvas.height / 2 + (canvas.height / 10));
            }
            
            resolve(canvas.toDataURL('image/jpeg', 0.8));
            URL.revokeObjectURL(url);
        };
        
        img.onerror = () => {
            resolve(url); // Fallback to original
        };
        
        img.src = url;
    });
};

export const transformSingle = async (file: File, endpoint?: string, forceMock: boolean = false): Promise<string> => {
  const url = endpoint || DEFAULT_API_ENDPOINT;
  const form = new FormData();
  form.append("files[]", file);

  // MOCK MODE: If URL is default placeholder OR forceMock is true
  if (isPlaceholder(url) || forceMock) {
      console.warn("TransformService: Using Mock Mode", { url, forceMock });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency
      
      // Process image to show it's a mock result
      return await processMockImage(file);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const result = data.results?.[0];

    if (!result?.ok) {
        throw new Error(result?.error || "Processing failed");
    }

    return result.image_url;
  } catch (e: any) {
    console.error("Transform Single Error:", e);
    // Propagate the actual network error so UI can handle it
    throw e;
  }
};

export const transformBatch = async (files: File[], endpoint?: string, forceMock: boolean = false): Promise<TransformResult[]> => {
  const url = endpoint || DEFAULT_API_ENDPOINT;
  const form = new FormData();
  files.slice(0, 5).forEach(f => form.append("files[]", f));

  // MOCK MODE
  if (isPlaceholder(url) || forceMock) {
      console.warn("TransformService: Using Mock Mode", { url, forceMock });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = await Promise.all(files.map(async (file) => {
          const processedImage = await processMockImage(file);
          return {
              ok: true,
              image_url: processedImage
          };
      }));
      return results;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
         throw new Error(`Batch failed: ${res.status}`);
    }

    const data = await res.json();
    return data.results || [];
  } catch (e: any) {
    console.error("Transform Batch Error:", e);
    throw e;
  }
};
