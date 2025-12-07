import { MessageCircle, Mail, Settings, UserPlus, Users, X } from "lucide-react";
import { useState, useEffect } from "react";
import ChatSettings from "./ChatSettings";
import { db, STORES } from "../utils/db";
import { getDisplayName } from "../utils/chatCache";

interface Character {
  id: string;
  name: string;
  avatar: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  lastSender?: string;
  time: string;
  timestamp?: number; // 添加时间戳用于精确排序
  memberCount?: number;
  unread?: number;
  remark?: string;
  isPinned?: boolean;
}

interface ChatListProps {
  onClose: () => void;
  onOpenChat: (characterId: string, characterName: string) => void;
}

export default function ChatList({ onClose, onOpenChat }: ChatListProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications' | 'settings'>('messages');
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSelectCharacter, setShowSelectCharacter] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    loadChats();
    loadCharacters();

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // 监听来自 Service Worker 的 AI 任务完成消息
    const handleSWMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      if (type === 'AI_TASK_COMPLETED') {
        console.log('[ChatList] 收到 AI 任务完成消息，刷新聊天列表');
        // 刷新聊天列表以更新最后消息和未读数
        loadChats();
      }
    };
    
    // 注册 Service Worker 消息监听器
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    
    return () => {
      // 清理监听器
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // 格式化聊天列表的时间显示
  const formatChatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const msgTime = new Date(timestamp);
    
    // 重置到当天的0点，用于准确判断是否同一天
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const msgDay = new Date(msgTime);
    msgDay.setHours(0, 0, 0, 0);
    
    // 计算相差天数
    const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
    
    const hours = msgTime.getHours().toString().padStart(2, '0');
    const minutes = msgTime.getMinutes().toString().padStart(2, '0');
    
    // 当天：显示时间
    if (diffDays === 0) {
      return `${hours}:${minutes}`;
    }
    
    // 昨天：显示"昨天 HH:MM"
    if (diffDays === 1) {
      return `昨天 ${hours}:${minutes}`;
    }
    
    // 一周内但非昨天：显示星期
    if (diffDays < 7) {
      const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return weekDays[msgTime.getDay()];
    }
    
    // 同年但非一周内：显示月/日
    if (now.getFullYear() === msgTime.getFullYear()) {
      const month = msgTime.getMonth() + 1;
      const day = msgTime.getDate();
      return `${month}/${day}`;
    }
    
    // 不同年：显示年/月/日
    const year = msgTime.getFullYear();
    const month = msgTime.getMonth() + 1;
    const day = msgTime.getDate();
    return `${year}/${month}/${day}`;
  };

  const loadChats = async () => {
    try {
      const saved = await db.get<ChatItem[]>(STORES.CHATS, 'chat_list');
      if (saved) {
        // 加载每个聊天的备注和置顶状态，并格式化时间显示
        const chatData = await Promise.all(saved.map(async (chat: ChatItem) => {
          const settingsKey = `chat_detail_settings_${chat.id}`;
          const settings = await db.get<any>(STORES.CHAT_SETTINGS, settingsKey);
          
          // 使用timestamp格式化显示时间
          const formattedTime = formatChatTime(chat.timestamp);
          
          if (settings) {
            return {
              ...chat,
              remark: settings.remark || chat.remark,
              isPinned: settings.isPinned !== undefined ? settings.isPinned : chat.isPinned,
              time: formattedTime, // 使用格式化后的时间
            };
          }
          return {
            ...chat,
            time: formattedTime, // 使用格式化后的时间
          };
        }));
        
        // 排序：置顶的在前面按时间排序，未置顶的在后面按时间排序
        chatData.sort((a: ChatItem, b: ChatItem) => {
          // 如果置顶状态不同，置顶的排前面
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // 如果置顶状态相同，按时间戳排序（新的在前）
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeB - timeA;
        });
        
        setChats(chatData);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      setChats([]);
    }
  };

  const loadCharacters = async () => {
    try {
      const chars = await db.get<Character[]>(STORES.CHARACTERS, 'characters');
      if (chars) {
        setCharacters(chars);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const handleAddChat = () => {
    setShowAddMenu(!showAddMenu);
  };

  const handleCreateGroup = () => {
    setShowAddMenu(false);
    console.log('Create group');
  };

  const handleAddFriend = () => {
    setShowAddMenu(false);
    setShowSelectCharacter(true);
  };

  const handleSelectCharacter = async (character: Character) => {
    setShowSelectCharacter(false);
    
    // 优先从缓存读取备注名（零延迟）
    const cachedDisplayName = getDisplayName(character.id, character.name);
    
    // 如果缓存中没有，异步从数据库读取（仅第一次）
    if (cachedDisplayName === character.name) {
      const settingsKey = `chat_detail_settings_${character.id}`;
      const settings = await db.get<any>(STORES.CHAT_SETTINGS, settingsKey);
      const displayName = settings?.remark || character.name;
      onOpenChat(character.id, displayName);
    } else {
      // 使用缓存的备注名
      onOpenChat(character.id, cachedDisplayName);
    }
  };

  const handleChatClick = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      // 优先从缓存读取备注名
      // 如果没有备注且名字是未知角色，尝试查找真实名字
      let realName = chat.name;
      if (realName === '未知角色' || !realName) {
         const char = characters.find(c => c.id === chatId);
         if (char) realName = char.name;
      }
      
      const displayName = getDisplayName(chatId, chat.remark || realName);
      onOpenChat(chatId, displayName);
    }
  };

  // 根据activeTab返回不同的标题
  const getTitle = () => {
    switch (activeTab) {
      case 'messages':
        return '消息';
      case 'notifications':
        return '信箱';
      case 'settings':
        return '设置';
      default:
        return '消息';
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white">
        <div className="h-16 flex items-center justify-between px-4 relative">
          <button
            onClick={onClose}
            className="p-2 -ml-2 active:opacity-60 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-[18px] text-[#333]">
            {getTitle()}
          </h1>
          
          {activeTab === 'messages' && (
            <button
              onClick={handleAddChat}
              className="p-2 -mr-2 active:opacity-60 transition-opacity relative font-normal"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          )}
          {activeTab !== 'messages' && <div className="w-11" />}
        </div>
      </div>

      {/* 添加菜单 */}
      {showAddMenu && (
        <>
          <div 
            className="fixed inset-0 z-[51]" 
            onClick={() => setShowAddMenu(false)}
          />
          <div className="absolute right-4 top-[68px] bg-white rounded-lg shadow-lg z-[52] overflow-hidden">
            <button
              onClick={handleCreateGroup}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#f5f5f5] transition-colors"
            >
              <Users className="w-6 h-6 text-[#333]" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] whitespace-nowrap">
                创建群聊
              </span>
            </button>
            <button
              onClick={handleAddFriend}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#f5f5f5] transition-colors"
            >
              <UserPlus className="w-6 h-6 text-[#333]" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] whitespace-nowrap">
                加好友
              </span>
            </button>
          </div>
        </>
      )}

      {/* 选择刀剑男士弹窗 */}
      {showSelectCharacter && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-64 max-h-96 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0]">
              <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333]">
                发起聊天
              </h3>
              <button
                onClick={() => setShowSelectCharacter(false)}
                className="p-1 active:bg-[#f5f5f5] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#666]" strokeWidth={2} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#999]">
                    暂无刀剑男士
                  </p>
                  <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#ccc] mt-1">
                    请先在组织中添加
                  </p>
                </div>
              ) : (
                characters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => handleSelectCharacter(character)}
                    className="w-full flex items-center px-5 py-2.5 active:bg-[#f5f5f5] transition-colors"
                  >
                    <div className="flex-1 text-center">
                      <h3 className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333]">
                        {character.name}
                      </h3>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 聊天列表 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeTab === 'messages' && (
          <>
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
                  <MessageCircle className="w-9 h-9 text-[#ccc]" strokeWidth={2.5} />
                </div>
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#999]">
                  暂无消息
                </p>
              </div>
            ) : (
              <div className="bg-white">
                {chats.map((chat, index) => (
                  <div key={chat.id}>
                    <button
                      onClick={() => handleChatClick(chat.id)}
                      className={`w-full px-4 py-3.5 active:bg-[#f5f5f5] transition-colors flex items-start text-left ${chat.isPinned ? 'bg-[#f9f9f9]' : 'bg-white'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[17px] text-[#333] truncate">
                              {chat.remark || ((chat.name === '未知角色' || !chat.name) && characters.find(c => c.id === chat.id)?.name) || chat.name}
                            </h3>
                            {chat.memberCount && (
                              <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#999] flex-shrink-0">
                                ({chat.memberCount})
                              </span>
                            )}
                          </div>
                          {chat.time && (
                            <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#999] flex-shrink-0 ml-2">
                              {chat.time}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#999] truncate flex-1 pr-2">
                            {(() => {
                              // 处理消息预览中的发送者名字
                              let senderName = chat.lastSender;
                              
                              // 如果发送者名字是'未知角色'，或者是空，且最后一条消息不是用户发的（简单判断：如果chat.lastSender等于chat.name或者chat.remark）
                              // 这里我们主要修正'未知角色'的情况
                              if (senderName === '未知角色') {
                                // 尝试找到真实名字
                                const realName = characters.find(c => c.id === chat.id)?.name;
                                if (realName && realName !== '未知角色') {
                                  senderName = chat.remark || realName;
                                }
                              }
                              
                              return senderName ? `${senderName}：${chat.lastMessage}` : chat.lastMessage;
                            })()}
                          </p>
                          {chat.unread !== undefined && chat.unread > 0 && (
                            <span className="min-w-[18px] h-[18px] bg-[#ff4d4f] text-white text-[11px] font-medium flex items-center justify-center rounded-full px-1.5 flex-shrink-0">
                              {chat.unread > 99 ? '99+' : chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {index < chats.length - 1 && (
                      <div className="border-b border-[#f0f0f0]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'notifications' && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
              <Mail className="w-9 h-9 text-[#ccc]" strokeWidth={2.5} />
            </div>
            <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#999]">
              暂无信件
            </p>
          </div>
        )}
        
        {activeTab === 'settings' && <ChatSettings />}
      </div>

      {/* 底部导航栏 */}
      <div className="h-[64px] bg-white flex items-center justify-around px-4 safe-area-inset-bottom">
        <button
          onClick={() => setActiveTab('messages')}
          className="flex flex-col items-center justify-center gap-1 py-1.5 px-6 active:opacity-60 transition-opacity"
        >
          <MessageCircle 
            className={`w-6 h-6 ${activeTab === 'messages' ? 'text-[#7B9E7B]' : 'text-[#999]'}`}
            strokeWidth={2.5}
          />
          <span className={`font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] ${activeTab === 'messages' ? 'text-[#7B9E7B]' : 'text-[#999]'}`}>
            消息
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className="flex flex-col items-center justify-center gap-1 py-1.5 px-6 active:opacity-60 transition-opacity"
        >
          <Mail 
            className={`w-6 h-6 ${activeTab === 'notifications' ? 'text-[#7B9E7B]' : 'text-[#999]'}`}
            strokeWidth={2.5}
          />
          <span className={`font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] ${activeTab === 'notifications' ? 'text-[#7B9E7B]' : 'text-[#999]'}`}>
            信箱
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className="flex flex-col items-center justify-center gap-1 py-1.5 px-6 active:opacity-60 transition-opacity"
        >
          <Settings 
            className={`w-6 h-6 ${activeTab === 'settings' ? 'text-[#7B9E7B]' : 'text-[#999]'}`}
            strokeWidth={2.5}
          />
          <span className={`font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] ${activeTab === 'settings' ? 'text-[#7B9E7B]' : 'text-[#999]'}`}>
            设置
          </span>
        </button>
      </div>
    </div>
  );
}