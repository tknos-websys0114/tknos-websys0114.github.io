/**
 * MessageItem 组件 - 单条消息渲染
 * 使用 React.memo 优化性能，避免不必要的重渲染
 */

import { User } from "lucide-react";
import { memo } from "react";

interface Message {
  id: string;
  text: string;
  senderId: 'user' | 'character' | 'system';
  senderName: string;
  timestamp: Date;
  stickerId?: string;
  imageUrl?: string; // 图片URL (base64)
  isRead?: boolean;
  isImageRecognition?: boolean; // 标记为图片识别结果消息（不显示给用户）
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

interface MessageItemProps {
  message: Message;
  isUserMessageRead: boolean;
  userAvatar: string | null;
  characterAvatar: string | null;
  userNickname: string;
  displayName: string;
  onLongPressStart: (message: Message, event: React.TouchEvent | React.MouseEvent) => void;
  onLongPressEnd: () => void;
  formatMessageTime: (timestamp: Date) => string;
  stickerUrl?: string | null; // 表情包URL
  userBubbleStyle?: string; // 用户气泡样式
  charBubbleStyle?: string; // 角色气泡样式
}

const MessageItem = memo(({ 
  message, 
  isUserMessageRead,
  userAvatar,
  characterAvatar,
  userNickname,
  displayName,
  onLongPressStart,
  onLongPressEnd,
  formatMessageTime,
  stickerUrl,
  userBubbleStyle,
  charBubbleStyle,
}: MessageItemProps) => {
  // 系统消息
  if (message.senderId === 'system') {
    return (
      <div className="flex justify-center w-full my-2">
        <div className="bg-black/10 text-[#666] text-[12px] px-3 py-1 rounded-full max-w-[80%] text-center">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 items-start ${message.senderId === 'user' ? 'justify-end' : 'justify-start'}`}>
      {/* 对方消息：头像在左侧，时间戳在右侧 */}
      {message.senderId === 'character' && (
        <>
          <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center overflow-hidden flex-shrink-0">
            {characterAvatar ? (
              <img src={characterAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-[#999]" strokeWidth={2} />
            )}
          </div>
          
          <div 
            className={message.stickerId || message.imageUrl || message.isPlaceholderImage || message.redPacket ? "bg-transparent p-0" : `max-w-[70vw] rounded-lg px-4 py-2.5 ${charBubbleStyle || 'bg-[#f5f5f5] text-[#333]'}`}
            onTouchStart={(e) => onLongPressStart(message, e)}
            onTouchEnd={onLongPressEnd}
            onMouseDown={(e) => onLongPressStart(message, e)}
            onMouseUp={onLongPressEnd}
            onMouseLeave={onLongPressEnd}
          >
            {message.stickerId && stickerUrl ? (
              <img
                src={stickerUrl}
                alt="表情"
                className="max-w-[150px] max-h-[150px] rounded-lg"
              />
            ) : message.imageUrl ? (
              <img
                src={message.imageUrl}
                alt="图片"
                className="max-w-[250px] max-h-[250px] rounded-lg"
              />
            ) : message.isPlaceholderImage ? (
              <div className="w-[250px] h-[180px] bg-[#f0f0f0] rounded-lg flex items-center justify-center px-6 py-4">
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#666] text-center">
                  [{message.text}.jpg]
                </p>
              </div>
            ) : message.redPacket ? (
              <div className="w-[220px] bg-gradient-to-br from-[#ff6b6b] to-[#ff4757] rounded-2xl p-5 shadow-lg">
                <div className="text-center mb-3">
                  <svg className="w-12 h-12 mx-auto text-white/90" viewBox="80 80 864 864" fill="currentColor">
                    <path d="M604.928 416.682667a425.856 425.856 0 0 0 205.952-111.872V170.794667h-597.333333v134.016a425.813333 425.813333 0 0 0 205.952 111.872 106.666667 106.666667 0 0 1 185.429333 0z m8.874667 85.333333a106.709333 106.709333 0 0 1-203.178667 0 509.482667 509.482667 0 0 1-197.12-85.973333v437.418666h597.333333V416a509.525333 509.525333 0 0 1-197.034666 86.016zM170.88 85.504h682.666667a42.666667 42.666667 0 0 1 42.666666 42.666667v768a42.666667 42.666667 0 0 1-42.666666 42.666666h-682.666667a42.666667 42.666667 0 0 1-42.666667-42.666666v-768a42.666667 42.666667 0 0 1 42.666667-42.666667z"/>
                  </svg>
                </div>
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-white/90 text-center mb-4">
                  {message.redPacket.blessing}
                </p>
                <div className="border-t border-white/20 pt-3 text-center">
                  {message.redPacket.opened ? (
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-white/70">
                      已领取 {message.redPacket.amount.toLocaleString()} 小判
                    </p>
                  ) : (
                    <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[16px] text-white">
                      {message.redPacket.amount.toLocaleString()} 小判
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {message.quote && (
                  <div className="mb-2 p-2 rounded bg-[#9BAD96]">
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-white/80">
                      {message.quote.sender}
                    </p>
                    <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-white/90 line-clamp-2">
                      {message.quote.content}
                    </p>
                  </div>
                )}
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] break-words">
                  {message.text}
                </p>
              </>
            )}
          </div>
          
          <div className="flex flex-col items-start gap-0.5 ml-1">
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
          <div className="flex flex-col items-end gap-0.5 mr-1">
            <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#999]">
              {formatMessageTime(message.timestamp)}
            </span>
            <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#999]">
              {isUserMessageRead ? '已读' : '未读'}
            </span>
          </div>
          
          <div 
            className={message.stickerId || message.imageUrl || message.isPlaceholderImage || message.redPacket ? "bg-transparent p-0" : `max-w-[70vw] rounded-lg px-4 py-2.5 ${userBubbleStyle || 'bg-[#ACBCA6] text-white'}`}
            onTouchStart={(e) => onLongPressStart(message, e)}
            onTouchEnd={onLongPressEnd}
            onMouseDown={(e) => onLongPressStart(message, e)}
            onMouseUp={onLongPressEnd}
            onMouseLeave={onLongPressEnd}
          >
            {message.stickerId && stickerUrl ? (
              <img
                src={stickerUrl}
                alt="表情"
                className="max-w-[150px] max-h-[150px] rounded-lg"
              />
            ) : message.imageUrl ? (
              <img
                src={message.imageUrl}
                alt="图片"
                className="max-w-[250px] max-h-[250px] rounded-lg"
              />
            ) : message.isPlaceholderImage ? (
              <div className="w-[250px] h-[180px] bg-[#f0f0f0] rounded-lg flex items-center justify-center px-6 py-4">
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#666] text-center">
                  [{message.text}.jpg]
                </p>
              </div>
            ) : message.redPacket ? (
              <div className="w-[220px] bg-gradient-to-br from-[#ff6b6b] to-[#ff4757] rounded-2xl p-5 shadow-lg">
                <div className="text-center mb-3">
                  <svg className="w-12 h-12 mx-auto text-white/90" viewBox="80 80 864 864" fill="currentColor">
                    <path d="M604.928 416.682667a425.856 425.856 0 0 0 205.952-111.872V170.794667h-597.333333v134.016a425.813333 425.813333 0 0 0 205.952 111.872 106.666667 106.666667 0 0 1 185.429333 0z m8.874667 85.333333a106.709333 106.709333 0 0 1-203.178667 0 509.482667 509.482667 0 0 1-197.12-85.973333v437.418666h597.333333V416a509.525333 509.525333 0 0 1-197.034666 86.016zM170.88 85.504h682.666667a42.666667 42.666667 0 0 1 42.666666 42.666667v768a42.666667 42.666667 0 0 1-42.666666 42.666666h-682.666667a42.666667 42.666667 0 0 1-42.666667-42.666666v-768a42.666667 42.666667 0 0 1 42.666667-42.666667z"/>
                  </svg>
                </div>
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-white/90 text-center mb-4">
                  {message.redPacket.blessing}
                </p>
                <div className="border-t border-white/20 pt-3 text-center">
                  {message.redPacket.opened ? (
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-white/70">
                      已领取 {message.redPacket.amount.toLocaleString()} 小判
                    </p>
                  ) : (
                    <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[16px] text-white">
                      {message.redPacket.amount.toLocaleString()} 小判
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {message.quote && (
                  <div className="mb-2 p-2 rounded bg-[#9BAD96]">
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-white/80">
                      {message.quote.sender}
                    </p>
                    <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-white/90 line-clamp-2">
                      {message.quote.content}
                    </p>
                  </div>
                )}
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] break-words">
                  {message.text}
                </p>
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
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;