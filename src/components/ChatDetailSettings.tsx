import { useState, useEffect } from "react";
import { Pin, Trash2, X, Check } from "lucide-react";
import { db, STORES } from "../utils/db";

interface ChatDetailSettingsProps {
  characterId: string;
  characterName: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

interface ChatDetailSettings {
  remark: string;
  isPinned: boolean;
  enableStickers?: boolean; // 角色发送表情包开关
  stickerProbability?: number; // 表情包发送概率 (0-100)
}

export default function ChatDetailSettings({ characterId, characterName, onClose, onUpdate, onDelete }: ChatDetailSettingsProps) {
  const [remark, setRemark] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [enableStickers, setEnableStickers] = useState(true);
  const [stickerProbability, setStickerProbability] = useState(30);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [characterId]);

  const loadSettings = async () => {
    try {
      const key = `chat_detail_settings_${characterId}`;
      const saved = await db.get<ChatDetailSettings>(STORES.CHAT_SETTINGS, key);
      if (saved) {
        setRemark(saved.remark || '');
        setIsPinned(saved.isPinned || false);
        setEnableStickers(saved.enableStickers !== undefined ? saved.enableStickers : true);
        setStickerProbability(saved.stickerProbability !== undefined ? saved.stickerProbability : 30);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newRemark: string, newIsPinned: boolean, newEnableStickers: boolean, newStickerProbability: number) => {
    try {
      const key = `chat_detail_settings_${characterId}`;
      const settings: ChatDetailSettings = {
        remark: newRemark,
        isPinned: newIsPinned,
        enableStickers: newEnableStickers,
        stickerProbability: newStickerProbability,
      };
      await db.set(STORES.CHAT_SETTINGS, key, settings);
      
      // 更新聊天列表中的信息
      await updateChatList(newRemark, newIsPinned);
      onUpdate();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateChatList = async (newRemark: string, newIsPinned: boolean) => {
    try {
      const chats = await db.get<any[]>(STORES.CHATS, 'chat_list');
      if (chats) {
        const chatIndex = chats.findIndex((chat: any) => chat.id === characterId);
        if (chatIndex !== -1) {
          chats[chatIndex].remark = newRemark;
          chats[chatIndex].isPinned = newIsPinned;
          await db.set(STORES.CHATS, 'chat_list', chats);
        }
      }
    } catch (error) {
      console.error('Failed to update chat list:', error);
    }
  };

  const handleRemarkChange = (value: string) => {
    setRemark(value);
    saveSettings(value, isPinned, enableStickers, stickerProbability);
  };

  const handleTogglePin = () => {
    const newIsPinned = !isPinned;
    setIsPinned(newIsPinned);
    saveSettings(remark, newIsPinned, enableStickers, stickerProbability);
  };

  const handleToggleStickers = () => {
    const newEnableStickers = !enableStickers;
    setEnableStickers(newEnableStickers);
    saveSettings(remark, isPinned, newEnableStickers, stickerProbability);
  };

  const handleStickerProbabilityChange = (value: string) => {
    const newStickerProbability = parseInt(value, 10);
    if (!isNaN(newStickerProbability) && newStickerProbability >= 0 && newStickerProbability <= 100) {
      setStickerProbability(newStickerProbability);
      saveSettings(remark, isPinned, enableStickers, newStickerProbability);
    }
  };

  const handleClearMessages = async () => {
    try {
      const key = `chat_messages_${characterId}`;
      await db.delete(STORES.CHAT_MESSAGES, key);
      
      // 同时更新聊天列表中的最后消息
      const chats = await db.get<any[]>(STORES.CHATS, 'chat_list');
      if (chats) {
        const chatIndex = chats.findIndex((chat: any) => chat.id === characterId);
        if (chatIndex !== -1) {
          chats[chatIndex].lastMessage = '开始聊天吧';
          chats[chatIndex].lastSender = '';
          await db.set(STORES.CHATS, 'chat_list', chats);
        }
      }
      
      setShowClearConfirm(false);
      onUpdate();
      // 触发父组件重新加载消息
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('chat-messages-cleared'));
      }, 100);
      onClose();
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  };

  const handleDeleteChat = async () => {
    try {
      // 删除聊天记录
      const key = `chat_messages_${characterId}`;
      await db.delete(STORES.CHAT_MESSAGES, key);
      
      // 删除聊天设置
      const settingsKey = `chat_detail_settings_${characterId}`;
      await db.delete(STORES.CHAT_SETTINGS, settingsKey);
      
      // 从聊天列表中删除
      const chats = await db.get<any[]>(STORES.CHATS, 'chat_list');
      if (chats) {
        const newChats = chats.filter((chat: any) => chat.id !== characterId);
        await db.set(STORES.CHATS, 'chat_list', newChats);
      }
      
      setShowDeleteConfirm(false);
      
      // 如果有删除回调，调用它
      if (onDelete) {
        onDelete();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="h-16 bg-white flex items-center justify-between px-4">
        <button
          onClick={onClose}
          className="p-2 -ml-2 active:opacity-60 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <h1 className="font-semibold text-[18px] text-[#333]">
          聊天设置
        </h1>
        
        <div className="w-11" />
      </div>

      {/* 设置内容 */}
      <div className="flex-1 overflow-y-auto bg-white px-5 py-6">
        {/* 备注 */}
        <div className="mb-8">
          <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333] mb-3">
            备注
          </h3>
          <input
            type="text"
            value={remark}
            onChange={(e) => handleRemarkChange(e.target.value)}
            placeholder={characterName}
            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] placeholder:text-[#999] outline-none focus:bg-[#ebebeb] transition-colors"
          />
        </div>

        {/* 置顶聊天 */}
        <div className="mb-8">
          <button
            onClick={handleTogglePin}
            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-lg active:bg-[#ebebeb] transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Pin className="w-5 h-5 text-[#666]" strokeWidth={2} />
              <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333]">
                {isPinned ? '取消置顶' : '置顶聊天'}
              </span>
            </div>
            {isPinned && (
              <div className="w-5 h-5 rounded-full bg-[#7B9E7B] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* 表情包设置 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333] mb-1">
                角色发送表情包
              </h3>
              <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-[#999]">
                开启后该角色可以在对话中发送表情包
              </p>
            </div>
            <button
              onClick={handleToggleStickers}
              className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${
                enableStickers ? 'bg-[#7B9E7B]' : 'bg-[#d0d0d0]'
              }`}
            >
              <div 
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  enableStickers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          {/* 表情包发送概率 */}
          {enableStickers && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#666]">
                  表情包发送概率
                </h3>
                <span className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#7B9E7B]">
                  {stickerProbability}%
                </span>
              </div>
              
              <div className="px-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stickerProbability}
                  onChange={(e) => handleStickerProbabilityChange(e.target.value)}
                  className="w-full h-2 bg-[#f5f5f5] rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #7B9E7B 0%, #7B9E7B ${stickerProbability}%, #f5f5f5 ${stickerProbability}%, #f5f5f5 100%)`,
                  }}
                />
              </div>
              
              <div className="flex justify-between mt-2 px-1">
                <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#999]">
                  0%
                </span>
                <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#999]">
                  100%
                </span>
              </div>
              
              <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#999] mt-2">
                控制该角色发送表情包的频率，数值越高表情包越多
              </p>
            </div>
          )}
        </div>

        {/* 清空聊天记录 */}
        <div className="mb-8">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full px-4 py-3 bg-[#ffe5e5] rounded-lg active:bg-[#ffd0d0] transition-colors flex items-center gap-3"
          >
            <Trash2 className="w-5 h-5 text-[#ff3b30]" strokeWidth={2} />
            <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#ff3b30]">
              清空聊天记录
            </span>
          </button>
        </div>

        {/* 删除聊天 */}
        <div className="mb-8">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-3 bg-[#ffe5e5] rounded-lg active:bg-[#ffd0d0] transition-colors flex items-center gap-3"
          >
            <X className="w-5 h-5 text-[#ff3b30]" strokeWidth={2} />
            <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#ff3b30]">
              删除聊天
            </span>
          </button>
        </div>
      </div>

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] shadow-xl">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-3">
              清空聊天记录
            </h3>
            <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#666] text-center mb-6">
              确定要清空所有聊天记录吗？此操作不可恢复。
            </p>
            
            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearMessages}
                className="flex-1 py-2.5 rounded-xl bg-[#ff3b30] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] shadow-xl">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-3">
              删除聊天
            </h3>
            <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#666] text-center mb-6">
              确定要删除此聊天吗？将同时删除所有聊天记录和设置。
            </p>
            
            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteChat}
                className="flex-1 py-2.5 rounded-xl bg-[#ff3b30] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}