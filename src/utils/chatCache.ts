/**
 * 聊天全局缓存
 * 用于避免重复读取数据库，提升性能
 */

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

interface GlobalCache {
  chatSettings?: any;
  userData?: any;
  userAvatar?: string | null; // 审神者头像缓存
  characters?: any[];
  messages: { [characterId: string]: Message[] }; // 每个角色的消息缓存
  chatSettingsDetail: { [characterId: string]: any }; // 每个角色的详细设置（备注名等）
  lastUpdate?: number;
}

// 全局缓存对象
export const globalCache: GlobalCache = {
  messages: {},
  chatSettingsDetail: {},
  userAvatar: undefined, // 初始为 undefined 表示未加载
};

const CACHE_DURATION = 5000; // 5秒缓存有效期

/**
 * 清除缓存
 * @param clearAll 是否清除所有缓存（包括头像、消息等）
 */
export const clearCache = (clearAll: boolean = false) => {
  globalCache.chatSettings = undefined;
  globalCache.userData = undefined;
  globalCache.characters = undefined;
  globalCache.lastUpdate = undefined;
  
  if (clearAll) {
    // 清除所有缓存，包括消息、头像等
    globalCache.messages = {};
    globalCache.chatSettingsDetail = {};
    globalCache.userAvatar = undefined;
  }
  // 否则：不清除messages和chatSettingsDetail缓存，保持聊天记录和UI设置在内存中
  // 也不清除 userAvatar，保持头像缓存
};

/**
 * 检查缓存是否有效
 */
export const isCacheValid = () => {
  if (!globalCache.lastUpdate) return false;
  return Date.now() - globalCache.lastUpdate < CACHE_DURATION;
};

/**
 * 获取角色的备注名（优先从缓存）
 * @param characterId 角色ID
 * @param characterName 角色原名（fallback）
 * @returns 显示名称（备注名或原名）
 */
export const getDisplayName = (characterId: string, characterName: string): string => {
  const cachedDetail = globalCache.chatSettingsDetail[characterId];
  return cachedDetail?.remark || characterName;
};

/**
 * 设置角色的备注名到缓存
 */
export const setDisplayNameCache = (characterId: string, remark: string) => {
  if (!globalCache.chatSettingsDetail[characterId]) {
    globalCache.chatSettingsDetail[characterId] = {};
  }
  globalCache.chatSettingsDetail[characterId].remark = remark;
};

/**
 * 获取用户头像（优先从缓存）
 * @returns 用户头像 URL 或 null
 */
export const getUserAvatar = (): string | null | undefined => {
  return globalCache.userAvatar;
};

/**
 * 设置用户头像到缓存
 */
export const setUserAvatarCache = (avatar: string | null) => {
  globalCache.userAvatar = avatar;
};