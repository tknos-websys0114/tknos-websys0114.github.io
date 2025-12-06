/**
 * 图片识别公共模块
 * 
 * 提供图片识别功能，可被所有模块的 prompt builder 使用
 */

export interface ImageRecognitionConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  imageBase64: string;
  customPrompt?: string; // 自定义识别 prompt
}

export interface ImageRecognitionResult {
  description: string;
  success: boolean;
  error?: string;
}

/**
 * 默认的图片识别 prompt
 */
const DEFAULT_RECOGNITION_PROMPT = '请详细描述这张图片的内容，包括主要物体、颜色、光线、背景等。用简洁的中文回答，不要超过100字。';

/**
 * 调用 AI 识别图片
 * 
 * @param config 识别配置
 * @returns 识别结果
 */
export async function recognizeImage(config: ImageRecognitionConfig): Promise<ImageRecognitionResult> {
  try {
    console.log('[ImageRecognition] 开始识别图片...');
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: config.customPrompt || DEFAULT_RECOGNITION_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: config.imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`图片识别 API 失败 (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const description = data.choices?.[0]?.message?.content;
    
    if (!description) {
      throw new Error('AI 未返回图片描述');
    }
    
    console.log('[ImageRecognition] 识别成功:', description.slice(0, 50) + '...');
    
    return {
      description,
      success: true,
    };
    
  } catch (error: any) {
    console.error('[ImageRecognition] 识别失败:', error);
    return {
      description: '',
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * 将 File 对象转换为 Base64
 * 
 * @param file 文件对象
 * @returns Base64 字符串
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩图片到合适大小
 * 
 * @param file 原始文件
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param quality 压缩质量 (0-1)
 * @returns 压缩后的 Base64
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // 计算缩放比例
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        // 创建 canvas 并绘制
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为 Base64
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}
