/**
 * PrivateChat 组件 - 私聊界面
 * 
 * 性能优化策略（使用 TanStack Virtual 虚拟化渲染）：
 * 
 * 1. 虚拟化渲染 (virtualization)
 *    - 使用 @tanstack/react-virtual 进行虚拟化渲染
 *    - 只渲染可视区域的消息，即使有50,000条消息也流畅
 *    - 自动测量消息高度，无需手动维护
 *    - 滚动流畅（60fps），无卡顿
 * 
 * 2. 增量更新替代全量刷新
 *    - 发送/生成消息时"追加到列表尾部"（append），而不是"清空再重载整个列表"
 *    - 删除/编辑某条消息时，只对该条做更新并同步到持久层
 *    - 保持列表key稳定（使用消息id），避免因key变化导致整条重绘
 * 
 * 3. 自动滚动管理
 *    - react-virtual 自动处理滚动位置
 *    - 新消息自动滚动到底部
 *    - 删除消息时自动保持视觉位置
 * 
 * 4. 日期分隔符独立化
 *    - 日期分隔符作为独立的虚拟行，不影响消息高度测量
 *    - 虚拟列表项混合了消息和日期分隔符
 * 
 * 5. MessageItem 组件 memo 化
 *    - 使用 React.memo 避免不必要的重渲染
 *    - 大幅减少虚拟行渲染成本
 */

import { MoreHorizontal, User, ArrowUp, Check, Copy, Trash2, Edit3, Reply, X, Image as ImageIcon, Smile, Camera, ArrowLeftRight } from "lucide-react";
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ChatDetailSettings from "./ChatDetailSettings";
import MessageItem from "./MessageItem";
import DateSeparator from "./DateSeparator";
import StickerPicker from "./StickerPicker";
import ImagePicker from "./ImagePicker";
import solarlunar from "solarlunar";
import { db, STORES } from "../utils/db";
import { globalCache, clearCache, isCacheValid, getDisplayName } from "../utils/chatCache";
import { getImage } from "../utils/imageDB";
import { getStickerImageURL, getAllStickers } from "../utils/stickerManager";
import { createPrivateChatReplyTask } from "../utils/aiTaskManager";

interface Message {
  id: string;
  text: string;
  senderId: 'user' | 'character' | 'system';
  senderName: string;
  timestamp: Date;
  stickerId?: string; // 表情包ID
  imageKey?: string; // 图片key（存储在imageDB中）
  isRead?: boolean;
  isImageRecognition?: boolean; // 标记为图片识别结果消息（不显示给用户，但保存在历史中供AI使用）
  isPlaceholderImage?: boolean; // 伪图片占位符（拍照功能）
  redPacket?: { // 红包
    amount: number;
    blessing: string;
    opened: boolean;
  };
  quote?: {
    sender: string;
    content: string;
  };
}

interface WorldBook {
  id: string;
  name: string;
  scope: 'global' | 'local';
  position: 'before' | 'after';
  content: string;
}

interface Character {
  id: string;
  name: string;
  avatar: string | null;
  description: string;
  manifestDate?: string;
}

interface PrivateChatProps {
  characterId: string;
  characterName: string;
  onClose: () => void;
}

export default function PrivateChat({ characterId, characterName, onClose }: PrivateChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  // 头像和背景的 key（从数据库读取）
  const [userAvatarKey, setUserAvatarKey] = useState<string | null>(() => {
    return globalCache.chatSettings?.userAvatar || null;
  });
  const [characterAvatarKey, setCharacterAvatarKey] = useState<string | null>(() => {
    const c = globalCache.characters?.find((v: any) => v.id === characterId);
    return c?.avatar || null;
  });
  const [chatBackgroundKey, setChatBackgroundKey] = useState<string | null>(() => {
    return globalCache.chatSettings?.chatBackground || null;
  });
  
  // 头像和背景的显示 URL（从 imageDB 加载）
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [characterAvatar, setCharacterAvatar] = useState<string | null>(null);
  const [chatBackground, setChatBackground] = useState<string | null>(null);
  
  const [userNickname, setUserNickname] = useState<string>(() => {
    // 从缓存初始化用户昵称
    return globalCache.chatSettings?.userNickname || globalCache.userData?.name || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState<string>(() => {
    // 在初始化时就尝试从缓存读取备注名，避免闪烁
    const cachedDetail = globalCache.chatSettingsDetail?.[characterId];
    return cachedDetail?.remark || characterName;
  });
  
  // 气泡样式（与 ChatSettings 中的默认样式一致）
  const [userBubbleStyle, setUserBubbleStyle] = useState<string>(() => {
    return globalCache.chatSettings?.bubbleStyles?.user || `background: linear-gradient(75deg, rgba(172, 188, 166, 1), rgba(172, 188, 166, 1), rgba(172, 188, 166, 1));\ncolor: #ffffff;\nborder-radius: 8px;\npadding: 0.625rem 0.875rem;\nmax-width: 70vw;`;
  });
  const [charBubbleStyle, setCharBubbleStyle] = useState<string>(() => {
    return globalCache.chatSettings?.bubbleStyles?.character || `background: linear-gradient(-75deg, rgba(245, 245, 245, 1), rgba(245, 245, 245, 1), rgba(245, 245, 245, 1));\ncolor: #333333;\nborder-radius: 8px;\npadding: 0.625rem 0.875rem;\nmax-width: 70vw;`;
  });
  const [userQuoteStyle, setUserQuoteStyle] = useState<string>(() => {
    return globalCache.chatSettings?.bubbleStyles?.userQuote || `background: #9BAD96;\ncolor: rgba(255, 255, 255, 0.8);\nborder-radius: 4px;\npadding: 0.5rem;\nmargin-bottom: 0.5rem;`;
  });
  const [charQuoteStyle, setCharQuoteStyle] = useState<string>(() => {
    return globalCache.chatSettings?.bubbleStyles?.characterQuote || `background: #e8e8e8;\ncolor: #666666;\nborder-radius: 4px;\npadding: 0.5rem;\nmargin-bottom: 0.5rem;`;
  });
  
  const [worldBooks, setWorldBooks] = useState<WorldBook[]>([]);
  const [character, setCharacter] = useState<Character | null>(null);
  const [isAIReplying, setIsAIReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const hasMarkedAsRead = useRef(false);
  const allMessagesRef = useRef<Message[]>([]);
  
  // 长按菜单相关状态
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [errorToast, setErrorToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  
  // 多选模式相关状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  
  // 表情包和功能菜单相关状态
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCameraDescModal, setShowCameraDescModal] = useState(false);
  const [cameraDescription, setCameraDescription] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerUrls, setStickerUrls] = useState<Record<string, string>>({});
  const [remeasureTrigger, setRemeasureTrigger] = useState(0); // 用于图片加载后重新测量
  const [resetTrigger, setResetTrigger] = useState(0); // 用于删除/编辑后完全重置虚拟列表
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  
  // 待发送的图片（使用File对象）
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  
  // 红包相关状态
  const [showRedPacketModal, setShowRedPacketModal] = useState(false);
  const [redPacketAmount, setRedPacketAmount] = useState('');
  const [redPacketBlessing, setRedPacketBlessing] = useState('');
  const [balance, setBalance] = useState(0); // 小判余额（仅用于领取AI红包时的累计显示）
  
  // 从 imageDB 加载头像和背景的 URL
  useEffect(() => {
    const loadImageUrls = async () => {
      // 加载用户头像
      if (userAvatarKey) {
        if (userAvatarKey.startsWith('data:')) {
          // 旧的 Base64 格式
          setUserAvatar(userAvatarKey);
        } else {
          // 新的 key 格式，从图片数据库读取
          const url = await getImage(userAvatarKey);
          setUserAvatar(url);
        }
      } else {
        setUserAvatar(null);
      }
      
      // 加载角色头像
      if (characterAvatarKey) {
        if (characterAvatarKey.startsWith('data:')) {
          // 旧的 Base64 格式
          setCharacterAvatar(characterAvatarKey);
        } else {
          // 新的 key 格式，从图片数据库读取
          const url = await getImage(characterAvatarKey);
          setCharacterAvatar(url);
        }
      } else {
        setCharacterAvatar(null);
      }
      
      // 加载聊天背景
      if (chatBackgroundKey) {
        if (chatBackgroundKey.startsWith('data:')) {
          // 旧的 Base64 格式
          setChatBackground(chatBackgroundKey);
        } else {
          // 新的 key 格式，从图片数据库读取
          const url = await getImage(chatBackgroundKey);
          setChatBackground(url);
        }
      } else {
        setChatBackground(null);
      }
    };
    
    loadImageUrls();
  }, [userAvatarKey, characterAvatarKey, chatBackgroundKey]);

  // 加载消息中的表情包 URL
  useEffect(() => {
    const loadStickerUrls = async () => {
      const urls: Record<string, string> = {};
      
      // 获取所有表情包数据
      const allStickers = await getAllStickers();
      const stickerMap = new Map(allStickers.map(s => [s.id, s]));
      
      for (const message of allMessagesRef.current) {
        if (message.stickerId && !stickerUrls[message.stickerId]) {
          const sticker = stickerMap.get(message.stickerId);
          if (sticker) {
            // 如果是图床URL，直接使用
            if (sticker.imageUrl) {
              urls[message.stickerId] = sticker.imageUrl;
            } 
            // 如果是本地图片，从imageDB获取
            else if (sticker.imageKey) {
              const url = await getStickerImageURL(sticker.imageKey);
              if (url) {
                urls[message.stickerId] = url;
              }
            }
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setStickerUrls(prev => ({ ...prev, ...urls }));
      }
    };
    
    loadStickerUrls();
  }, [messages]);

  // 加载消息中的图片 URL
  useEffect(() => {
    const loadImageUrls = async () => {
      const urls: Record<string, string> = {};
      for (const message of allMessagesRef.current) {
        if (message.imageKey && !imageUrls[message.imageKey]) {
          const url = await getImage(message.imageKey);
          if (url) {
            urls[message.imageKey] = url;
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...urls }));
      }
    };
    
    loadImageUrls();
  }, [messages]);

  // 格式化消息时间
  const formatMessageTime = (timestamp: Date) => {
    const hours = timestamp.getHours().toString().padStart(2, '0');
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 将CSS字符串解析为React style对象
  const parseCSSToStyle = (cssString: string): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (!cssString) return style;

    // 分割CSS声明
    const declarations = cssString.split(';').filter(d => d.trim());
    
    declarations.forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        // 转换CSS属性名到camelCase (例如: background-color -> backgroundColor)
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        // @ts-ignore - 动态属性赋值
        style[camelProperty as any] = value;
      }
    });
    
    return style;
  };

  // ���断两条消息是否是同一天
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // 格式化日期分隔符
  const formatDateSeparator = (timestamp: Date) => {
    const year = timestamp.getFullYear();
    const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
    const day = timestamp.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  };
  
  // 将消息和日期分隔符混合为虚拟列表项（性能优化）
  type VirtualItem = 
    | { type: 'date'; date: string; id: string }
    | { type: 'message'; message: Message; isUserMessageRead: boolean };
  
  const virtualItems = useMemo<VirtualItem[]>(() => {
    const items: VirtualItem[]  = [];
    
    // 过滤掉图片识别消息（不显示在界面上，但保留在历史中供AI使用）
    const visibleMessages = allMessagesRef.current.filter(msg => !msg.isImageRecognition);
    
    visibleMessages.forEach((message, index) => {
      // 检查是否需要添加日期分隔符
      const showDateSeparator = index === 0 || !isSameDay(message.timestamp, visibleMessages[index - 1].timestamp);
      
      if (showDateSeparator) {
        items.push({
          type: 'date',
          date: formatDateSeparator(message.timestamp),
          id: `date-${message.timestamp.getTime()}`,
        });
      }
      
      // 检查用户消息是否已读
      const isUserMessageRead = message.senderId === 'user' && 
        visibleMessages.slice(index + 1).some(msg => msg.senderId === 'character');
      
      items.push({
        type: 'message',
        message,
        isUserMessageRead,
      });
    });
    
    return items;
  }, [messages, remeasureTrigger]); // 依赖 messages 和 remeasureTrigger
  
  // react-virtual 虚拟化
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length, // 使用虚拟列表项的长度
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      if (item?.type === 'date') return 30;
      
      // 根据消息类型估计高度
      if (item?.type === 'message') {
        const msg = item.message;
        // 图片消息或表情包：较大
        if (msg.imageKey || msg.stickerId) return 280;
        // 普通文本消息
        return 80;
      }
      
      return 80;
    },
    overscan: 10,
  });

  // 标记character的消息为已读（仅在打开聊天时执行一次）
  useEffect(() => {
    if (allMessagesRef.current.length > 0 && !hasMarkedAsRead.current) {
      // 总是尝试清除未读计数
      clearUnreadCount();

      const hasUnreadCharacterMessages = allMessagesRef.current.some(
        msg => msg.senderId === 'character' && !msg.isRead
      );
      
      if (hasUnreadCharacterMessages) {
        hasMarkedAsRead.current = true;
        
        allMessagesRef.current = allMessagesRef.current.map(msg =>
          msg.senderId === 'character' ? { ...msg, isRead: true } : msg
        );
        
        saveMessages(allMessagesRef.current);
        setMessages([...allMessagesRef.current]);
      } else {
        hasMarkedAsRead.current = true;
      }
    }
  }, [allMessagesRef.current.length]);

  // 滚动到底部 - 使用 useLayoutEffect 减少双重渲染
  useLayoutEffect(() => {
    if (virtualItems.length === 0) return;
    
    if (isInitialLoad.current) {
      // 等待 virtualizer 完成首次渲染并计算 totalSize
      requestAnimationFrame(() => {
        if (rowVirtualizer.getTotalSize() > 0 && messagesContainerRef.current) {
          // 直接滚动到容器底部而不是使用 scrollToIndex
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          isInitialLoad.current = false;
        }
      });
    } else {
      // 发送新消息时，直接滚动到底部
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }, [virtualItems.length]);

  useEffect(() => {
    // 重置标志
    isInitialLoad.current = true;
    hasMarkedAsRead.current = false;

    const loadAllData = async () => {
      try {
        const cachedMessages = globalCache.messages[characterId];
        if (cachedMessages && cachedMessages.length > 0) {
          allMessagesRef.current = cachedMessages;
          setMessages([...cachedMessages]);
        }

        // 恢复UI缓存
        if (globalCache.chatSettings) {
          const cs = globalCache.chatSettings;
          if (cs.userAvatar !== undefined) setUserAvatarKey(cs.userAvatar);
          if (cs.chatBackground !== undefined) setChatBackgroundKey(cs.chatBackground);
          if (cs.userNickname !== undefined) setUserNickname(cs.userNickname);
          if (cs.bubbleStyles?.user) setUserBubbleStyle(cs.bubbleStyles.user);
          if (cs.bubbleStyles?.character) setCharBubbleStyle(cs.bubbleStyles.character);
          if (cs.bubbleStyles?.userQuote) setUserQuoteStyle(cs.bubbleStyles.userQuote);
          if (cs.bubbleStyles?.characterQuote) setCharQuoteStyle(cs.bubbleStyles.characterQuote);
        }

        const cachedDetail = globalCache.chatSettingsDetail[characterId];
        if (cachedDetail && cachedDetail.remark !== undefined) {
          setDisplayName(cachedDetail.remark);
        }

        if (globalCache.userData && !globalCache.chatSettings?.userNickname) {
          setUserNickname(globalCache.userData.name || '我');
        }
        if (globalCache.characters) {
          const c = globalCache.characters.find((v: any) => v.id === characterId);
          if (c) {
            setCharacterAvatarKey(c.avatar);
            setCharacter(c);
          }
        }

        // 异步加载IndexedDB数据
        const promises = [
          db.get<any[]>(STORES.CHAT_MESSAGES, `chat_messages_${characterId}`),
          db.get<any>(STORES.CHAT_SETTINGS, `chat_detail_settings_${characterId}`),
        ];

        // 检查缓存是否有效，避免重复加载全局数据
        if (isCacheValid()) {
          promises.push(Promise.resolve(globalCache.chatSettings));
          promises.push(Promise.resolve(globalCache.userData));
          promises.push(Promise.resolve(globalCache.characters));
        } else {
          promises.push(
            db.get<any>(STORES.CHATS, 'chat_settings').then(data => {
              globalCache.chatSettings = data;
              return data;
            })
          );
          promises.push(
            db.get<any>(STORES.USER_DATA, 'userData').then(data => {
              globalCache.userData = data;
              return data;
            })
          );
          promises.push(
            db.get<any[]>(STORES.CHARACTERS, 'characters').then(data => {
              globalCache.characters = data;
              globalCache.lastUpdate = Date.now();
              return data;
            })
          );
        }

        const [saved, detailSettings, chatSettings, userData, characters] = await Promise.all(promises);
        
        // 加载余额（如果存在）
        const savedBalance = await db.get<number>(STORES.USER_DATA, 'balance');
        if (savedBalance !== undefined && savedBalance !== null) {
          setBalance(savedBalance);
        }

        // 批量更新状态
        const updates: {
          messages?: Message[];
          userAvatar?: string | null;
          chatBackground?: string | null;
          userNickname?: string;
          displayName?: string;
          characterAvatar?: string | null;
          character?: Character | null;
        } = {};

        // 处理消息数据 - 只在有变化时更新
        if (saved && saved.length > 0) {
          const allMessages = saved.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          // 检查消息是否有变化（比较长度和最后一条消息的ID）
          const hasChanged = !cachedMessages || 
                            cachedMessages.length !== allMessages.length ||
                            (allMessages.length > 0 && cachedMessages.length > 0 &&
                             allMessages[allMessages.length - 1].id !== cachedMessages[cachedMessages.length - 1].id);
          
          if (hasChanged) {
            globalCache.messages[characterId] = allMessages;
            allMessagesRef.current = allMessages;
            updates.messages = allMessages;
          }
        } else if (!cachedMessages || cachedMessages.length > 0) {
          updates.messages = [];
          globalCache.messages[characterId] = [];
          allMessagesRef.current = [];
        }

        if (chatSettings) {
          if (chatSettings.userAvatar !== userAvatarKey) {
            updates.userAvatarKey = chatSettings.userAvatar;
          }
          if (chatSettings.chatBackground !== chatBackgroundKey) {
            updates.chatBackgroundKey = chatSettings.chatBackground;
          }
          const newNickname = chatSettings.userNickname || '我';
          if (newNickname !== userNickname) {
            updates.userNickname = newNickname;
          }
          // 更新气泡样式
          if (chatSettings.bubbleStyles?.user) {
            setUserBubbleStyle(chatSettings.bubbleStyles.user);
          }
          if (chatSettings.bubbleStyles?.character) {
            setCharBubbleStyle(chatSettings.bubbleStyles.character);
          }
          if (chatSettings.bubbleStyles?.userQuote) {
            setUserQuoteStyle(chatSettings.bubbleStyles.userQuote);
          }
          if (chatSettings.bubbleStyles?.characterQuote) {
            setCharQuoteStyle(chatSettings.bubbleStyles.characterQuote);
          }
        } else if (userData) {
          const newNickname = userData.name || '我';
          if (newNickname !== userNickname) {
            updates.userNickname = newNickname;
          }
        } else {
          if (userNickname !== '我') {
            updates.userNickname = '我';
          }
        }

        // 更新备注名逻辑
        if (detailSettings) {
          globalCache.chatSettingsDetail[characterId] = detailSettings;
        }

        let realCharacterName = characterName;
        if (characters) {
           const found = characters.find((c: any) => c.id === characterId);
           if (found) realCharacterName = found.name;
        }

        let finalDisplayName = detailSettings?.remark;
        
        // 如果没有备注（或是空字符串/纯空格）
        if (!finalDisplayName || !finalDisplayName.trim()) {
            // 且有真实角色名（不是'未知角色'），则使用真实角色名
            if (realCharacterName && realCharacterName !== '未知角色') {
                finalDisplayName = realCharacterName;
            } else {
                // 否则使用初始传入的 characterName，如果它也不是'未知角色'
                if (characterName && characterName !== '未知角色') {
                    finalDisplayName = characterName;
                } else {
                     // 最后的回退，保持原样（可能是 '未知角色'，但至少不是空白）
                     finalDisplayName = displayName || '未知角色';
                }
            }
        }
        
        if (finalDisplayName && finalDisplayName !== displayName) {
           updates.displayName = finalDisplayName;
        }

        // 自动修复：如果没有保存过备注，且我们找到了有效的名字（不是“未知角色”），自动保存它作为备注
        // 这样可以修复下次进入时的显示，并确保ChatList等其他组件能读取到正确的名字
        if ((!detailSettings || !detailSettings.remark) && finalDisplayName && finalDisplayName !== '未知角色') {
             const newSettings = {
                ...(detailSettings || {}),
                remark: finalDisplayName,
                isPinned: detailSettings?.isPinned || false,
                background: detailSettings?.background
            };
            
            // 异步保存到数据库
            db.set(STORES.CHAT_SETTINGS, `chat_detail_settings_${characterId}`, newSettings).then(() => {
                // 更新全局缓存
                if (!globalCache.chatSettingsDetail) globalCache.chatSettingsDetail = {};
                globalCache.chatSettingsDetail[characterId] = newSettings;
                console.log('[PrivateChat] Auto-fixed missing remark with:', finalDisplayName);
            }).catch(err => {
                console.warn('[PrivateChat] Failed to auto-save remark:', err);
            });
        }

        if (characters) {
          const foundCharacter = characters.find((c: any) => c.id === characterId);
          if (foundCharacter) {
            if (foundCharacter.avatar !== characterAvatarKey) {
              updates.characterAvatarKey = foundCharacter.avatar;
            }
            if (!character || foundCharacter.id !== character?.id || foundCharacter.name !== character?.name) {
              updates.character = foundCharacter;
            }
          }
        }
        if (updates.messages !== undefined) setMessages(updates.messages);
        if (updates.userAvatarKey !== undefined) setUserAvatarKey(updates.userAvatarKey);
        if (updates.chatBackgroundKey !== undefined) setChatBackgroundKey(updates.chatBackgroundKey);
        if (updates.userNickname !== undefined) setUserNickname(updates.userNickname);
        if (updates.displayName !== undefined) setDisplayName(updates.displayName);
        if (updates.characterAvatarKey !== undefined) setCharacterAvatarKey(updates.characterAvatarKey);
        if (updates.character !== undefined) setCharacter(updates.character);
      } catch (error) {
        console.error('Failed to load chat data:', error);
      }
    };

    // 执行并行加载
    loadAllData();

    // 监听清空消息事件
    const handleMessagesClear = () => {
      setMessages([]);
      allMessagesRef.current = [];
      globalCache.messages[characterId] = []; // 同时清空全局缓存
    };

    // 监听聊天���置更新事件
    const handleSettingsUpdate = () => {
      clearCache(); // 清除缓存
      loadAllData(); // 重新加载数据
    };

    window.addEventListener('chat-messages-cleared', handleMessagesClear);
    window.addEventListener('chat-settings-updated', handleSettingsUpdate);

    // 监听来自 Service Worker 的 AI 任务完成消息
    const handleSWMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      if (type === 'AI_TASK_COMPLETED') {
        console.log('[PrivateChat] 收到 AI 任务完成消息:', payload);
        
        // 检查是否是当前聊天的任务
        if (payload.characterId === characterId) {
          // 将 AI 返回的消息添加到聊天记录
          const newMessages = payload.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          // 检查是否有系统领红包消息
          const hasClaimMessage = newMessages.some((msg: any) => 
            msg.senderId === 'system' && msg.text.includes('领取红包')
          );

          if (hasClaimMessage) {
            // 更新红包状态
            for (let i = allMessagesRef.current.length - 1; i >= 0; i--) {
              const msg = allMessagesRef.current[i];
              if (msg.senderId === 'user' && msg.redPacket && !msg.redPacket.opened) {
                // 更新为已领取
                allMessagesRef.current[i] = {
                  ...msg,
                  redPacket: {
                    ...msg.redPacket,
                    opened: true
                  }
                };
                break; // 只领取最近的一个
              }
            }
          }
          
          allMessagesRef.current = [...allMessagesRef.current, ...newMessages];
          setMessages([...allMessagesRef.current]);
          
          // 保存到数据库
          saveMessages(allMessagesRef.current);
          updateChatList(allMessagesRef.current);
          
          // 重置 AI 回复状态
          setIsAIReplying(false);
        }
      } else if (type === 'AI_TASK_FAILED') {
        console.error('[PrivateChat] AI 任务失败:', payload);
        
        // 检查是否是当前聊天的任务
        if (payload.characterId === characterId) {
          setErrorToast({ show: true, message: `AI回复失败: ${payload.error}` });
          setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
          setIsAIReplying(false);
        }
      }
    };
    
    // 处理 Service Worker 不可用时的降级方案
    const handleTaskFallback = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { taskId, task } = customEvent.detail;
      
      console.log('[PrivateChat] Service Worker 不可用，使用降级方案处理任务:', taskId);
      
      // 检查是否是当前聊天的任务
      if (task.chatId !== characterId) {
        return;
      }
      
      try {
        // 直接在前端调用 AI
        const { payload } = task;
        
        let messages = [
          { role: 'system', content: payload.systemPrompt },
          { role: 'user', content: payload.userPrompt }
        ];
        
        // 如果有待识别的图片，先调用视觉模型识别图片
        if (payload.pendingImageBase64 && payload.imageRecognitionPrompt) {
          console.log('[降级方案] 识别图片...');
          
          const visionResponse = await fetch(`${payload.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${payload.apiKey}`,
            },
            body: JSON.stringify({
              model: payload.modelName,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: payload.imageRecognitionPrompt },
                    {
                      type: 'image_url',
                      image_url: { url: payload.pendingImageBase64 }
                    }
                  ]
                }
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          });
          
          if (!visionResponse.ok) {
            throw new Error('图片识别失败');
          }
          
          const visionData = await visionResponse.json();
          const imageDescription = visionData.choices?.[0]?.message?.content || '（无法识别图片内容）';
          
          console.log('[降级方案] 图片识别结果:', imageDescription);
          
          // 将图片识别结果添加到消息中
          messages = [
            messages[0], // system prompt
            {
              role: 'user',
              content: messages[1].content + `\n\n[审神者发送了一张图片，图片内容: ${imageDescription}]`
            }
          ];
        }
        
        // 调用 AI API 生成角色回复
        const response = await fetch(`${payload.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${payload.apiKey}`,
          },
          body: JSON.stringify({
            model: payload.modelName,
            messages,
            temperature: payload.temperature,
            max_tokens: payload.maxTokens,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`AI API 返回错误: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || '';
        
        if (!aiResponse) {
          throw new Error('AI未返回有效响应');
        }
        
        console.log('[降级方案] AI 原始响应:', aiResponse);
        
        // 解析 AI 返回的 JSON 格式消息（更健壮的解析逻辑）
        let parsedResponse: any;
        let aiMessages: any[] = [];
        
        try {
          // 1. 尝试直接解析整个响应
          parsedResponse = JSON.parse(aiResponse);
          aiMessages = parsedResponse.messages || [];
        } catch (e1) {
          console.log('[降级方案] 直接解析失败，尝试提取 JSON...');
          
          try {
            // 2. 尝试提取 markdown 代码块中的 JSON
            const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlockMatch) {
              parsedResponse = JSON.parse(codeBlockMatch[1]);
              aiMessages = parsedResponse.messages || [];
            } else {
              // 3. 尝试提取第一个完整的 JSON 对象
              // 使用更智能的方法：找到第一个 { 然后匹配对应的 }
              const firstBrace = aiResponse.indexOf('{');
              if (firstBrace === -1) {
                throw new Error('响应中未找到 JSON 对象');
              }
              
              let braceCount = 0;
              let jsonEnd = -1;
              
              for (let i = firstBrace; i < aiResponse.length; i++) {
                if (aiResponse[i] === '{') braceCount++;
                if (aiResponse[i] === '}') braceCount--;
                
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
              
              if (jsonEnd === -1) {
                throw new Error('JSON 对象未正确闭合');
              }
              
              const jsonStr = aiResponse.substring(firstBrace, jsonEnd);
              parsedResponse = JSON.parse(jsonStr);
              aiMessages = parsedResponse.messages || [];
            }
          } catch (e2: any) {
            console.error('[降级方案] JSON 解析失败:', e2.message);
            console.error('[降级方案] AI 响应内容:', aiResponse);
            throw new Error(`AI响应格式错误: ${e2.message}`);
          }
        }
        
        if (aiMessages.length === 0) {
          throw new Error('AI未返回任何消息');
        }
        
        console.log('[降级方案] 解析后的消息:', aiMessages);
        
        // 构建消息对象
        const newMessages: Message[] = aiMessages.map((msg: any, index: number) => {
          // 处理系统消息（如领取红包）
          if (msg.sender === 'system') {
            return {
              id: `${Date.now()}-${index}`,
              text: msg.content,
              senderId: 'system' as const,
              senderName: '系统',
              timestamp: new Date(),
              isRead: true,
            };
          }

          // 处理伪图片消息
          if (msg.isPlaceholderImage) {
            const description = (msg.content || '').slice(0, 100);
            return {
              id: `${Date.now()}-${index}`,
              text: description,
              senderId: 'character' as const,
              senderName: displayName,
              timestamp: new Date(),
              isPlaceholderImage: true,
              isRead: true,
            };
          }
          
          // 处理红包消息
          if (msg.redPacket) {
            return {
              id: `${Date.now()}-${index}`,
              text: '[红包]',
              senderId: 'character' as const,
              senderName: displayName,
              timestamp: new Date(),
              redPacket: {
                amount: msg.redPacket.amount,
                blessing: msg.redPacket.blessing,
                opened: false,
              },
              isRead: true,
            };
          }
          
          // 普通消息或表情包消息
          const message: Message = {
            id: `${Date.now()}-${index}`,
            text: msg.stickerId ? '[表情]' : (msg.content || ''),
            senderId: 'character' as const,
            senderName: displayName,
            timestamp: new Date(),
            isRead: true,
          };
          
          // 添加表情包 ID
          if (msg.stickerId) {
            message.stickerId = msg.stickerId;
          }
          
          // 添加引用
          if (msg.quote) {
            message.quote = {
              sender: msg.quote.sender,
              content: msg.quote.content,
            };
          }
          
          return message;
        });
        
        // 检查是否有系统领红包消息
        const hasClaimMessage = newMessages.some((msg: Message) => 
          msg.senderId === 'system' && msg.text.includes('领取红包')
        );
        
        if (hasClaimMessage) {
          // 更新红包状态
          for (let i = allMessagesRef.current.length - 1; i >= 0; i--) {
            const msg = allMessagesRef.current[i];
            if (msg.senderId === 'user' && msg.redPacket && !msg.redPacket.opened) {
              allMessagesRef.current[i] = {
                ...msg,
                redPacket: {
                  ...msg.redPacket,
                  opened: true
                }
              };
              break;
            }
          }
        }
        
        // 添加到聊天记录
        allMessagesRef.current = [...allMessagesRef.current, ...newMessages];
        setMessages([...allMessagesRef.current]);
        
        await saveMessages(allMessagesRef.current);
        await updateChatList(allMessagesRef.current);
        
        setIsAIReplying(false);
      } catch (error: any) {
        console.error('[PrivateChat] 降级方案 AI 调用失败:', error);
        setErrorToast({ show: true, message: `AI回复失败: ${error.message}` });
        setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
        setIsAIReplying(false);
      }
    };
    
    // 注册 Service Worker 消息监听器
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    
    // 注册降级方案监听器
    window.addEventListener('ai-task-needs-fallback', handleTaskFallback);

    return () => {
      window.removeEventListener('chat-messages-cleared', handleMessagesClear);
      window.removeEventListener('chat-settings-updated', handleSettingsUpdate);
      window.removeEventListener('ai-task-needs-fallback', handleTaskFallback);
      
      // 移除 Service Worker 消息监听器
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      
      // 清理定时器
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      if (remeasureTimeoutRef.current) {
        clearTimeout(remeasureTimeoutRef.current);
      }
    };
  }, [characterId]);

  // 图片加载完成后强制虚拟列表重新测量（使用防抖���免频繁触发）
  const remeasureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleImageLoad = () => {
    if (remeasureTimeoutRef.current) {
      clearTimeout(remeasureTimeoutRef.current);
    }
    remeasureTimeoutRef.current = setTimeout(() => {
      setRemeasureTrigger(prev => prev + 1);
    }, 100); // 100ms 防抖
  };

  const saveMessages = async (msgs: Message[]) => {
    try {
      const key = `chat_messages_${characterId}`;
      await db.set(STORES.CHAT_MESSAGES, key, msgs);
      globalCache.messages[characterId] = msgs;
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };

  // 清除未读计数
  const clearUnreadCount = async () => {
    try {
      const chats = (await db.get<any[]>(STORES.CHATS, 'chat_list')) || [];
      const index = chats.findIndex((c: any) => c.id === characterId);
      if (index !== -1 && chats[index].unread) {
        delete chats[index].unread;
        await db.set(STORES.CHATS, 'chat_list', chats);
      }
    } catch (error) {
      console.error('Failed to clear unread count:', error);
    }
  };

  // 更新聊天列表
  const updateChatList = async (msgs: Message[]) => {
    try {
      let chats = (await db.get<any[]>(STORES.CHATS, 'chat_list')) || [];
      const existingChatIndex = chats.findIndex((chat: any) => chat.id === characterId);
      
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      let lastMessage = '开始聊天吧';
      let lastSender = '';
      
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderId === 'character') {
          lastSender = displayName;
        } else {
          lastSender = userNickname;
        }
        lastMessage = lastMsg.text;
      }
      
      // 确定聊天列表显示的名称
      // 优先级: 角色真实名称 > 传入的角色名称 > '未知角色'
      let chatListName = characterName;
      if (character?.name && character.name !== '未知角色') {
        chatListName = character.name;
      } else if (!chatListName || chatListName === '未知角色') {
        // 尝试从全局缓存找
        const cachedChar = globalCache.characters?.find((c: any) => c.id === characterId);
        if (cachedChar?.name && cachedChar.name !== '未知角色') {
          chatListName = cachedChar.name;
        }
      }

      const chatItem: any = {
        id: characterId,
        name: chatListName || '未知角色',
        lastMessage: lastMessage,
        lastSender: lastSender,
        time: timeString,
        timestamp: now.getTime(),
      };

      if (existingChatIndex !== -1) {
        const existingChat = chats[existingChatIndex];
        chatItem.isPinned = existingChat.isPinned;
        chatItem.remark = existingChat.remark;
        chats[existingChatIndex] = chatItem;
      } else {
        chats.unshift(chatItem);
      }

      await db.set(STORES.CHATS, 'chat_list', chats);
    } catch (error) {
      console.error('Failed to update chat list:', error);
    }
  };

  const handleSend = () => {
    // 只发送文本消息（不包含图片）
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        senderId: 'user',
        senderName: userNickname,
        timestamp: new Date(),
      };
      
      // 如果有回复的消息，添加quote
      if (replyingTo) {
        let quoteContent = replyingTo.text;
        if (replyingTo.isPlaceholderImage || replyingTo.imageUrl || replyingTo.imageKey) {
          quoteContent = '[图片]';
        } else if (replyingTo.stickerId) {
          quoteContent = '[表情]';
        }
        
        newMessage.quote = {
          sender: replyingTo.senderId === 'user' ? userNickname : displayName,
          content: quoteContent,
        };
      }
      
      allMessagesRef.current = [...allMessagesRef.current, newMessage];
      setMessages([...allMessagesRef.current]);
      
      saveMessages(allMessagesRef.current);
      updateChatList(allMessagesRef.current);
      
      setInputText('');
      setReplyingTo(null); // 清空回复状态
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 发送表情包
  const handleSendSticker = async (stickerId: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: '[表情]',
      senderId: 'user',
      senderName: userNickname,
      timestamp: new Date(),
      stickerId,
    };
    
    allMessagesRef.current = [...allMessagesRef.current, newMessage];
    setMessages([...allMessagesRef.current]);
    
    saveMessages(allMessagesRef.current);
    updateChatList(allMessagesRef.current);
    
    setShowStickerPicker(false);
    setShowActionsMenu(false);
  };

  // 发送拍照描述（伪图片）
  const handleSendCameraDescription = () => {
    if (!cameraDescription.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: cameraDescription.trim(),
      senderId: 'user',
      senderName: userNickname,
      timestamp: new Date(),
      isPlaceholderImage: true,
    };
    
    allMessagesRef.current = [...allMessagesRef.current, newMessage];
    setMessages([...allMessagesRef.current]);
    
    saveMessages(allMessagesRef.current);
    updateChatList(allMessagesRef.current);
    
    setShowCameraDescModal(false);
    setCameraDescription('');
  };

  const [viewingRedPacket, setViewingRedPacket] = useState<Message | null>(null);

  // 渲染红包内容
  const renderRedPacketContent = (redPacket: NonNullable<Message['redPacket']>, message: Message) => (
    <div 
      className="w-[240px] overflow-hidden rounded-lg select-none cursor-pointer active:opacity-90 transition-opacity"
      onClick={async (e) => {
        e.stopPropagation(); // 防止触发长按
        
        // 如果是AI发送的未领取红包，先领取再显示
        if (message.senderId === 'character' && !redPacket.opened) {
          // 增加余额
          const newBalance = balance + redPacket.amount;
          setBalance(newBalance);
          await db.set(STORES.USER_DATA, 'balance', newBalance);
          
          // 更新红包状态为已领取
          const updatedMessages = allMessagesRef.current.map(msg => 
            msg.id === message.id 
              ? { ...msg, redPacket: { ...msg.redPacket!, opened: true } }
              : msg
          );
          
          // 创建系统提示消息（按时间顺序添加到末尾）
          const systemMessage: Message = {
            id: `${Date.now()}-system`,
            text: `你领取了${displayName}的红包`,
            senderId: 'system',
            senderName: '系统',
            timestamp: new Date(),
            isRead: true,
          };
          
          // 将系统提示添加到消息列表末尾（按时间顺序）
          updatedMessages.push(systemMessage);
          
          allMessagesRef.current = updatedMessages;
          setMessages([...updatedMessages]);
          await saveMessages(updatedMessages);
          
          // 更新聊天列表
          updateChatList(updatedMessages);
          
          // 显示已领取的红包详情
          setViewingRedPacket({
            ...message,
            redPacket: { ...redPacket, opened: true }
          });
        } else {
          // 其他情况直接显示红包详情
          setViewingRedPacket(message);
        }
      }}
    >
      {/* 主体：扁平红 */}
      <div className="bg-[#ea5e4f] p-4 flex items-center gap-4">
        {/* 图标：扁平小判金 */}
        <div className="flex-shrink-0">
          <div className="w-[36px] h-[52px] bg-[#f4d03f] rounded-[18px] border-2 border-[#e6b333] flex flex-col items-center justify-center gap-[5px] relative">
             {/* 小判金纹理细节 - 五个等间距横线 */}
             <div className="w-[20px] h-[2px] bg-[#dba830] rounded-full opacity-80"></div>
             <div className="w-[20px] h-[2px] bg-[#dba830] rounded-full opacity-80"></div>
             <div className="w-[20px] h-[2px] bg-[#dba830] rounded-full opacity-80"></div>
             <div className="w-[20px] h-[2px] bg-[#dba830] rounded-full opacity-80"></div>
             <div className="w-[20px] h-[2px] bg-[#dba830] rounded-full opacity-80"></div>
          </div>
        </div>
        
        {/* 文本信息 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center text-white">
          <p className="text-[15px] font-medium leading-snug truncate mb-1">
            {redPacket.blessing}
          </p>
          <p className="text-[12px] opacity-85 font-normal">
            {redPacket.opened ? '已领取' : '查看红包'}
          </p>
        </div>
      </div>
      
      {/* 底部：扁平白 */}
      <div className="bg-white px-4 py-2 border-t border-black/5">
        <p className="text-[#999] text-[11px] tracking-wide">小判红包</p>
      </div>
    </div>
  );

  // 发送红包
  const handleSendRedPacket = async () => {
    const amount = parseInt(redPacketAmount);
    
    if (!amount || amount <= 0) {
      setErrorToast({ show: true, message: '请输入有效的红包金额' });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
      return;
    }
    
    // 创建红包消息
    const blessingText = redPacketBlessing.trim() || '恭喜发财，大吉大利';
    const newMessage: Message = {
      id: Date.now().toString(),
      text: '[红包]',
      senderId: 'user',
      senderName: userNickname,
      timestamp: new Date(),
      redPacket: {
        amount,
        blessing: blessingText,
        opened: false,
      },
    };
    
    allMessagesRef.current = [...allMessagesRef.current, newMessage];
    setMessages([...allMessagesRef.current]);
    
    saveMessages(allMessagesRef.current);
    updateChatList(allMessagesRef.current);
    
    // 重置状态
    setShowRedPacketModal(false);
    setRedPacketAmount('');
    setRedPacketBlessing('');
    setShowActionsMenu(false);
  };

  // 选择图片（立即发送消息显示在聊天界面，同时保持待识别状态）
  const handleSendImage = async (imageKey: string) => {
    try {
      // 1. 从imageDB获取压缩后的图片URL用于显��
      const compressedImageUrl = await getImage(imageKey);
      if (!compressedImageUrl) {
        setErrorToast({ show: true, message: '获取图片失败' });
        setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
        return;
      }
      
      // 2. 同时获取原图并转换为File对象，用于后续AI识别
      // imageKey格式：avatar_123456_chat_image，去掉_chat_image后缀得到原图key
      const originalImageKey = imageKey.replace('_chat_image', '');
      const originalImageUrl = await getImage(originalImageKey);
      if (originalImageUrl) {
        const response = await fetch(originalImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `image_${Date.now()}.jpg`, { type: blob.type });
        
        // 保存原图为待识别状态
        setPendingImage(file);
      }
      
      // 3. 立即创建并显示图片消息
      const newMessage: Message = {
        id: Date.now().toString(),
        text: '',
        senderId: 'user',
        senderName: userNickname || '审神者',
        timestamp: new Date(),
        imageKey: imageKey, // 使用压缩后的图片key
      };
      
      // 4. 添加到聊天记录
      allMessagesRef.current.push(newMessage);
      setMessages([...allMessagesRef.current]);
      
      // 5. 保存到数据库
      await saveMessages(allMessagesRef.current);
      await updateChatList(allMessagesRef.current);
      
      setShowActionsMenu(false);
    } catch (error) {
      console.error('发送图片失败:', error);
      setErrorToast({ show: true, message: '发送图片失败' });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
    }
  };
  


  const handleAIReply = async () => {
    if (isAIReplying) return;
    
    setIsAIReplying(true);
    
    try {
      // 1. 如果用户输入了文本，先发送文本消息
      if (inputText.trim()) {
        const userMessage: Message = {
          id: Date.now().toString(),
          text: inputText.trim(),
          senderId: 'user',
          senderName: userNickname,
          timestamp: new Date(),
        };
        
        // 如果有回复的消息，添加quote
        if (replyingTo) {
          let quoteContent = replyingTo.text;
          if (replyingTo.isPlaceholderImage || replyingTo.imageUrl || replyingTo.imageKey) {
            quoteContent = '[图片]';
          } else if (replyingTo.stickerId) {
            quoteContent = '[表情]';
          }
          
          userMessage.quote = {
            sender: replyingTo.senderId === 'user' ? userNickname : displayName,
            content: quoteContent,
          };
        }
        
        allMessagesRef.current = [...allMessagesRef.current, userMessage];
        setMessages([...allMessagesRef.current]);
        
        await saveMessages(allMessagesRef.current);
        await updateChatList(allMessagesRef.current);
        
        setInputText('');
        setReplyingTo(null);
      }
      
      // 2. 调用统一的 AI 任务管理器创建任务
      const taskId = await createPrivateChatReplyTask(
        {
          characterId,
          character: character || {
            id: characterId,
            name: characterName,
            description: '',
            manifestDate: undefined,
          },
          userNickname,
          displayName,
          allMessages: allMessagesRef.current,
        },
        pendingImage  // 传递待识别的图片（如果有）
      );
      
      console.log('[PrivateChat] AI 任务已创建:', taskId);
      
      // 清空待发送图片（已经在任务中处理）
      if (pendingImage) {
        setPendingImage(null);
      }
      
      // 注意：不重置 isAIReplying，等待 Service Worker 返回结果
      
    } catch (error: any) {
      console.error('[PrivateChat] 创建任务失败:', error);
      setErrorToast({ show: true, message: `AI回复失败: ${error.message}` });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
      setIsAIReplying(false); // 只在创建任务失败时才重置
    }
  };

  const handleClose = async () => {
    try {
      // 确保聊天在列表中存在（如果是新聊天但还没有消息）
      let chats = (await db.get<any[]>(STORES.CHATS, 'chat_list')) || [];
      const existingChatIndex = chats.findIndex((chat: any) => chat.id === characterId);
      
      // 如果聊天不存在且没有消息，添加一个默认的聊天项
      if (existingChatIndex === -1 && messages.length === 0) {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const chatItem: any = {
          id: characterId,
          name: characterName,
          lastMessage: '开始聊天吧',
          lastSender: '',
          time: timeString,
          timestamp: now.getTime(),
        };
        
        chats.unshift(chatItem);
        await db.set(STORES.CHATS, 'chat_list', chats);
      }
      // 如果有消息，聊天列表应该��经在发送消息时更新了，这里不需要再更新
      
      onClose();
    } catch (error) {
      console.error('Failed to save chat list:', error);
      onClose();
    }
  };

  // 长按开始
  const handleLongPressStart = (message: Message, event: React.TouchEvent | React.MouseEvent) => {
    // 在多选模式下不触发长按菜单，而是直接切换选中状态
    if (isMultiSelectMode) {
      handleToggleMessageSelect(message.id);
      return;
    }
    
    const touch = 'touches' in event ? event.touches[0] : event as React.MouseEvent;
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(message);
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowMenu(true);
    }, 500);
  };

  // 长按结束
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 复制消息
  const handleCopy = () => {
    if (selectedMessage) {
      // 使用fallback方案，兼容更多浏览器环境
      const textToCopy = selectedMessage.text;
      
      // 尝试使用现代Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            console.log('复制成功');
          })
          .catch(() => {
            // 如果失败，使用传统方法
            fallbackCopyTextToClipboard(textToCopy);
          });
      } else {
        // 浏览器不支持Clipboard API，使用传统方法
        fallbackCopyTextToClipboard(textToCopy);
      }
      
      setShowMenu(false);
      setSelectedMessage(null);
    }
  };

  // 传统复制方法（fallback）
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('复��成功（fallback）');
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
    
    document.body.removeChild(textArea);
  };



  // 删除消息
  const handleDelete = () => {
    if (selectedMessage) {
      allMessagesRef.current = allMessagesRef.current.filter(msg => msg.id !== selectedMessage.id);
      
      // 先关闭菜单
      setShowMenu(false);
      setSelectedMessage(null);
      
      // 延迟更新消息列表，确保UI先关闭
      setTimeout(() => {
        setMessages([...allMessagesRef.current]);
        saveMessages(allMessagesRef.current);
        updateChatList(allMessagesRef.current);
        
        // 等��� DOM 更新后完全重置虚拟列表
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setResetTrigger(prev => prev + 1);
          });
        });
      }, 0);
    }
  };

  // 进入多选模式
  const handleEnterMultiSelect = () => {
    setIsMultiSelectMode(true);
    setShowMenu(false);
    setSelectedMessage(null);
  };

  // 退出多选模式
  const handleExitMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedMessages(new Set());
  };

  // 切换消息选中状态
  const handleToggleMessageSelect = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // 批量删除消息
  const handleBatchDelete = () => {
    if (selectedMessages.size === 0) return;

    allMessagesRef.current = allMessagesRef.current.filter(msg => !selectedMessages.has(msg.id));
    
    // 退出多选模式
    setIsMultiSelectMode(false);
    setSelectedMessages(new Set());
    
    // 延迟更新消息列表
    setTimeout(() => {
      setMessages([...allMessagesRef.current]);
      saveMessages(allMessagesRef.current);
      updateChatList(allMessagesRef.current);
      
      // 等待 DOM 更新后完全重置虚拟列表
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setResetTrigger(prev => prev + 1);
        });
      });
    }, 0);
  };

  // 编辑消息
  const handleEdit = () => {
    if (selectedMessage) {
      setEditText(selectedMessage.text);
      setIsEditing(true);
      setShowMenu(false);
    }
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (selectedMessage && editText.trim()) {
      allMessagesRef.current = allMessagesRef.current.map(msg =>
        msg.id === selectedMessage.id ? { ...msg, text: editText } : msg
      );
      
      // 先关闭编辑界面
      setIsEditing(false);
      setSelectedMessage(null);
      setEditText('');
      
      // 延迟更新消息列表，确保UI先关闭
      setTimeout(() => {
        setMessages([...allMessagesRef.current]);
        saveMessages(allMessagesRef.current);
        updateChatList(allMessagesRef.current);
        
        // 等待 DOM 更新后完全重置虚拟列表
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setResetTrigger(prev => prev + 1);
          });
        });
      }, 0);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedMessage(null);
    setEditText('');
  };

  // 回复消息
  const handleReply = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setShowMenu(false);
      setSelectedMessage(null);
    }
  };

  // 取消回复
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    
    // 清除缓存，确保获取最新数据
    clearCache();
    
    // 重新加载所有数据
    const reloadData = async () => {
      try {
        const [saved, chatSettings, detailSettings] = await Promise.all([
          db.get<any[]>(STORES.CHAT_MESSAGES, `chat_messages_${characterId}`),
          db.get<any>(STORES.CHATS, 'chat_settings'),
          db.get<any>(STORES.CHAT_SETTINGS, `chat_detail_settings_${characterId}`),
        ]);

        // 重新加载消息
        if (saved && saved.length > 0) {
          const allMessages = saved.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          allMessagesRef.current = allMessages;
          globalCache.messages[characterId] = allMessages;
          setMessages([...allMessages]);
        } else {
          setMessages([]);
          allMessagesRef.current = [];
          globalCache.messages[characterId] = [];
        }

        if (chatSettings) {
          globalCache.chatSettings = chatSettings;
          if (chatSettings.chatBackground && chatSettings.chatBackground !== chatBackgroundKey) {
            setChatBackgroundKey(chatSettings.chatBackground);
          }
        }

        if (detailSettings) {
          globalCache.chatSettingsDetail[characterId] = detailSettings;
          const newDisplayName = detailSettings.remark || characterName;
          if (newDisplayName !== displayName) {
            setDisplayName(newDisplayName);
          }
        } else {
          if (characterName !== displayName) {
            setDisplayName(characterName);
          }
        }
      } catch (error) {
        console.error('Failed to reload data:', error);
      }
    };
    
    reloadData();
  };

  if (showSettings) {
    return (
      <ChatDetailSettings
        characterId={characterId}
        characterName={characterName}
        onClose={handleSettingsClose}
        onUpdate={() => {}}
        onDelete={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="h-16 bg-white flex items-center justify-between px-4">
        <button
          onClick={handleClose}
          className="p-2 -ml-2 active:opacity-60 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <h1 className="font-semibold text-[18px] text-[#333] text-center">
          {displayName}
        </h1>
        
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 -mr-2 active:opacity-60 transition-opacity"
        >
          <MoreHorizontal className="w-6 h-6 text-[#333]" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </button>
      </div>

      {/* 消息区域 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{
          backgroundColor: chatBackground ? 'transparent' : 'white',
          backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        }}
      >
        {allMessagesRef.current.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#999]">
              开始聊天吧
            </p>
          </div>
        ) : (
          <div 
            key={`virtual-list-${resetTrigger}`}
            style={{ 
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = virtualItems[virtualRow.index];
              
              if (!item) return null;
              
              // 渲染日期分隔符
              if (item.type === 'date') {
                return (
                  <div
                    key={item.id}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <DateSeparator dateString={item.date} />
                  </div>
                );
              }
              
              // 渲染消息
              const { message, isUserMessageRead } = item;
              
              return (
                <div
                  key={message.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-3">
                    <div className="flex items-start gap-2">
                    {/* 多选模式复选框 - 固定左侧 */}
                    {isMultiSelectMode && (
                      <div 
                        className="w-6 h-6 flex items-center justify-center cursor-pointer flex-shrink-0"
                        onClick={() => handleToggleMessageSelect(message.id)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedMessages.has(message.id) 
                            ? 'bg-[#7B9E7B] border-[#7B9E7B]' 
                            : 'bg-white border-[#ccc]'
                        }`}>
                          {selectedMessages.has(message.id) && (
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 消息内容容器 */}
                    <div className={`flex gap-2 items-start flex-1 ${message.senderId === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* 系统消息：居中显示 */}
                    {message.senderId === 'system' && (
                      <div className="w-full flex justify-center py-1">
                        <div className="bg-black/20 rounded-full px-2 py-0 flex items-center justify-center">
                          <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-white">
                            {message.text.includes('领取红包') ? `${displayName}领取了你的红包` : message.text}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* 对方消息：头像在左侧，时间戳在右侧 */}
                    {message.senderId === 'character' && (
                    <>
                      <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {characterAvatar ? (
                          <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-[#999]" strokeWidth={2} />
                        )}
                      </div>
                      
                      <div 
                        style={message.stickerId || message.isPlaceholderImage || message.redPacket || (message.imageKey && (!message.text || message.text === '[图片]')) ? {} : parseCSSToStyle(charBubbleStyle)}
                        onTouchStart={(e) => handleLongPressStart(message, e)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={(e) => handleLongPressStart(message, e)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                      >
                        {message.stickerId && stickerUrls[message.stickerId] ? (
                          <img
                            src={stickerUrls[message.stickerId]}
                            alt="表情"
                            className="max-w-[150px] max-h-[150px] rounded-lg"
                            onLoad={handleImageLoad}
                          />
                        ) : message.isPlaceholderImage ? (
                          <div className="w-[250px] h-[180px] bg-[#f0f0f0] rounded-lg flex items-center justify-center px-6 py-4">
                            <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#666] text-center">
                              [{message.text}.jpg]
                            </p>
                          </div>
                        ) : message.redPacket ? (
                          renderRedPacketContent(message.redPacket, message)
                        ) : (
                          <>
                            {message.quote && (
                              <div style={parseCSSToStyle(charQuoteStyle)}>
                                <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px]">
                                  {message.quote.sender}
                                </p>
                                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] line-clamp-2">
                                  {message.quote.content}
                                </p>
                              </div>
                            )}
                            {message.imageKey && imageUrls[message.imageKey] && (
                              <img
                                src={imageUrls[message.imageKey]}
                                alt="图片"
                                className={`max-w-[250px] max-h-[250px] rounded-lg ${message.text && message.text !== '[图片]' ? 'mb-2' : ''}`}
                                onLoad={handleImageLoad}
                              />
                            )}
                            {message.text && message.text !== '[图片]' && (
                              <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] break-words">
                                {message.text}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-start gap-0.5 ml-1 self-end">
                        <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#999]">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#999]">
                          {message.isRead ? '已读' : '未读'}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {/* 用户消息：时间戳在左侧，头像在右侧 */}
                  {message.senderId === 'user' && (
                    <>
                      <div className="flex flex-col items-end gap-0.5 mr-1 self-end">
                        <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#999]">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#999]">
                          {isUserMessageRead ? '已读' : '未读'}
                        </span>
                      </div>
                      
                      <div 
                        style={message.stickerId || message.isPlaceholderImage || message.redPacket || (message.imageKey && (!message.text || message.text === '[图片]')) ? {} : parseCSSToStyle(userBubbleStyle)}
                        onTouchStart={(e) => handleLongPressStart(message, e)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={(e) => handleLongPressStart(message, e)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                      >
                        {message.stickerId && stickerUrls[message.stickerId] ? (
                          <img
                            src={stickerUrls[message.stickerId]}
                            alt="表情"
                            className="max-w-[150px] max-h-[150px] rounded-lg"
                            onLoad={handleImageLoad}
                          />
                        ) : message.isPlaceholderImage ? (
                          <div className="w-[250px] h-[180px] bg-[#f0f0f0] rounded-lg flex items-center justify-center px-6 py-4">
                            <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#666] text-center">
                              [{message.text}.jpg]
                            </p>
                          </div>
                        ) : message.redPacket ? (
                          renderRedPacketContent(message.redPacket, message)
                        ) : (
                          <>
                            {message.quote && (
                              <div style={parseCSSToStyle(userQuoteStyle)}>
                                <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px]">
                                  {message.quote.sender}
                                </p>
                                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] line-clamp-2">
                                  {message.quote.content}
                                </p>
                              </div>
                            )}
                            {message.imageKey && imageUrls[message.imageKey] && (
                              <img
                                src={imageUrls[message.imageKey]}
                                alt="图片"
                                className={`max-w-[250px] max-h-[250px] rounded-lg ${message.text && message.text !== '[图片]' ? 'mb-2' : ''}`}
                                onLoad={handleImageLoad}
                              />
                            )}
                            {message.text && message.text !== '[图片]' && (
                              <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] break-words">
                                {message.text}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {userAvatar ? (
                          <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-[#999]" strokeWidth={2} />
                        )}
                      </div>
                    </>
                  )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 多选模式底部操作栏 */}
      {isMultiSelectMode && (
        <div className="bg-white border-t border-[#e5e5e5] px-4 py-3 safe-area-inset-bottom flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#666]">
              已选择 {selectedMessages.size} 条消息
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExitMultiSelect}
              className="px-4 py-2 rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#666] bg-[#f5f5f5] active:bg-[#e8e8e8] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={selectedMessages.size === 0}
              className={`px-4 py-2 rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-white transition-colors ${
                selectedMessages.size === 0 
                  ? 'bg-[#ccc] cursor-not-allowed' 
                  : 'bg-red-500 active:opacity-80'
              }`}
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 底部输入栏 */}
      {!isMultiSelectMode && (
        <div className="bg-white px-3 py-2 safe-area-inset-bottom">
        {/* 回复状态栏 */}
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between bg-[#f5f5f5] p-2 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#666]">
                回复 {replyingTo.senderId === 'user' ? userNickname : displayName}
              </p>
              <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-[#333] truncate">
                {replyingTo.isPlaceholderImage || replyingTo.imageUrl || replyingTo.imageKey 
                  ? '[图片]' 
                  : replyingTo.stickerId 
                  ? '[表情]' 
                  : replyingTo.text}
              </p>
            </div>
            <button 
              onClick={handleCancelReply}
              className="ml-2 p-1 active:bg-[#e8e8e8] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#666]" />
            </button>
          </div>
        )}
        
        {/* 待发送图片预览 */}
        {pendingImagePreview && (
          <div className="mb-2 flex items-start gap-2 bg-[#f5f5f5] p-2 rounded-lg">
            <img 
              src={pendingImagePreview} 
              alt="待发送" 
              className="w-20 h-20 object-cover rounded-lg"
            />
            <button 
              onClick={handleCancelPendingImage}
              className="ml-auto p-1 active:bg-[#e8e8e8] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#666]" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* 左侧AI回复图标 */}
          <button 
            onClick={handleAIReply}
            disabled={isAIReplying}
            className={`w-10 h-10 flex items-center justify-center transition-opacity flex-shrink-0 ${
              isAIReplying ? 'opacity-40' : 'active:opacity-60'
            }`}
          >
            <svg className="w-5 h-5 text-[#333]" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"></path>
              <path d="M20 1L20.7 3.3L23 4L20.7 4.7L20 7L19.3 4.7L17 4L19.3 3.3Z" fill="currentColor"></path>
              <path d="M4 17L4.5 18.5L6 19L4.5 19.5L4 21L3.5 19.5L2 19L3.5 18.5Z" fill="currentColor"></path>
            </svg>
          </button>

          {/* 中间输入框 */}
          <div className="flex-1 bg-[#f5f5f5] rounded-lg px-4 py-2 min-h-[40px] max-h-[100px] flex items-center">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                setShowActionsMenu(false);
                setShowStickerPicker(false);
              }}
              className="w-full resize-none outline-none font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] placeholder:text-[#999] bg-transparent leading-normal"
              rows={1}
              style={{
                maxHeight: '68px',
                overflowY: 'auto',
              }}
            />
          </div>

          {/* 右侧按钮 */}
          {inputText.trim() === '' ? (
            <button 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="w-10 h-10 flex items-center justify-center active:opacity-60 transition-opacity flex-shrink-0"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          ) : (
            <button 
              onClick={handleSend}
              className="w-10 h-10 bg-[#7B9E7B] rounded-full flex items-center justify-center active:opacity-80 transition-opacity flex-shrink-0"
            >
              <ArrowUp className="w-6 h-6 text-white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </button>
          )}
        </div>
      </div>
      )}

      {/* 功能菜单 (表情、图片等) */}
      {showActionsMenu && (
        <div className="absolute bottom-[70px] right-3 bg-white rounded-xl shadow-lg z-[998] p-2">
          <div className="grid grid-cols-4 gap-2">
            {/* 表情包 */}
            <button 
              onClick={() => {
                setShowStickerPicker(true);
                setShowActionsMenu(false);
              }}
              className="p-0 bg-transparent border-none cursor-pointer"
            >
              <div className="w-[50px] h-[50px] bg-white rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] active:bg-[#e8e8e8] transition-colors">
                <Smile className="w-[24px] h-[24px] text-[#333]" strokeWidth={2.5} />
              </div>
            </button>
            
            {/* ��片 */}
            <ImagePicker
              onImageSelect={handleSendImage}
              onError={(error) => {
                setErrorToast({ show: true, message: error });
                setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
              }}
            >
              <button 
                className="p-0 bg-transparent border-none cursor-pointer"
              >
                <div className="w-[50px] h-[50px] bg-white rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] active:bg-[#e8e8e8] transition-colors">
                  <ImageIcon className="w-[24px] h-[24px] text-[#333]" strokeWidth={2.5} />
                </div>
              </button>
            </ImagePicker>

            {/* 拍照 */}
            <button 
              onClick={() => {
                setShowActionsMenu(false);
                setShowCameraDescModal(true);
              }}
              className="p-0 bg-transparent border-none cursor-pointer"
            >
              <div className="w-[50px] h-[50px] bg-white rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] active:bg-[#e8e8e8] transition-colors">
                <Camera className="w-[24px] h-[24px] text-[#333]" strokeWidth={2.5} />
              </div>
            </button>

            {/* 红包 */}
            <button 
              onClick={() => {
                setShowRedPacketModal(true);
                setShowActionsMenu(false);
              }}
              className="p-0 bg-transparent border-none cursor-pointer"
            >
              <div className="w-[50px] h-[50px] bg-white rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] active:bg-[#e8e8e8] transition-colors">
                <svg 
                  className="w-[22px] h-[22px] text-[#333]" 
                  viewBox="80 80 864 864" 
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  strokeWidth="20"
                >
                  <path d="M604.928 416.682667a425.856 425.856 0 0 0 205.952-111.872V170.794667h-597.333333v134.016a425.813333 425.813333 0 0 0 205.952 111.872 106.666667 106.666667 0 0 1 185.429333 0z m8.874667 85.333333a106.709333 106.709333 0 0 1-203.178667 0 509.482667 509.482667 0 0 1-197.12-85.973333v437.418666h597.333333V416a509.525333 509.525333 0 0 1-197.034666 86.016zM170.88 85.504h682.666667a42.666667 42.666667 0 0 1 42.666666 42.666667v768a42.666667 42.666667 0 0 1-42.666666 42.666666h-682.666667a42.666667 42.666667 0 0 1-42.666667-42.666666v-768a42.666667 42.666667 0 0 1 42.666667-42.666667z"/>
                </svg>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 表情选择器 */}
      {showStickerPicker && (
        <StickerPicker 
          onClose={() => setShowStickerPicker(false)}
          onSelect={handleSendSticker}
        />
      )}

      {/* 拍照描述弹窗 */}
      {showCameraDescModal && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] shadow-xl">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-4">
              拍照
            </h3>
            <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#666] text-center mb-4">
              请描述您想发送的图片内容
            </p>
            <input
              type="text"
              value={cameraDescription}
              onChange={(e) => setCameraDescription(e.target.value)}
              placeholder="例如：一支玫瑰"
              className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none outline-none font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333] mb-6"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && cameraDescription.trim()) {
                  handleSendCameraDescription();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCameraDescModal(false);
                  setCameraDescription('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSendCameraDescription}
                disabled={!cameraDescription.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#7B9E7B] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 红包弹窗 */}
      {showRedPacketModal && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[360px] shadow-xl">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-4">
              发红包
            </h3>
            
            {/* 金额输入 */}
            <div className="mb-4">
              <label className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#666] mb-2 block">
                红包金额
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={redPacketAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setRedPacketAmount(val);
                    }
                  }}
                  placeholder="0"
                  className="w-full px-4 py-3 pr-16 rounded-xl bg-[#f5f5f5] border-none outline-none font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-[#333] placeholder:text-[#999]"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#999]">
                  小判
                </span>
              </div>
            </div>
            
            {/* 祝���语输入 */}
            <div className="mb-6">
              <label className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#666] mb-2 block">
                红包祝福语（可选）
              </label>
              <input
                type="text"
                value={redPacketBlessing}
                onChange={(e) => setRedPacketBlessing(e.target.value)}
                placeholder="恭喜发财，大吉大利"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none outline-none font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333] placeholder:text-[#999]"
              />
            </div>
            
            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRedPacketModal(false);
                  setRedPacketAmount('');
                  setRedPacketBlessing('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSendRedPacket}
                className="flex-1 py-2.5 rounded-xl bg-[#ff6b6b] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity"
              >
                塞钱进红包
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 长按菜单 */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-[70]" 
          onClick={() => {
            setShowMenu(false);
            setSelectedMessage(null);
          }}
        >
          <div 
            className="absolute bg-white rounded-lg shadow-lg py-1 min-w-[120px]"
            style={{
              left: Math.min(menuPosition.x, window.innerWidth - 140),
              top: Math.min(menuPosition.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCopy}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#f5f5f5] transition-colors"
            >
              <Copy className="w-4 h-4 text-[#666]" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333]">复制</span>
            </button>
            <button
              onClick={handleReply}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#f5f5f5] transition-colors"
            >
              <Reply className="w-4 h-4 text-[#666]" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333]">回复</span>
            </button>
            <button
              onClick={handleEdit}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#f5f5f5] transition-colors"
            >
              <Edit3 className="w-4 h-4 text-[#666]" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333]">编辑</span>
            </button>
            <button
              onClick={handleEnterMultiSelect}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#f5f5f5] transition-colors"
            >
              <Check className="w-4 h-4 text-[#666]" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333]">多选</span>
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#f5f5f5] transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-red-500">删除</span>
            </button>
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      {isEditing && selectedMessage && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[360px] shadow-xl">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-4">
              编辑消息
            </h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none outline-none font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333] resize-none mb-6 focus:bg-[#ebebeb] transition-colors"
              rows={4}
              autoFocus
              placeholder="请输入消息内容"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-[#7B9E7B] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示弹窗 */}
      {errorToast.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-[90vw]">
          <div className="bg-[#ff3b30] rounded-[12px] px-5 py-4 shadow-lg max-w-md mx-auto max-h-[60vh] overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-white mb-1">
                  调用失败
                </p>
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-white/90 leading-relaxed break-words whitespace-pre-wrap">
                  {errorToast.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 查看红包弹窗 */}
      {viewingRedPacket && viewingRedPacket.redPacket && (
        <div 
          className="fixed inset-0 z-[1300] flex items-center justify-center animate-in fade-in duration-200"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setViewingRedPacket(null)}
        >
          {/* 红包详情卡片 */}
          <div 
            className="bg-[#ea5e4f] w-[320px] rounded-[8px] overflow-hidden relative shadow-2xl transform transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
             {/* 关闭按钮 */}
             <button 
               onClick={() => setViewingRedPacket(null)}
               className="absolute top-3 left-3 z-10 text-white/70 hover:text-white active:opacity-50 transition-colors"
             >
               <X size={20} />
             </button>

             {/* 顶部：信息区域 */}
             <div className="pt-12 pb-8 px-6 flex flex-col items-center text-white relative">
               {/* 小判金装饰 (半圆) */}
               <div className="absolute top-[-100px] w-[500px] h-[300px] bg-[#d95345] rounded-[50%] -z-0"></div>
               
               {/* 头像 */}
               <div className="w-16 h-16 rounded-full border-2 border-[#fcdb9a] bg-white p-0.5 mb-3 z-10 shadow-md">
                 <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                   {viewingRedPacket.senderId === 'user' ? (
                     userAvatar ? <img src={userAvatar} alt="User" className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-gray-400" />
                   ) : (
                     characterAvatar ? <img src={characterAvatar} alt="Character" className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-gray-400" />
                   )}
                 </div>
               </div>
               
               {/* 发送者 */}
               <h3 className="text-[16px] font-medium mb-1 tracking-wide z-10">
                 {viewingRedPacket.senderName}的红包
               </h3>
               
               {/* 祝福语 */}
               <p className="text-[14px] opacity-80 mb-12 tracking-wide z-10">
                 {viewingRedPacket.redPacket.blessing}
               </p>
               
               {/* 金额展示 - 仅发送者或已领取可见 */}
               <div className="z-10 flex flex-col items-center">
                 <div className="text-[48px] font-bold leading-none tracking-tighter text-[#fcdb9a] mb-3 flex items-baseline gap-1">
                   <span>{viewingRedPacket.redPacket.amount.toLocaleString()}</span>
                   <span className="text-[14px] font-normal tracking-normal opacity-80">小判</span>
                 </div>
                 
                 <div className="text-[12px] text-[#fcdb9a]/80 tracking-wide flex items-center gap-1">
                    <span>
                      {viewingRedPacket.senderId === 'user' 
                        ? (viewingRedPacket.redPacket.opened ? '对方已领取' : '等待对方领取')
                        : '已存入余额'
                      }
                    </span>
                 </div>
               </div>
             </div>
             
             {/* 底部：领取状态 */}
             <div className="bg-white px-4 py-4 min-h-[80px]">
               <div className="border-b border-gray-100 pb-2 mb-2">
                 <p className="text-[12px] text-gray-400 tracking-wide">
                   1个红包共{viewingRedPacket.redPacket.amount}小判
                 </p>
               </div>
               
               {/* 仅当红包已领取或非用户发送时显示领取记录 */}
               {(viewingRedPacket.redPacket.opened || viewingRedPacket.senderId !== 'user') ? (
                 <div className="flex items-center justify-between py-2">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                       {/* 接收者头像: 如果是用户发的，接收者是角色；如果是角色发的，接收者是用户 */}
                       {viewingRedPacket.senderId === 'user' ? (
                         characterAvatar ? <img src={characterAvatar} alt="Receiver" className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-400" />
                       ) : (
                         userAvatar ? <img src={userAvatar} alt="Receiver" className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-400" />
                       )}
                     </div>
                     <div>
                       <p className="text-[14px] text-[#333] font-medium leading-tight">
                         {viewingRedPacket.senderId === 'user' ? displayName : userNickname}
                       </p>
                       <p className="text-[12px] text-gray-400 mt-0.5">
                         {formatMessageTime(viewingRedPacket.timestamp)}
                       </p>
                     </div>
                   </div>
                   
                   <div className="text-right">
                     <p className="text-[14px] text-[#333] font-medium">
                       {viewingRedPacket.redPacket.amount.toLocaleString()} 小判
                     </p>
                   </div>
                 </div>
               ) : (
                 <div className="py-8 text-center text-gray-400 text-[13px]">
                   等待对方领取...
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}