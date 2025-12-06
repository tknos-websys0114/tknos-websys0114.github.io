import { useState, useEffect } from "react";
import ChatList from "./ChatList";
import PrivateChat from "./PrivateChat";
import { getDisplayName } from "../utils/chatCache";

interface ChatContainerProps {
  onClose: () => void;
  initialChatId?: string | null;
  onChatChange?: (chatId: string | null) => void;
}

export default function ChatContainer({ onClose, initialChatId, onChatChange }: ChatContainerProps) {
  const [currentView, setCurrentView] = useState<'list' | 'chat'>(initialChatId ? 'chat' : 'list');
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const [currentChatName, setCurrentChatName] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (initialChatId) {
      setCurrentChatId(initialChatId);
      // 尝试获取名称，如果缓存没有则暂时为空，PrivateChat 加载时可能会显示 ID 或需要处理
      const name = getDisplayName(initialChatId, '未知角色');
      setCurrentChatName(name);
      setCurrentView('chat');
    }
  }, [initialChatId]);

  const handleOpenChat = (characterId: string, characterName: string) => {
    setCurrentChatId(characterId);
    setCurrentChatName(characterName);
    setCurrentView('chat');
    onChatChange?.(characterId);
  };

  const handleCloseChat = () => {
    setCurrentView('list');
    setCurrentChatId(null);
    setCurrentChatName('');
    // 刷新聊天列表
    setRefreshKey(prev => prev + 1);
    onChatChange?.(null);
  };

  return (
    <>
      {currentView === 'list' && (
        <ChatList key={refreshKey} onClose={onClose} onOpenChat={handleOpenChat} />
      )}
      {currentView === 'chat' && currentChatId && (
        <PrivateChat 
          characterId={currentChatId} 
          characterName={currentChatName}
          onClose={handleCloseChat}
        />
      )}
    </>
  );
}
