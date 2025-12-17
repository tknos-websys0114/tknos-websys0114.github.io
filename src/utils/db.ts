// IndexedDB 数据库工具类
const DB_NAME = 'ToukenRanbuDB';
const DB_VERSION = 9; // 升级版本以添加 SCHEDULE store

// 数据库stores
export const STORES = {
  USER_DATA: 'userData',
  CHARACTERS: 'characters',
  CHATS: 'chats',
  CHAT_MESSAGES: 'chatMessages',
  CHAT_SETTINGS: 'chatSettings',
  WORLD_BOOKS: 'worldBooks',
  API_SETTINGS: 'apiSettings',
  APPEARANCE: 'appearance',
  MISC: 'misc', // 其他杂项数据（桌面壁纸、组件图片等）
  STICKERS: 'stickers', // 表情包元数据
  BUBBLE_PRESETS: 'bubblePresets', // 气泡样式预设
  AI_TASKS: 'aiTasks', // AI 任务队列
  HEALTH: 'health', // 健康数据
  SCHEDULE: 'schedule', // 日程/待办/课表数据
};

class Database {
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // 验证所有必需的stores都存在
        const requiredStores = Object.values(STORES);
        const missingStores = requiredStores.filter(
          store => !this.db!.objectStoreNames.contains(store)
        );
        
        if (missingStores.length > 0) {
          console.error('Missing object stores:', missingStores);
          console.log('Available stores:', Array.from(this.db!.objectStoreNames));
          console.log('Required stores:', requiredStores);
          
          // 关闭数据库并删除，然后重新创建
          this.db.close();
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
          deleteRequest.onsuccess = () => {
            console.log('Database deleted, reinitializing...');
            // 重新初始化
            this.init().then(resolve).catch(reject);
          };
          deleteRequest.onerror = () => {
            reject(new Error('Failed to recreate database'));
          };
          return;
        }
        
        console.log('IndexedDB initialized successfully with stores:', Array.from(this.db.objectStoreNames));
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('Database upgrade needed from version', event.oldVersion, 'to', event.newVersion);

        // 创建所有object stores
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA);
          console.log('Created store:', STORES.USER_DATA);
        }
        if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
          db.createObjectStore(STORES.CHARACTERS);
          console.log('Created store:', STORES.CHARACTERS);
        }
        if (!db.objectStoreNames.contains(STORES.CHATS)) {
          db.createObjectStore(STORES.CHATS);
          console.log('Created store:', STORES.CHATS);
        }
        if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
          db.createObjectStore(STORES.CHAT_MESSAGES);
          console.log('Created store:', STORES.CHAT_MESSAGES);
        }
        if (!db.objectStoreNames.contains(STORES.CHAT_SETTINGS)) {
          db.createObjectStore(STORES.CHAT_SETTINGS);
          console.log('Created store:', STORES.CHAT_SETTINGS);
        }
        if (!db.objectStoreNames.contains(STORES.WORLD_BOOKS)) {
          db.createObjectStore(STORES.WORLD_BOOKS);
          console.log('Created store:', STORES.WORLD_BOOKS);
        }
        if (!db.objectStoreNames.contains(STORES.API_SETTINGS)) {
          db.createObjectStore(STORES.API_SETTINGS);
          console.log('Created store:', STORES.API_SETTINGS);
        }
        if (!db.objectStoreNames.contains(STORES.APPEARANCE)) {
          db.createObjectStore(STORES.APPEARANCE);
          console.log('Created store:', STORES.APPEARANCE);
        }
        if (!db.objectStoreNames.contains(STORES.MISC)) {
          db.createObjectStore(STORES.MISC);
          console.log('Created store:', STORES.MISC);
        }
        if (!db.objectStoreNames.contains(STORES.STICKERS)) {
          db.createObjectStore(STORES.STICKERS);
          console.log('Created store:', STORES.STICKERS);
        }
        if (!db.objectStoreNames.contains(STORES.BUBBLE_PRESETS)) {
          db.createObjectStore(STORES.BUBBLE_PRESETS);
          console.log('Created store:', STORES.BUBBLE_PRESETS);
        }
        if (!db.objectStoreNames.contains(STORES.AI_TASKS)) {
          db.createObjectStore(STORES.AI_TASKS);
          console.log('Created store:', STORES.AI_TASKS);
        }
        if (!db.objectStoreNames.contains(STORES.HEALTH)) {
          db.createObjectStore(STORES.HEALTH);
          console.log('Created store:', STORES.HEALTH);
        }
        if (!db.objectStoreNames.contains(STORES.SCHEDULE)) {
          db.createObjectStore(STORES.SCHEDULE);
          console.log('Created store:', STORES.SCHEDULE);
        }
      };
    });
  }

  // 验证store是否存在
  private validateStore(storeName: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    if (!this.db.objectStoreNames.contains(storeName)) {
      throw new Error(`Store "${storeName}" does not exist. Available stores: ${Array.from(this.db.objectStoreNames).join(', ')}`);
    }
  }

  // 通用的获取数据方法
  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();
    this.validateStore(storeName);
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new Error(`Failed to get data from ${storeName}: ${request.error}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 通用的设置数据方法
  async set(storeName: string, key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    this.validateStore(storeName);
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to set data in ${storeName}: ${request.error}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 通用的删除数据方法
  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();
    this.validateStore(storeName);
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to delete data from ${storeName}: ${request.error}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 获取store中的所有keys
  async getAllKeys(storeName: string): Promise<string[]> {
    if (!this.db) await this.init();
    this.validateStore(storeName);
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          reject(new Error(`Failed to get all keys from ${storeName}: ${request.error}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 获取store中的所有数据
  async getAll<T>(storeName: string): Promise<Record<string, T>> {
    if (!this.db) await this.init();
    
    const keys = await this.getAllKeys(storeName);
    const result: Record<string, T> = {};

    for (const key of keys) {
      const value = await this.get<T>(storeName, key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  // 清空指定store
  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    this.validateStore(storeName);
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to clear ${storeName}: ${request.error}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 清空所有数据
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    const stores = Object.values(STORES);
    for (const store of stores) {
      await this.clear(store);
    }
  }

  // 获取store的数据大小估算
  async getStoreSize(storeName: string): Promise<number> {
    const data = await this.getAll(storeName);
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  // 导出所有数据
  async exportAll(): Promise<Record<string, any>> {
    if (!this.db) await this.init();
    
    const allData: Record<string, any> = {};
    const stores = Object.values(STORES);

    for (const store of stores) {
      allData[store] = await this.getAll(store);
    }

    return allData;
  }

  // 导入所有数据
  async importAll(data: Record<string, any>): Promise<void> {
    if (!this.db) await this.init();
    
    for (const [storeName, storeData] of Object.entries(data)) {
      if (Object.values(STORES).includes(storeName)) {
        // 清空现有数据
        await this.clear(storeName);
        
        // 导入新数据
        for (const [key, value] of Object.entries(storeData)) {
          await this.set(storeName, key, value);
        }
      }
    }
  }

  // 从localStorage迁移数据到IndexedDB（仅执行一次）
  async migrateFromLocalStorage(): Promise<void> {
    // 检查是否已经迁移过
    const migrated = await this.get(STORES.MISC, 'migrated_from_localstorage');
    if (migrated) {
      return;
    }

    console.log('开始从localStorage迁移数据到IndexedDB...');

    try {
      // 迁移用户数据
      const userData = localStorage.getItem('userData');
      if (userData) {
        await this.set(STORES.USER_DATA, 'userData', JSON.parse(userData));
      }
      const userDescription = localStorage.getItem('user_description');
      if (userDescription) {
        await this.set(STORES.USER_DATA, 'user_description', userDescription);
      }

      // 迁移角色数据
      const characters = localStorage.getItem('characters');
      if (characters) {
        await this.set(STORES.CHARACTERS, 'characters', JSON.parse(characters));
      }

      // 迁移聊天列表
      const chatList = localStorage.getItem('chat_list');
      if (chatList) {
        await this.set(STORES.CHATS, 'chat_list', JSON.parse(chatList));
      }

      // 迁移聊天消息
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chat_messages_')) {
          const messages = localStorage.getItem(key);
          if (messages) {
            await this.set(STORES.CHAT_MESSAGES, key, JSON.parse(messages));
          }
        }
      }

      // 迁移聊天设置
      const chatSettings = localStorage.getItem('chat_settings');
      if (chatSettings) {
        await this.set(STORES.CHAT_SETTINGS, 'chat_settings', JSON.parse(chatSettings));
      }

      // 迁移聊天详细设置
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chat_detail_settings_')) {
          const settings = localStorage.getItem(key);
          if (settings) {
            await this.set(STORES.CHAT_SETTINGS, key, JSON.parse(settings));
          }
        }
      }

      // 迁移世界书
      const worldBooks = localStorage.getItem('world_books');
      if (worldBooks) {
        await this.set(STORES.WORLD_BOOKS, 'world_books', JSON.parse(worldBooks));
      }

      // 迁移API设置
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('api_')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              await this.set(STORES.API_SETTINGS, key, JSON.parse(value));
            } catch {
              await this.set(STORES.API_SETTINGS, key, value);
            }
          }
        }
      }

      // 迁移外观设置
      const accentColor = localStorage.getItem('accent_color');
      if (accentColor) {
        await this.set(STORES.APPEARANCE, 'accent_color', accentColor);
      }
      const darkMode = localStorage.getItem('dark_mode');
      if (darkMode) {
        await this.set(STORES.APPEARANCE, 'dark_mode', darkMode);
      }

      // 迁移其他数据（桌面壁纸、图片、自定义文字等）
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('desktop') ||
          key.startsWith('image_') ||
          key.startsWith('customText') ||
          key.includes('wallpaper') ||
          key.includes('color') ||
          key.includes('font') ||
          key === 'organizations'
        )) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              await this.set(STORES.MISC, key, JSON.parse(value));
            } catch {
              await this.set(STORES.MISC, key, value);
            }
          }
        }
      }

      // 标记已迁移
      await this.set(STORES.MISC, 'migrated_from_localstorage', true);
      console.log('数据迁移完成！');

      // 可选：清空localStorage（如果确认迁移成功）
      // localStorage.clear();
    } catch (error) {
      console.error('数据迁移失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const db = new Database();

// 简化的API - 用于向后兼容和简便使用
export async function getFromDB<T>(key: string, defaultValue?: T): Promise<T | null> {
  try {
    // 尝试从不同的store中查找
    // 优先级：MISC > USER_DATA > APPEARANCE
    let value = await db.get<T>(STORES.MISC, key);
    if (value !== null) return value;
    
    value = await db.get<T>(STORES.USER_DATA, key);
    if (value !== null) return value;
    
    value = await db.get<T>(STORES.APPEARANCE, key);
    if (value !== null) return value;
    
    return defaultValue !== undefined ? defaultValue : null;
  } catch (error) {
    console.error(`Failed to get ${key} from DB:`, error);
    return defaultValue !== undefined ? defaultValue : null;
  }
}

export async function saveToDB(key: string, value: any): Promise<void> {
  try {
    // 根据key的前缀决定存储位置
    if (key === 'userData' || key === 'user_description') {
      await db.set(STORES.USER_DATA, key, value);
    } else if (key === 'accent_color' || key === 'dark_mode') {
      await db.set(STORES.APPEARANCE, key, value);
    } else {
      await db.set(STORES.MISC, key, value);
    }
  } catch (error) {
    console.error(`Failed to save ${key} to DB:`, error);
    throw error;
  }
}

export async function deleteFromDB(key: string): Promise<void> {
  try {
    // 尝试从所有可能的store中删除
    await db.delete(STORES.MISC, key).catch(() => {});
    await db.delete(STORES.USER_DATA, key).catch(() => {});
    await db.delete(STORES.APPEARANCE, key).catch(() => {});
  } catch (error) {
    console.error(`Failed to delete ${key} from DB:`, error);
    throw error;
  }
}

export async function clearDB(): Promise<void> {
  try {
    await db.clearAll();
  } catch (error) {
    console.error('Failed to clear DB:', error);
    throw error;
  }
}

// 初始化数据库并执行迁移（应用启动时调用）
export async function initDB(): Promise<void> {
  try {
    await db.init();
    await db.migrateFromLocalStorage();
  } catch (error) {
    console.error('Failed to initialize DB:', error);
    throw error;
  }
}

// 诊断函数 - 检查数据库状态
export async function diagnoseDatabaseIssues(): Promise<void> {
  console.log('=== Database Diagnosis ===');
  
  try {
    // 检查数据库是否已初始化
    await db.init();
    console.log('✓ Database initialized successfully');
    
    // 列出所有可用的stores
    const dbInstance = (db as any).db as IDBDatabase;
    if (dbInstance) {
      const availableStores = Array.from(dbInstance.objectStoreNames);
      console.log('Available stores:', availableStores);
      
      // 检查缺失的stores
      const requiredStores = Object.values(STORES);
      const missingStores = requiredStores.filter(
        store => !availableStores.includes(store)
      );
      
      if (missingStores.length > 0) {
        console.error('✗ Missing stores:', missingStores);
        console.log('Attempting to recreate database...');
        
        // 删除并重新创建数据库
        dbInstance.close();
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
          deleteRequest.onsuccess = () => {
            console.log('Database deleted successfully');
            resolve();
          };
          deleteRequest.onerror = () => {
            console.error('Failed to delete database');
            reject(deleteRequest.error);
          };
        });
        
        // 重新初始化
        await db.init();
        console.log('✓ Database recreated successfully');
      } else {
        console.log('✓ All required stores are present');
      }
      
      // 测试基本操作
      await db.set(STORES.MISC, 'test_key', 'test_value');
      const testValue = await db.get(STORES.MISC, 'test_key');
      if (testValue === 'test_value') {
        console.log('✓ Read/write operations working');
        await db.delete(STORES.MISC, 'test_key');
      } else {
        console.error('✗ Read/write operations failed');
      }
    }
    
    console.log('=== Diagnosis Complete ===');
  } catch (error) {
    console.error('✗ Database diagnosis failed:', error);
    throw error;
  }
}

// 在开发环境中自动暴露诊断函数到全局
if (typeof window !== 'undefined') {
  (window as any).diagnoseDatabaseIssues = diagnoseDatabaseIssues;
  (window as any).clearDatabase = async () => {
    const dbInstance = (db as any).db as IDBDatabase;
    if (dbInstance) {
      dbInstance.close();
    }
    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => {
        console.log('Database cleared successfully. Please refresh the page.');
        resolve();
      };
    });
  };
}