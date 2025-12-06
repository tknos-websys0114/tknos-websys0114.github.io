import { db, STORES } from './db';
import { saveImage, getImage, deleteImage } from './imageDB';
import { compressImage } from './imageCompression';

export interface Sticker {
  id: string;
  imageKey?: string; // 图片在imageDB中的key（本地上传）
  imageUrl?: string; // 图床URL（批量导入）
  meaning: string; // 表情的含义，用于AI识别
  createdAt: string;
}

/**
 * 添加表情包
 * @param file 图片文件
 * @param meaning 表情的含义
 * @returns 表情对象
 */
export const addSticker = async (file: File, meaning: string): Promise<Sticker> => {
  try {
    // 压缩表情包图片（目标大小：200KB，最大尺寸：512px）
    const compressedBlob = await compressImage(file, {
      maxSizeMB: 0.2, // 最大 200KB
      maxWidthOrHeight: 512, // 最大尺寸 512px
      useWebWorker: true,
    });
    
    // 生成唯一ID
    const id = `sticker_${Date.now()}`;
    const imageKey = `meme-${id}`;
    
    // 保存图片到imageDB
    await saveImage(imageKey, new File([compressedBlob], file.name, { type: compressedBlob.type }));
    
    // 创建表情对象
    const sticker: Sticker = {
      id,
      imageKey,
      meaning,
      createdAt: new Date().toISOString(),
    };
    
    // 保存元数据到数据库
    const stickers = await getAllStickers();
    stickers.push(sticker);
    await db.set(STORES.STICKERS, 'stickers', stickers);
    
    return sticker;
  } catch (error) {
    console.error('Failed to add sticker:', error);
    throw error;
  }
};

/**
 * 获取所有表情包
 * @returns 表情数组
 */
export const getAllStickers = async (): Promise<Sticker[]> => {
  try {
    const stickers = await db.get<Sticker[]>(STORES.STICKERS, 'stickers');
    return stickers || [];
  } catch (error) {
    console.error('Failed to get stickers:', error);
    return [];
  }
};

/**
 * 获取表情包图片URL
 * @param imageKey 图片key
 * @returns 图片URL
 */
export const getStickerImageURL = async (imageKey: string): Promise<string | null> => {
  try {
    return await getImage(imageKey);
  } catch (error) {
    console.error('Failed to get sticker image:', error);
    return null;
  }
};

/**
 * 删除表情包
 * @param stickerId 表情ID
 */
export const deleteSticker = async (stickerId: string): Promise<void> => {
  try {
    const stickers = await getAllStickers();
    const sticker = stickers.find(s => s.id === stickerId);
    
    if (!sticker) {
      throw new Error('Sticker not found');
    }
    
    // 只有本地上传的表情包才需要删除图片
    if (sticker.imageKey) {
      await deleteImage(sticker.imageKey);
    }
    
    // 从列表中移除
    const updatedStickers = stickers.filter(s => s.id !== stickerId);
    await db.set(STORES.STICKERS, 'stickers', updatedStickers);
  } catch (error) {
    console.error('Failed to delete sticker:', error);
    throw error;
  }
};

/**
 * 获取所有表情包的含义（用于AI prompt）
 * @returns 表情含义映射
 */
export const getStickerMeaningsForAI = async (): Promise<Record<string, string>> => {
  try {
    const stickers = await getAllStickers();
    const meanings: Record<string, string> = {};
    
    stickers.forEach(sticker => {
      meanings[sticker.id] = sticker.meaning;
    });
    
    return meanings;
  } catch (error) {
    console.error('Failed to get sticker meanings:', error);
    return {};
  }
};

/**
 * 从图床URL批量导入表情包
 * @param input 批量导入的文本，格式: "含义-URL"，每行一个
 * @returns 导入结果统计
 */
export const batchImportStickersFromURL = async (input: string): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> => {
  const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const result = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const line of lines) {
    try {
      // 解析格式: "含义-URL"
      const separatorIndex = line.indexOf('-');
      if (separatorIndex === -1) {
        result.failed++;
        result.errors.push(`格式错误: "${line}" (应为: 含义-URL)`);
        continue;
      }

      const meaning = line.substring(0, separatorIndex).trim();
      const url = line.substring(separatorIndex + 1).trim();

      if (!meaning) {
        result.failed++;
        result.errors.push(`含义为空: "${line}"`);
        continue;
      }

      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        result.failed++;
        result.errors.push(`无效的URL: "${url}"`);
        continue;
      }

      // 生成唯一ID
      const id = `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // 创建表情对象（直接使用URL，不下载）
      const sticker: Sticker = {
        id,
        imageUrl: url, // 直接保存图床URL
        meaning,
        createdAt: new Date().toISOString(),
      };
      
      // 保存元数据到数据库
      const stickers = await getAllStickers();
      stickers.push(sticker);
      await db.set(STORES.STICKERS, 'stickers', stickers);
      
      result.success++;
      
      // 添加短暂延迟，避免ID冲突
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error: any) {
      result.failed++;
      result.errors.push(`"${line.substring(0, 30)}...": ${error.message || '未知错误'}`);
    }
  }

  return result;
};