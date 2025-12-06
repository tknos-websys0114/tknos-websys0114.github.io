// IndexedDB 工具函数用于保存和读取图片（Blob 版本）
import { compressImage, compressAvatarImage, compressBackgroundImage, base64ToBlob } from './imageCompression';

const DB_NAME = 'DesktopImagesDB';
const STORE_NAME = 'images';
const DB_VERSION = 3; // 升级版本以支持 Blob

// 图片分类常量
export const IMAGE_CATEGORIES = {
  AVATARS: 'avatars',        // 头像（审神者头像、角色头像、聊天头像）
  MEMES: 'memes',            // 表情包
  CHAT_IMAGES: 'chat_images', // 聊天图片
  SYSTEM: 'system',          // 系统图片（壁纸、桌面组件图片等）
} as const;

export type ImageCategory = typeof IMAGE_CATEGORIES[keyof typeof IMAGE_CATEGORIES];
export type ImageKey = 'profileBackground' | 'avatar' | 'anniversary' | string;

// Object URL 缓存，用于自动管理 URL 生命周期
const urlCache = new Map<string, string>();

/**
 * 根据 key 自动推断分类
 */
function getCategoryFromKey(key: string): ImageCategory {
  // 头像相关（支持多种格式）
  if (
    key === 'avatar' || 
    key === 'chat-avatar' || 
    key.startsWith('character-avatar-') ||
    key.startsWith('character-') && key.endsWith('-avatar')  // 支持 character-{id}-avatar 格式
  ) {
    return IMAGE_CATEGORIES.AVATARS;
  }
  // 系统图片（壁纸、桌面组件等）
  if (
    key === 'profileBackground' || 
    key === 'desktop-wallpaper' || 
    key === 'chat-background' ||
    key === 'anniversary' ||
    key.startsWith('desktop2_')
  ) {
    return IMAGE_CATEGORIES.SYSTEM;
  }
  // 表情包
  if (key.startsWith('meme-')) {
    return IMAGE_CATEGORIES.MEMES;
  }
  // 聊天图片
  if (key.startsWith('chat-image-')) {
    return IMAGE_CATEGORIES.CHAT_IMAGES;
  }
  // 默认归类为系统图片
  return IMAGE_CATEGORIES.SYSTEM;
}

/**
 * 构建完整的存储路径
 */
function buildStorageKey(key: string, category?: ImageCategory): string {
  // 如果 key 已经包含分类路径，直接返回
  if (key.includes('/')) {
    return key;
  }
  
  const cat = category || getCategoryFromKey(key);
  return `${cat}/${key}`;
}

/**
 * 从存储路径提取原始 key
 */
function extractOriginalKey(storageKey: string): string {
  const parts = storageKey.split('/');
  return parts.length > 1 ? parts[1] : storageKey;
}

// 打开数据库
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open image database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      // 验证store是否存在
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.error('Image store not found, recreating database...');
        db.close();
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
          openDB().then(resolve).catch(reject);
        };
        deleteRequest.onerror = () => {
          reject(new Error('Failed to recreate image database'));
        };
        return;
      }
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('Image database upgrade needed from version', event.oldVersion, 'to', event.newVersion);
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('Created image store:', STORE_NAME);
      }
    };
  });
};

/**
 * 保存图片到 IndexedDB（Blob 版本）
 * @param key 图片唯一标识
 * @param file 图片文件
 * @returns Object URL，可直接用于 img src
 */
export const saveImage = async (key: ImageKey, file: File): Promise<string> => {
  try {
    const db = await openDB();
    
    // 根据图片类型选择压缩策略
    let compressedBlob: Blob;
    if (key === 'avatar' || key.includes('avatar')) {
      // 所有头像都压缩（审神者头像、角色头像、聊天头像）
      compressedBlob = await compressAvatarImage(file);
    } else {
      // 壁纸、小组件图片等不压缩，保持原始质量
      compressedBlob = file;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(compressedBlob, buildStorageKey(key));

        request.onsuccess = () => {
          db.close();
          // 创建 Object URL
          const url = createObjectURL(key, compressedBlob);
          resolve(url);
        };
        request.onerror = () => {
          console.error('Failed to save image:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to save image:', error);
    throw error;
  }
};

/**
 * 从 IndexedDB 读取图片
 * @param key 图片唯一标识
 * @returns Object URL，可直接用于 img src
 */
export const getImage = async (key: ImageKey): Promise<string | null> => {
  try {
    // 检查缓存
    if (urlCache.has(key)) {
      return urlCache.get(key)!;
    }

    const db = await openDB();
    const storageKey = buildStorageKey(key);

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        // 首先尝试读取新格式（带分类前缀）
        const request = store.get(storageKey);

        request.onsuccess = () => {
          let result = request.result;
          
          // 如果新格式不存在，尝试读取旧格式（不带分类前缀）
          if (!result && storageKey !== key) {
            const oldRequest = store.get(key);
            oldRequest.onsuccess = () => {
              const oldResult = oldRequest.result;
              db.close();
              
              if (!oldResult) {
                resolve(null);
                return;
              }
              
              // 找到旧数据，迁移到新格式
              console.log(`Migrating ${key} from old format to new format...`);
              migrateToNewFormat(key, oldResult).catch(console.error);
              
              // 处理旧数据
              if (typeof oldResult === 'string') {
                resolve(oldResult); // Base64
              } else {
                const url = createObjectURL(key, oldResult);
                resolve(url);
              }
            };
            oldRequest.onerror = () => {
              db.close();
              resolve(null);
            };
            return;
          }
          
          db.close();
          
          if (!result) {
            resolve(null);
            return;
          }

          // 向后兼容：检测是否是 Base64 字符串
          if (typeof result === 'string') {
            // 旧数据是 Base64，需要迁移
            migrateBase64ToBlob(key, result).catch(console.error);
            resolve(result); // 暂时返回 Base64
            return;
          }

          // 新数据是 Blob
          const url = createObjectURL(key, result);
          resolve(url);
        };
        request.onerror = () => {
          console.error('Failed to get image:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to get image:', error);
    return null;
  }
};

/**
 * 创建并缓存 Object URL
 */
function createObjectURL(key: string, blob: Blob): string {
  // 如果已存在，先释放
  if (urlCache.has(key)) {
    URL.revokeObjectURL(urlCache.get(key)!);
  }
  
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

/**
 * 释放指定图片的 Object URL
 */
export const revokeImageURL = (key: ImageKey): void => {
  if (urlCache.has(key)) {
    URL.revokeObjectURL(urlCache.get(key)!);
    urlCache.delete(key);
  }
};

/**
 * 删除图片
 */
export const deleteImage = async (key: ImageKey): Promise<void> => {
  try {
    // 释放 Object URL
    revokeImageURL(key);

    const db = await openDB();

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(buildStorageKey(key));

        request.onsuccess = () => {
          db.close();
          resolve();
        };
        request.onerror = () => {
          console.error('Failed to delete image:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to delete image:', error);
    throw error;
  }
};

/**
 * 复制图片到新的key
 */
export const copyImage = async (fromKey: ImageKey, toKey: ImageKey): Promise<string | null> => {
  try {
    const db = await openDB();
    const fromStorageKey = buildStorageKey(fromKey);
    const toStorageKey = buildStorageKey(toKey);

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // 先读取源图片
        const getRequest = store.get(fromStorageKey);
        
        getRequest.onsuccess = () => {
          const blob = getRequest.result;
          
          if (!blob) {
            db.close();
            resolve(null);
            return;
          }
          
          // 保存到新key
          const putRequest = store.put(blob, toStorageKey);
          
          putRequest.onsuccess = () => {
            db.close();
            // 创建新的 Object URL
            const url = createObjectURL(toKey, blob);
            resolve(url);
          };
          
          putRequest.onerror = () => {
            console.error('Failed to copy image:', putRequest.error);
            db.close();
            reject(putRequest.error);
          };
        };
        
        getRequest.onerror = () => {
          console.error('Failed to read source image:', getRequest.error);
          db.close();
          reject(getRequest.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to copy image:', error);
    return null;
  }
};

/**
 * 迁移 Base64 数据到 Blob
 */
async function migrateBase64ToBlob(key: ImageKey, base64: string): Promise<void> {
  try {
    console.log(`Migrating ${key} from Base64 to Blob...`);
    const blob = base64ToBlob(base64);
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, buildStorageKey(key));

        request.onsuccess = () => {
          db.close();
          console.log(`Successfully migrated ${key} to Blob`);
          // 更新缓存
          createObjectURL(key, blob);
          resolve();
        };
        request.onerror = () => {
          console.error('Failed to migrate image:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in migration transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to migrate Base64 to Blob:', error);
  }
}

/**
 * 迁移旧格式到新格式
 */
async function migrateToNewFormat(key: ImageKey, oldResult: Blob | string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(oldResult, buildStorageKey(key));

        request.onsuccess = () => {
          db.close();
          console.log(`Successfully migrated ${key} to new format`);
          // 更新缓存
          if (oldResult instanceof Blob) {
            createObjectURL(key, oldResult);
          }
          resolve();
        };
        request.onerror = () => {
          console.error('Failed to migrate image:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in migration transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to migrate to new format:', error);
  }
}

/**
 * 获取所有图片的 keys
 */
export const getAllImageKeys = async (): Promise<string[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          db.close();
          resolve(request.result.map(extractOriginalKey) as string[]);
        };
        request.onerror = () => {
          console.error('Failed to get all keys:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to get all image keys:', error);
    return [];
  }
};

/**
 * 垃圾回收：清理未被引用的图片
 * @param usedKeys 当前正在使用的图片 keys
 */
export const garbageCollectImages = async (usedKeys: Set<string>): Promise<void> => {
  try {
    const allKeys = await getAllImageKeys();
    const unusedKeys = allKeys.filter(key => !usedKeys.has(key));
    
    console.log(`Garbage collecting ${unusedKeys.length} unused images...`);
    
    for (const key of unusedKeys) {
      await deleteImage(key);
    }
    
    console.log('Garbage collection completed');
  } catch (error) {
    console.error('Failed to garbage collect images:', error);
  }
};

/**
 * 清理所有 Object URLs（在应用卸载时调用）
 */
export const revokeAllURLs = (): void => {
  urlCache.forEach(url => URL.revokeObjectURL(url));
  urlCache.clear();
};

/**
 * 清空所有图片数据
 */
export const clearAllImages = async (): Promise<void> => {
  try {
    // 释放所有 Object URLs
    revokeAllURLs();
    
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          db.close();
          console.log('All images cleared successfully');
          resolve();
        };
        request.onerror = () => {
          console.error('Failed to clear all images:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in clear transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to clear all images:', error);
    throw error;
  }
};

/**
 * 导出所有图片数据（返回 Blob 对象）
 */
export const exportAllImages = async (): Promise<Record<string, Blob>> => {
  try {
    const db = await openDB();
    const allKeys = await getAllImageKeys();
    const exportData: Record<string, Blob> = {};

    for (const key of allKeys) {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(buildStorageKey(key));

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result instanceof Blob) {
              exportData[key] = result;
            } else if (typeof result === 'string') {
              // 如果还是旧的 Base64 格式，转换为 Blob
              exportData[key] = base64ToBlob(result);
            }
            resolve();
          };
          request.onerror = reject;
        });
      } catch (error) {
        console.error(`Failed to export image ${key}:`, error);
      }
    }

    db.close();
    return exportData;
  } catch (error) {
    console.error('Failed to export all images:', error);
    return {};
  }
};

/**
 * 导出所有图片数据（带分类信息）
 */
export const exportAllImagesWithCategory = async (): Promise<Record<string, { blob: Blob; category: string }>> => {
  try {
    const db = await openDB();
    const allImages = await listAllImages();
    const exportData: Record<string, { blob: Blob; category: string }> = {};

    for (const { originalKey, storageKey, category } of allImages) {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(storageKey);

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result instanceof Blob) {
              exportData[originalKey] = { blob: result, category };
            } else if (typeof result === 'string') {
              // 如果还是旧的 Base64 格式，转换为 Blob
              exportData[originalKey] = { blob: base64ToBlob(result), category };
            }
            resolve();
          };
          request.onerror = reject;
        });
      } catch (error) {
        console.error(`Failed to export image ${originalKey}:`, error);
      }
    }

    db.close();
    return exportData;
  } catch (error) {
    console.error('Failed to export all images with category:', error);
    return {};
  }
};

/**
 * 导入图片数据（接收 Blob 对象）
 */
export const importAllImages = async (data: Record<string, Blob>): Promise<void> => {
  try {
    const db = await openDB();
    
    for (const [key, blob] of Object.entries(data)) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.put(blob, buildStorageKey(key));

          request.onsuccess = () => {
            // 创建 Object URL 并缓存
            createObjectURL(key, blob);
            resolve();
          };
          request.onerror = () => {
            console.error(`Failed to import image ${key}:`, request.error);
            reject(request.error);
          };
        });
      } catch (error) {
        console.error(`Failed to process image ${key}:`, error);
      }
    }

    db.close();
    console.log(`Successfully imported ${Object.keys(data).length} images`);
  } catch (error) {
    console.error('Failed to import images:', error);
    throw error;
  }
};

/**
 * 获取图片分类统计（用于调试）
 */
export const getImageCategoryStats = async (): Promise<Record<string, { count: number; size: string }>> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();
        const getAllKeysRequest = store.getAllKeys();

        let allBlobs: Blob[] = [];
        let allKeys: string[] = [];

        getAllRequest.onsuccess = () => {
          allBlobs = getAllRequest.result as Blob[];
        };

        getAllKeysRequest.onsuccess = () => {
          allKeys = getAllKeysRequest.result as string[];
          
          const stats: Record<string, { count: number; size: number }> = {
            [IMAGE_CATEGORIES.AVATARS]: { count: 0, size: 0 },
            [IMAGE_CATEGORIES.SYSTEM]: { count: 0, size: 0 },
            [IMAGE_CATEGORIES.MEMES]: { count: 0, size: 0 },
            [IMAGE_CATEGORIES.CHAT_IMAGES]: { count: 0, size: 0 },
            'uncategorized': { count: 0, size: 0 },
          };

          allKeys.forEach((key, index) => {
            const keyStr = String(key);
            const blob = allBlobs[index];
            const blobSize = blob instanceof Blob ? blob.size : 0;

            if (keyStr.includes('/')) {
              const category = keyStr.split('/')[0];
              if (category in stats) {
                stats[category].count++;
                stats[category].size += blobSize;
              } else {
                stats['uncategorized'].count++;
                stats['uncategorized'].size += blobSize;
              }
            } else {
              stats['uncategorized'].count++;
              stats['uncategorized'].size += blobSize;
            }
          });

          // 转换 size 为 KB 字符串
          const result: Record<string, { count: number; size: string }> = {};
          for (const [category, data] of Object.entries(stats)) {
            result[category] = {
              count: data.count,
              size: (data.size / 1024).toFixed(2),
            };
          }

          db.close();
          resolve(result);
        };

        getAllRequest.onerror = () => {
          console.error('Failed to get all data:', getAllRequest.error);
          db.close();
          reject(getAllRequest.error);
        };

        getAllKeysRequest.onerror = () => {
          console.error('Failed to get all keys:', getAllKeysRequest.error);
          db.close();
          reject(getAllKeysRequest.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to get category stats:', error);
    return {
      [IMAGE_CATEGORIES.AVATARS]: { count: 0, size: '0.00' },
      [IMAGE_CATEGORIES.SYSTEM]: { count: 0, size: '0.00' },
      [IMAGE_CATEGORIES.MEMES]: { count: 0, size: '0.00' },
      [IMAGE_CATEGORIES.CHAT_IMAGES]: { count: 0, size: '0.00' },
      'uncategorized': { count: 0, size: '0.00' },
    };
  }
};

/**
 * 列出所有图片（包含完整的存储路径，用于调试）
 */
export const listAllImages = async (): Promise<{ originalKey: string; storageKey: string; category: string }[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          db.close();
          const keys = request.result as string[];
          const result = keys.map((key) => {
            const keyStr = String(key);
            const parts = keyStr.split('/');
            return {
              originalKey: extractOriginalKey(keyStr),
              storageKey: keyStr,
              category: parts.length > 1 ? parts[0] : 'uncategorized',
            };
          });
          resolve(result);
        };
        request.onerror = () => {
          console.error('Failed to list all images:', request.error);
          db.close();
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in transaction:', error);
        db.close();
        reject(error);
      }
    });
  } catch (error) {
    console.error('Failed to list all images:', error);
    return [];
  }
};