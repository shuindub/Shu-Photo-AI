
export const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const compressImage = async (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        
        reader.onerror = (err) => reject(err);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxWidth) {
                if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Always convert to JPEG for consistency and compression
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, mimeType: 'image/jpeg' });
        };
        
        reader.readAsDataURL(file);
    });
};

export const extractFramesFromVideo = (videoFile: File, numberOfFrames: number = 12): Promise<string[]> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Spread frames evenly across the video duration
      const step = duration / (numberOfFrames + 1);

      for (let i = 1; i <= numberOfFrames; i++) {
        const time = step * i;
        video.currentTime = time;
        await new Promise<void>((seekResolve) => {
          video.onseeked = () => seekResolve();
        });
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.85));
        }
      }
      
      URL.revokeObjectURL(objectUrl);
      resolve(frames);
    };
    
    video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve([]); 
    }
  });
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const urlToFile = async (url: string, filename: string, mimeType?: string): Promise<File> => {
  if (url.startsWith('data:')) {
      return dataURLtoFile(url, filename);
  }
  
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType || blob.type });
};
