import { toast } from "sonner@2.0.3";
import { useState, useRef, useEffect } from "react";
import Desktop1 from "./Desktop1";
import Desktop2 from "./Desktop2";
import BottomAppBar from "./BottomAppBar";
import SlideIndicator from "./SlideIndicator";
import SettingsContainer from "./SettingsContainer";
import WorldBookContainer from "./WorldBookContainer";
import CharacterContainer from "./CharacterContainer";
import ChatContainer from "./ChatContainer";
import HealthContainer from "./HealthContainer";
import { db, STORES } from "../utils/db";
import { getImage } from "../utils/imageDB";
import img6 from "figma:asset/e73c536866ed52e7d0ef00c933c627e72d682b14.png";

interface UserData {
  name: string;
  country: string;
  fortress: string;
  date: string;
}

export default function SwipeableDesktop({ userData, preloadedImages = {}, initialChatId }: { userData: UserData; preloadedImages?: Record<string, string | null>; initialChatId?: string | null }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [localUserData, setLocalUserData] = useState(userData);
  const [showSettings, setShowSettings] = useState(false);
  const [showWorldBook, setShowWorldBook] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [pendingChatId, setPendingChatId] = useState<string | null>(initialChatId || null);
  const [wallpaper, setWallpaper] = useState<string | null>(preloadedImages['desktop_wallpaper'] || null);
  
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 用于在事件监听器中访问最新状态
  const showChatRef = useRef(showChat);
  const pendingChatIdRef = useRef(pendingChatId);

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    pendingChatIdRef.current = pendingChatId;
  }, [pendingChatId]);

  useEffect(() => {
    if (initialChatId) {
      setShowChat(true);
      setPendingChatId(initialChatId);
    }
  }, [initialChatId]);

  // 监听 Service Worker 消息
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'open-conversation') {
        const { conversationId } = event.data;
        setShowChat(true);
        setPendingChatId(conversationId);
      }

      // 处理 AI 回复完成的消息
      if (event.data.type === 'AI_TASK_COMPLETED') {
        const { messages, characterId, displayName } = event.data.payload;
        if (!messages || messages.length === 0) return;
        
        const lastMsg = messages[messages.length - 1];
        const senderName = displayName || lastMsg.senderName || '新消息';
        
        // 如果聊天界面未打开，或者打开的不是当前角色的聊天
        const isChatOpen = showChatRef.current;
        const currentChatId = pendingChatIdRef.current;
        
        // 只有当聊天应用完全关闭时才弹窗（如果在聊天应用内，无论是列表还是对话页，都不弹系统通知）
        if (!isChatOpen) {
          toast(senderName, {
            description: lastMsg.text,
            action: {
              label: '查看',
              onClick: () => {
                setShowChat(true);
                setPendingChatId(characterId);
              }
            },
            duration: 5000,
          });
        }
      }

      if (event.data.type === 'AI_TASK_FAILED') {
        const { characterId, error } = event.data.payload;
        
        // 如果聊天界面未打开，或者打开的不是当前角色的聊天
        const isChatOpen = showChatRef.current;
        const currentChatId = pendingChatIdRef.current;
        
        // 只有当不在当前聊天界面时才弹窗（在当前界面会有 PrivateChat 处理）
        if (!isChatOpen || currentChatId !== characterId) {
          toast.error('消息发送失败', {
            description: error,
            duration: 5000,
          });
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  useEffect(() => {
    // 加载保存的壁纸
    const loadWallpaper = async () => {
      try {
        const savedWallpaperKey = await db.get<string>(STORES.MISC, 'desktop_wallpaper');
        if (savedWallpaperKey) {
          // 检查是否是 Base64（旧数据）还是 key（新数据）
          if (savedWallpaperKey.startsWith('data:')) {
            // 旧的 Base64 格式，直接使用
            setWallpaper(savedWallpaperKey);
          } else {
            // 新的 key 格式，从图片数据库读取
            const url = await getImage(savedWallpaperKey);
            setWallpaper(url);
          }
        }
      } catch (error) {
        console.error('Failed to load wallpaper:', error);
      }
    };
    
    loadWallpaper();

    // 监听壁纸变化事件（事件中传递的已经是 URL）
    const handleWallpaperChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setWallpaper(customEvent.detail);
    };

    window.addEventListener('wallpaperChange', handleWallpaperChange);
    return () => {
      window.removeEventListener('wallpaperChange', handleWallpaperChange);
    };
  }, []);

  const handleUserDataChange = (newData: UserData) => {
    setLocalUserData(newData);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleWorldBookClick = () => {
    setShowWorldBook(true);
  };

  const handleCloseWorldBook = () => {
    setShowWorldBook(false);
  };

  const handleCharacterClick = () => {
    setShowCharacter(true);
  };

  const handleCloseCharacter = () => {
    setShowCharacter(false);
  };

  const handleHealthClick = () => {
    setShowHealth(true);
  };

  const handleCloseHealth = () => {
    setShowHealth(false);
  };

  const handleChatClick = () => {
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  const handleChatChange = (chatId: string | null) => {
    setPendingChatId(chatId);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    const offset = currentPage * -50; // 修改：从-100改为-50
    
    // 限制滑动范围
    const newTranslate = offset + (diff / window.innerWidth) * 50; // 修改：从100改为50
    if (newTranslate <= 0 && newTranslate >= -50) { // 修改：从-100改为-50
      setTranslateX(newTranslate);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = currentX.current - startX.current;
    const threshold = window.innerWidth * 0.3; // 30% of screen width
    
    if (diff < -threshold && currentPage === 0) {
      // 向左滑动，切换到第2页
      setCurrentPage(1);
      setTranslateX(-50); // 修改：从-100改为-50
    } else if (diff > threshold && currentPage === 1) {
      // 向右滑动，切换到第1页
      setCurrentPage(0);
      setTranslateX(0);
    } else {
      // 回到当前页
      setTranslateX(currentPage * -50); // 修改：从-100改为-50
    }
    
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    currentX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    const offset = currentPage * -50; // 修改：从-100改为-50
    
    // 限制滑动范围
    const newTranslate = offset + (diff / window.innerWidth) * 50; // 修改：从100改为50
    if (newTranslate <= 0 && newTranslate >= -50) { // 修改：从-100改为-50
      setTranslateX(newTranslate);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const diff = currentX.current - startX.current;
    const threshold = window.innerWidth * 0.3; // 30% of screen width
    
    if (diff < -threshold && currentPage === 0) {
      // 向左滑动，切换到第2页
      setCurrentPage(1);
      setTranslateX(-50); // 修改：从-100改为-50
    } else if (diff > threshold && currentPage === 1) {
      // 向右滑动，切换到第1页
      setCurrentPage(0);
      setTranslateX(0);
    } else {
      // 回到当前页
      setTranslateX(currentPage * -50); // 修改：从-100改为-50
    }
    
    setIsDragging(false);
  };

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
        setTranslateX(currentPage * -50); // 修改：从-100改为-50
      }
    };

    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [isDragging, currentPage]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden" 
      data-name="手机桌面"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {wallpaper ? (
        <img alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" src={wallpaper} />
      ) : (
        <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ backgroundColor: '#D5EAE3' }} />
      )}
      
      {/* 主要内容容器 - 保持414x920的比例 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[414px] max-h-[920px] aspect-[414/920]">
        {/* 滑动容器 - 只包含可滑动的内容，不包含底部App栏 */}
        <div 
          className="absolute inset-0 flex transition-transform"
          style={{ 
            transform: `translateX(${translateX}%)`,
            transitionDuration: isDragging ? '0ms' : '300ms',
            width: '200%'
          }}
        >
          {/* 桌面1 */}
          <div className="relative w-1/2 h-full flex-shrink-0">
            <Desktop1 userData={localUserData} onUserDataChange={handleUserDataChange} onChatClick={handleChatClick} preloadedImages={preloadedImages} />
          </div>
          
          {/* 桌面2 */}
          <div className="relative w-1/2 h-full flex-shrink-0">
            <Desktop2 preloadedImages={preloadedImages} onHealthClick={handleHealthClick} />
          </div>
        </div>

        {/* 底部App栏 - 固定不动 */}
        <BottomAppBar onSettingsClick={handleSettingsClick} onWorldBookClick={handleWorldBookClick} onCharacterClick={handleCharacterClick} onChatClick={handleChatClick} />
        
        {/* 滑动显示栏 - 固定不动 */}
        <SlideIndicator currentPage={currentPage} />
      </div>
      
      {/* 设置界面 */}
      {showSettings && (
        <SettingsContainer onClose={handleCloseSettings} />
      )}
      
      {/* 世界书界面 */}
      {showWorldBook && (
        <WorldBookContainer onClose={handleCloseWorldBook} />
      )}
      
      {/* 角色界面 */}
      {showCharacter && (
        <CharacterContainer onClose={handleCloseCharacter} />
      )}

      {/* 健康界面 */}
      {showHealth && (
        <HealthContainer onClose={handleCloseHealth} />
      )}
      
      {/* 聊天界面 */}
      {showChat && (
        <ChatContainer 
          onClose={handleCloseChat} 
          initialChatId={pendingChatId} 
          onChatChange={handleChatChange}
        />
      )}
    </div>
  );
}