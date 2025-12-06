import { useState, useEffect } from "react";
import { Camera, Image, Check, ChevronDown, Save, Trash2, Plus, X } from "lucide-react";
import { db, STORES } from "../utils/db";
import { globalCache } from "../utils/chatCache";
import { saveImage, getImage, copyImage, deleteImage } from "../utils/imageDB";

interface ChatSettingsData {
  userAvatar: string | null;
  userNickname: string;
  contextMessageCount: number;
  chatBackground: string | null;
  enabledWorldBooks: string[];
  timeAwareness?: boolean; // 感知时间开关
  bubbleStyles?: {
    user: string; // 用户气泡CSS样式
    character: string; // 角色气泡CSS样式
    userQuote: string; // 用户气泡内引用样式
    characterQuote: string; // 角色气泡内引用样式
  };
}

interface WorldBook {
  id: string;
  name: string;
  scope: 'global' | 'local';
  position: 'before' | 'after';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChatSettings() {
  // 默认气泡样式
  const defaultBubbleStyles = {
    user: `background: linear-gradient(75deg, rgba(172, 188, 166, 1), rgba(172, 188, 166, 1), rgba(172, 188, 166, 1));\ncolor: #ffffff;\nborder-radius: 8px;\npadding: 0.625rem 0.875rem;\nmax-width: 70vw;`,
    character: `background: linear-gradient(-75deg, rgba(245, 245, 245, 1), rgba(245, 245, 245, 1), rgba(245, 245, 245, 1));\ncolor: #333333;\nborder-radius: 8px;\npadding: 0.625rem 0.875rem;\nmax-width: 70vw;`,
    userQuote: `background: #9BAD96;\ncolor: rgba(255, 255, 255, 0.8);\nborder-radius: 4px;\npadding: 0.5rem;\nmargin-bottom: 0.5rem;`,
    characterQuote: `background: #e8e8e8;\ncolor: #666666;\nborder-radius: 4px;\npadding: 0.5rem;\nmargin-bottom: 0.5rem;`,
  };

  // 从缓存初始化设置，避免闪烁
  const [settings, setSettings] = useState<ChatSettingsData>(() => {
    const cached = globalCache.chatSettings;
    return cached || {
      userAvatar: null,
      userNickname: '',
      contextMessageCount: 10,
      chatBackground: null,
      enabledWorldBooks: [],
      timeAwareness: true, // 默认开启
      bubbleStyles: defaultBubbleStyles, // 添加默认气泡样式
    };
  });

  const [tempSettings, setTempSettings] = useState<ChatSettingsData>(() => {
    const cached = globalCache.chatSettings;
    return cached || {
      userAvatar: null,
      userNickname: '',
      contextMessageCount: 10,
      chatBackground: null,
      enabledWorldBooks: [],
      timeAwareness: true, // 默认开启
      bubbleStyles: defaultBubbleStyles, // 添加默认气泡样式
    };
  });
  
  // 用于显示的 URL（从 imageDB 加载）
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [localWorldBooks, setLocalWorldBooks] = useState<WorldBook[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isBeautifyExpanded, setIsBeautifyExpanded] = useState(false);
  const [bubblePresets, setBubblePresets] = useState<BubblePreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showWorldBookSelector, setShowWorldBookSelector] = useState(false);
  const [tempWorldBooksSelection, setTempWorldBooksSelection] = useState<string[]>([]);

  // 气泡预设数据类型
  interface BubblePreset {
    id: string;
    name: string;
    styles: {
      user: string;
      character: string;
      userQuote: string;
      characterQuote: string;
    };
    createdAt: string;
  }

  // 将bubbleStyles对象转换为CSS文本
  const bubbleStylesToCSS = (styles: typeof defaultBubbleStyles): string => {
    const safeStyles = {
      user: styles?.user || defaultBubbleStyles.user,
      userQuote: styles?.userQuote || defaultBubbleStyles.userQuote,
      character: styles?.character || defaultBubbleStyles.character,
      characterQuote: styles?.characterQuote || defaultBubbleStyles.characterQuote,
    };
    
    return `/* 用户气泡 */\n.user-bubble {\n  ${safeStyles.user.split('\n').join('\n  ')}\n}\n\n/* 用户引用 */\n.user-quote {\n  ${safeStyles.userQuote.split('\n').join('\n  ')}\n}\n\n/* 角色气泡 */\n.character-bubble {\n  ${safeStyles.character.split('\n').join('\n  ')}\n}\n\n/* 角色引用 */\n.character-quote {\n  ${safeStyles.characterQuote.split('\n').join('\n  ')}\n}`;
  };

  // 将CSS文本解析为bubbleStyles对象
  const parseCSSToStyles = (css: string): typeof defaultBubbleStyles => {
    const result = { ...defaultBubbleStyles };
    
    // 匹配选择器和其内容
    const userBubbleMatch = css.match(/\.user-bubble\s*\{([^}]*)\}/);
    const userQuoteMatch = css.match(/\.user-quote\s*\{([^}]*)\}/);
    const characterBubbleMatch = css.match(/\.character-bubble\s*\{([^}]*)\}/);
    const characterQuoteMatch = css.match(/\.character-quote\s*\{([^}]*)\}/);
    
    if (userBubbleMatch) {
      result.user = userBubbleMatch[1].trim().replace(/\s+/g, ' ').replace(/; /g, ';\n');
    }
    if (userQuoteMatch) {
      result.userQuote = userQuoteMatch[1].trim().replace(/\s+/g, ' ').replace(/; /g, ';\n');
    }
    if (characterBubbleMatch) {
      result.character = characterBubbleMatch[1].trim().replace(/\s+/g, ' ').replace(/; /g, ';\n');
    }
    if (characterQuoteMatch) {
      result.characterQuote = characterQuoteMatch[1].trim().replace(/\s+/g, ' ').replace(/; /g, ';\n');
    }
    
    return result;
  };

  useEffect(() => {
    loadSettings();
    loadLocalWorldBooks();
    loadBubblePresets();
  }, []);
  
  // 当 tempSettings 变化时，加载对应的图片 URL
  useEffect(() => {
    const loadImageUrls = async () => {
      // 加载头像 URL
      if (tempSettings.userAvatar) {
        if (tempSettings.userAvatar.startsWith('data:')) {
          // 旧的 Base64 格式
          setAvatarUrl(tempSettings.userAvatar);
        } else {
          // 新的 key 格式，从图片数据库读取
          const url = await getImage(tempSettings.userAvatar);
          setAvatarUrl(url);
        }
      } else {
        setAvatarUrl(null);
      }
      
      // 加载背景 URL
      if (tempSettings.chatBackground) {
        if (tempSettings.chatBackground.startsWith('data:')) {
          // 旧的 Base64 格式
          setBackgroundUrl(tempSettings.chatBackground);
        } else {
          // 新的 key 格式，从图片数据库读取
          const url = await getImage(tempSettings.chatBackground);
          setBackgroundUrl(url);
        }
      } else {
        setBackgroundUrl(null);
      }
    };
    
    loadImageUrls();
  }, [tempSettings.userAvatar, tempSettings.chatBackground]);

  const loadSettings = async () => {
    try {
      const saved = await db.get<any>(STORES.CHATS, 'chat_settings');
      if (saved) {
        // 确保enabledWorldBooks字段、timeAwareness字段和bubbleStyles字段存在（向后兼容）
        const settingsData = {
          ...saved,
          enabledWorldBooks: saved.enabledWorldBooks || [],
          timeAwareness: saved.timeAwareness !== undefined ? saved.timeAwareness : true, // 默认开启
          bubbleStyles: saved.bubbleStyles || defaultBubbleStyles, // 使用默认气泡样式
        };
        setSettings(settingsData);
        setTempSettings(settingsData);
        // 更新缓存
        globalCache.chatSettings = settingsData;
      } else {
        // 从用户数据获取默认昵称
        const userData = await db.get<any>(STORES.USER_DATA, 'userData');
        if (userData) {
          const defaultSettings = {
            userAvatar: null,
            userNickname: userData.name || '',
            contextMessageCount: 10,
            chatBackground: null,
            enabledWorldBooks: [],
            timeAwareness: true, // 默认开启
            bubbleStyles: defaultBubbleStyles, // 添加默认气泡样式
          };
          setSettings(defaultSettings);
          setTempSettings(defaultSettings);
          // 更新缓存
          globalCache.chatSettings = defaultSettings;
        }
      }
    } catch (error) {
      console.error('Failed to load chat settings:', error);
    }
  };

  const loadLocalWorldBooks = async () => {
    try {
      const allBooks = await db.get<WorldBook[]>(STORES.WORLD_BOOKS, 'world_books');
      if (allBooks) {
        // 只显示局部世界书
        const localBooks = allBooks.filter((book: WorldBook) => book.scope === 'local');
        setLocalWorldBooks(localBooks);
      }
    } catch (error) {
      console.error('Failed to load world books:', error);
    }
  };

  const loadBubblePresets = async () => {
    try {
      const presets = await db.get<BubblePreset[]>(STORES.BUBBLE_PRESETS, 'bubble_presets');
      if (presets) {
        setBubblePresets(presets);
      }
    } catch (error) {
      console.error('Failed to load bubble presets:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // 如果有临时头像，复制到正式key
      if (tempSettings.userAvatar === 'chat-avatar-temp') {
        await copyImage('chat-avatar-temp', 'chat-avatar');
        tempSettings.userAvatar = 'chat-avatar';
        // 删除临时图片
        await deleteImage('chat-avatar-temp');
      }
      
      // 如果有临时背景，复制到正式key
      if (tempSettings.chatBackground === 'chat-background-temp') {
        await copyImage('chat-background-temp', 'chat-background');
        tempSettings.chatBackground = 'chat-background';
        // 删除临时图片
        await deleteImage('chat-background-temp');
      }
      
      setSettings(tempSettings);
      await db.set(STORES.CHATS, 'chat_settings', tempSettings);
      
      // 更新缓存
      globalCache.chatSettings = tempSettings;
      
      // 触发缓存清除事件
      window.dispatchEvent(new Event('chat-settings-updated'));
      
      // 显示保存成功提示
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 2000);
    } catch (error) {
      console.error('Failed to save chat settings:', error);
    }
  };

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          // 保存到临时key
          const url = await saveImage('chat-avatar-temp', file);
          setTempSettings({ ...tempSettings, userAvatar: 'chat-avatar-temp' });
          // 立即更新预览图
          setAvatarUrl(url);
        } catch (error) {
          console.error('图片压缩失败:', error);
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const handleNicknameChange = (value: string) => {
    setTempSettings({ ...tempSettings, userNickname: value });
  };

  const handleContextCountChange = (value: number) => {
    setTempSettings({ ...tempSettings, contextMessageCount: value });
  };

  const handleBackgroundClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          // 保存到临时key
          const url = await saveImage('chat-background-temp', file);
          setTempSettings({ ...tempSettings, chatBackground: 'chat-background-temp' });
          // 立即更新预览图
          setBackgroundUrl(url);
        } catch (error) {
          console.error('图片处理失败:', error);
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const handleWorldBookToggle = (id: string) => {
    const newEnabledWorldBooks = tempSettings.enabledWorldBooks.includes(id)
      ? tempSettings.enabledWorldBooks.filter(bookId => bookId !== id)
      : [...tempSettings.enabledWorldBooks, id];
    setTempSettings({ ...tempSettings, enabledWorldBooks: newEnabledWorldBooks });
  };

  // 打开世界书选择器
  const handleOpenWorldBookSelector = () => {
    setTempWorldBooksSelection([...tempSettings.enabledWorldBooks]);
    setShowWorldBookSelector(true);
  };

  // 切换世界书选中状态（在弹窗中）
  const handleToggleWorldBookInSelector = (id: string) => {
    if (tempWorldBooksSelection.includes(id)) {
      setTempWorldBooksSelection(tempWorldBooksSelection.filter(bookId => bookId !== id));
    } else {
      setTempWorldBooksSelection([...tempWorldBooksSelection, id]);
    }
  };

  // 保存世界书选择
  const handleSaveWorldBookSelection = () => {
    setTempSettings({ ...tempSettings, enabledWorldBooks: [...tempWorldBooksSelection] });
    setShowWorldBookSelector(false);
  };

  // 删除世界书（直接删除）
  const handleRemoveWorldBook = (id: string) => {
    setTempSettings({ 
      ...tempSettings, 
      enabledWorldBooks: tempSettings.enabledWorldBooks.filter(bookId => bookId !== id) 
    });
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

  // 保存气泡预设
  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('请输入预设名称');
      return;
    }

    const newPreset: BubblePreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      styles: tempSettings.bubbleStyles || defaultBubbleStyles,
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...bubblePresets, newPreset];
    setBubblePresets(updatedPresets);
    await db.set(STORES.BUBBLE_PRESETS, 'bubble_presets', updatedPresets);
    setPresetName('');
    
    // 显示成功提示
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 1500);
  };

  // 加载气泡预设
  const handleLoadPreset = (preset: BubblePreset) => {
    setTempSettings({
      ...tempSettings,
      bubbleStyles: preset.styles,
    });
  };

  // 删除气泡预设
  const handleDeletePreset = async (presetId: string) => {
    const updatedPresets = bubblePresets.filter(p => p.id !== presetId);
    setBubblePresets(updatedPresets);
    await db.set(STORES.BUBBLE_PRESETS, 'bubble_presets', updatedPresets);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <div className="flex-1 px-5 py-6">
        {/* 用户头像 */}
        <div className="mb-8 flex flex-col items-center">
          <button
            onClick={handleAvatarClick}
            className="w-24 h-24 rounded-full bg-[#f5f5f5] flex items-center justify-center overflow-hidden active:opacity-70 hover:opacity-70 transition-opacity"
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-8 h-8 text-[#999]" strokeWidth={2} />
            )}
          </button>
          <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-[#999] mt-2">
            点击更换头像
          </p>
        </div>

        {/* 用户昵称 */}
        <div className="mb-8">
          <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333] mb-3">
            昵称
          </h3>
          <input
            type="text"
            value={tempSettings.userNickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder="请输入昵称"
            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] placeholder:text-[#999] outline-none focus:bg-[#ebebeb] transition-colors"
          />
        </div>

        {/* AI上下文消息条数 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333]">
              AI上下文消息条数
            </h3>
            <span className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#7B9E7B]">
              {tempSettings.contextMessageCount}
            </span>
          </div>
          
          <div className="px-1">
            <input
              type="range"
              min="1"
              max="1000"
              value={tempSettings.contextMessageCount}
              onChange={(e) => handleContextCountChange(parseInt(e.target.value))}
              className="w-full h-2 bg-[#f5f5f5] rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #7B9E7B 0%, #7B9E7B ${(tempSettings.contextMessageCount - 1) / 999 * 100}%, #f5f5f5 ${(tempSettings.contextMessageCount - 1) / 999 * 100}%, #f5f5f5 100%)`,
              }}
            />
          </div>
          
          <div className="flex justify-between mt-2 px-1">
            <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#999]">
              1
            </span>
            <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px] text-[#999]">
              1000
            </span>
          </div>
          
          <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-[#999] mt-3">
            设置发送给AI的历史消息条数，数值越大AI对话越连贯，但消耗也越大
          </p>
        </div>

        {/* 感知时间 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333] mb-1">
                感知时间
              </h3>
              <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-[#999]">
                开启后角色可以根据当前时段调整对话内容
              </p>
            </div>
            <button
              onClick={() => setTempSettings({ ...tempSettings, timeAwareness: !tempSettings.timeAwareness })}
              className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 hover:opacity-80 active:opacity-80 ${
                tempSettings.timeAwareness ? 'bg-[#7B9E7B]' : 'bg-[#d0d0d0]'
              }`}
            >
              <div 
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  tempSettings.timeAwareness ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 世界书 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333]">
              世界书
            </h3>
            {localWorldBooks.length > 0 && (
              <button
                onClick={handleOpenWorldBookSelector}
                className="w-8 h-8 bg-[#7B9E7B] rounded-full flex items-center justify-center active:opacity-80 hover:opacity-80 transition-opacity"
              >
                <Plus className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            )}
          </div>
          {localWorldBooks.length === 0 ? (
            <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#999]">
              暂无局部世界书
            </p>
          ) : tempSettings.enabledWorldBooks.length === 0 ? (
            <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#999]">
              暂未启用世界书
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tempSettings.enabledWorldBooks.map(id => {
                const book = localWorldBooks.find(b => b.id === id);
                return book ? (
                  <div key={id} className="bg-[#f5f5f5] rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333]">
                      {book.name}
                    </span>
                    <button
                      onClick={() => handleRemoveWorldBook(id)}
                      className="text-[#999] hover:text-[#333] active:text-[#333] transition-colors"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* 美化模块 - 可折叠抽屉 */}
        <div className="mb-8">
          {/* 折叠头部 */}
          <button
            onClick={() => setIsBeautifyExpanded(!isBeautifyExpanded)}
            className="w-full flex items-center justify-between p-4 bg-[#f5f5f5] rounded-lg active:bg-[#ebebeb] hover:bg-[#ebebeb] transition-colors"
          >
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-[#333]">
              美化设置
            </h3>
            <ChevronDown 
              className={`w-5 h-5 text-[#666] transition-transform ${
                isBeautifyExpanded ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
            />
          </button>

          {/* 抽屉内容 */}
          <div 
            className={`overflow-y-auto transition-all duration-300 ${
              isBeautifyExpanded ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex flex-col gap-6">
              {/* 聊天背景 */}
              <div>
                <h4 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#333] mb-3">
                  聊天背景
                </h4>
                <button
                  onClick={handleBackgroundClick}
                  className="w-full px-4 py-3 bg-[#f5f5f5] rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] active:bg-[#ebebeb] hover:bg-[#ebebeb] transition-colors flex items-center justify-center gap-2"
                >
                  <Image className="w-5 h-5 text-[#666]" strokeWidth={2} />
                  <span>{tempSettings.chatBackground ? '更换聊天背景' : '设置聊天背景'}</span>
                </button>
                {backgroundUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <img 
                      src={backgroundUrl} 
                      alt="Background Preview" 
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>

              {/* 气泡样式 - 统一编辑器 */}
              <div>
                <h4 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#333] mb-3">
                  气泡样式（CSS）
                </h4>
                
                {/* 预设管理 */}
                <div className="mb-4 p-3 bg-[#fafafa] rounded-lg">
                  {/* 保存新预设 */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="输入预设名称"
                      className="flex-1 px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-[#333] placeholder:text-[#999] outline-none focus:border-[#7B9E7B] transition-colors"
                    />
                    <button
                      onClick={handleSavePreset}
                      className="px-3 py-2 bg-[#7B9E7B] rounded-lg text-white active:opacity-80 hover:opacity-80 transition-opacity flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" strokeWidth={2} />
                      <span className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[13px]">
                        保存
                      </span>
                    </button>
                  </div>

                  {/* 预设列表 */}
                  {bubblePresets.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {bubblePresets.map(preset => (
                        <div 
                          key={preset.id} 
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#e0e0e0]"
                        >
                          <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-[#333] flex-1">
                            {preset.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLoadPreset(preset)}
                              className="px-2.5 py-1.5 bg-[#7B9E7B] rounded font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[12px] text-white active:opacity-80 hover:opacity-80 transition-opacity"
                            >
                              加载
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1.5 bg-[#f0f0f0] rounded text-[#666] active:bg-[#e0e0e0] hover:bg-[#e0e0e0] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CSS编辑器 */}
                <textarea
                  value={bubbleStylesToCSS(tempSettings.bubbleStyles || defaultBubbleStyles)}
                  onChange={(e) => {
                    const parsed = parseCSSToStyles(e.target.value);
                    setTempSettings({
                      ...tempSettings,
                      bubbleStyles: parsed,
                    });
                  }}
                  placeholder="编辑CSS样式..."
                  className="w-full px-3 py-2 bg-[#f5f5f5] rounded-lg font-mono text-[11px] text-[#333] placeholder:text-[#999] outline-none focus:bg-[#ebebeb] transition-colors resize-y min-h-[300px]"
                  style={{ whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
                />
                
                <div className="mt-2 p-3 bg-[#fafafa] rounded-lg space-y-1.5">
                  <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[12px] text-[#666]">
                    编辑说明
                  </p>
                  <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#888]">
                    分别编辑四个选择器：.user-bubble、.user-quote、.character-bubble、.character-quote
                  </p>
                  <div className="border-l-2 border-[#ACBCA6] pl-2 space-y-1">
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#888]">
                      💡 <span className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif]">引用块位置控制：</span>quote 嵌套在 bubble 内部
                    </p>
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#888]">
                      • <code className="bg-white px-1 rounded text-[#ACBCA6]">margin-bottom</code> - 控制引用块与正文的间距
                    </p>
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#888]">
                      • <code className="bg-white px-1 rounded text-[#ACBCA6]">margin-top</code> - 控制引用块上方间距
                    </p>
                    <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-[#888]">
                      • <code className="bg-white px-1 rounded text-[#ACBCA6]">padding</code> - 控制引用块内部文字的留白
                    </p>
                  </div>
                </div>
                
                {/* 综合对话预览 */}
                <div className="mt-4 p-3 bg-[#fafafa] rounded-lg">
                  <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[12px] text-[#999] mb-3">
                    预览效果
                  </p>
                  
                  {/* 角色消息（带引用） */}
                  <div className="flex justify-start mb-3">
                    <div style={parseCSSToStyle((tempSettings.bubbleStyles || defaultBubbleStyles).character)}>
                      <div style={parseCSSToStyle((tempSettings.bubbleStyles || defaultBubbleStyles).characterQuote)}>
                        <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px]">
                          用户
                        </p>
                        <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px]">
                          你好吗？
                        </p>
                      </div>
                      <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px]">
                        我很好，谢谢关心！
                      </p>
                    </div>
                  </div>
                  
                  {/* 用户消息（带引用） */}
                  <div className="flex justify-end">
                    <div style={parseCSSToStyle((tempSettings.bubbleStyles || defaultBubbleStyles).user)}>
                      <div style={parseCSSToStyle((tempSettings.bubbleStyles || defaultBubbleStyles).userQuote)}>
                        <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[12px]">
                          角色
                        </p>
                        <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px]">
                          我很好，谢谢关心！
                        </p>
                      </div>
                      <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px]">
                        太好了！
                      </p>
                    </div>
                  </div>
                </div>

                {/* 恢复默认按钮 */}
                <button
                  onClick={() => setTempSettings({
                    ...tempSettings,
                    bubbleStyles: defaultBubbleStyles,
                  })}
                  className="mt-4 w-full px-4 py-2 bg-white border border-[#d0d0d0] rounded-lg font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#666] active:bg-[#f5f5f5] hover:bg-[#f5f5f5] transition-colors"
                >
                  恢复默认样式
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="px-5 py-4 bg-white border-t border-[#f0f0f0]">
        <button
          onClick={handleSaveSettings}
          className="w-full py-3 bg-[#7B9E7B] rounded-lg font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[16px] text-white active:opacity-80 hover:opacity-80 transition-opacity flex items-center justify-center"
        >
          保存设置
        </button>
      </div>

      {/* 保存成功弹窗 */}
      {showSuccessAlert && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-64 px-6 py-5 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#7B9E7B] flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[16px] text-[#333]">
                保存成功
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 图片处理中提示 */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-64 px-6 py-5 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#7B9E7B] flex items-center justify-center mb-3">
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[16px] text-[#333]">
                处理中...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 世界书选择器 */}
      {showWorldBookSelector && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[360px] shadow-xl max-h-[70vh] overflow-y-auto">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-4">
              选择世界书
            </h3>
            
            {localWorldBooks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[14px] text-[#999]">
                  暂无可用的局部世界书
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-6">
                {localWorldBooks.map(book => (
                  <button
                    key={book.id}
                    onClick={() => handleToggleWorldBookInSelector(book.id)}
                    className="flex items-center gap-3 active:opacity-70 hover:opacity-70 transition-opacity"
                  >
                    <div 
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        tempWorldBooksSelection.includes(book.id)
                          ? 'bg-[#7B9E7B] border-[#7B9E7B]'
                          : 'bg-white border-[#d0d0d0]'
                      }`}
                    >
                      {tempWorldBooksSelection.includes(book.id) && (
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[15px] text-[#333] text-left flex-1">
                      {book.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowWorldBookSelector(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveWorldBookSelection}
                className="flex-1 py-2.5 rounded-xl bg-[#7B9E7B] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}