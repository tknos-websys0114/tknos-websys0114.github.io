/**
 * 图片压缩工具
 * 用于压缩用户上传的图片到合适的尺寸
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.85,
  mimeType: 'image/jpeg'
};

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }

          // 计算缩放后的尺寸
          let { width, height } = img;
          const maxWidth = opts.maxWidth!;
          const maxHeight = opts.maxHeight!;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('图片压缩失败'));
              }
            },
            opts.mimeType,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 压缩头像图片（固定尺寸）
 * @param file 原始图片文件
 * @returns 压缩后的Blob
 */
export async function compressAvatarImage(file: File): Promise<Blob> {
  return compressImage(file, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.9,
    mimeType: 'image/jpeg'
  });
}

/**
 * 压缩背景图片（较大尺寸）
 * @param file 原始图片文件
 * @returns 压缩后的Blob
 */
export async function compressBackgroundImage(file: File): Promise<Blob> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.9,
    mimeType: 'image/jpeg'
  });
}

/**
 * 将Blob转换为base64字符串
 * @param blob Blob对象
 * @returns base64字符串
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 将base64字符串转换为Blob
 * @param base64 base64字符串
 * @returns Blob对象
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], { type: contentType });
}

/**
 * 压缩图片并返回base64字符串
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns base64字符串
 */
export async function compressImageToBase64(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const compressedBlob = await compressImage(file, options);
  return blobToBase64(compressedBlob);
}