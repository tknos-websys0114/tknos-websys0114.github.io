import svgPaths from "../imports/svg-gclfp58out";
import imgRectangle21 from "figma:asset/2fc7779199afe89ebdb796c54baf80f94a058686.png";
import imgRectangle17 from "figma:asset/deedf28837b5a73dd7e4ef951e588042d34bc0fa.png";
import img3 from "figma:asset/8f74948c921008406168688e78dcbd91d8f4d681.png";
import img4 from "figma:asset/a5993753075c329027b5d2cb65fd9ee64c4fcfce.png";
import img5 from "figma:asset/bb6c57b71e6f8f321834896ce493dada3cf559c0.png";
import imgChat from "figma:asset/f2f6c119896a12e8176a39008632fd4e00350238.png";
import { useState, useEffect, useRef } from "react";
import { saveImage, getImage } from "../utils/imageDB";
import { db, STORES } from "../utils/db";
import { getUserAvatar, setUserAvatarCache } from "../utils/chatCache";

interface UserData {
  name: string;
  country: string;
  fortress: string;
  date: string;
}

function AnniversaryWidget({ userData, colorMode, preloadedImages }: { userData: UserData; colorMode: string; preloadedImages?: Record<string, string | null> }) {
  const [daysPassed, setDaysPassed] = useState(0);
  const [anniversaryImage, setAnniversaryImage] = useState<string | null>(preloadedImages?.['anniversary'] || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const calculateDays = () => {
      try {
        const startDate = new Date(userData.date);
        // 重置到当天的0点0分0秒
        startDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        // 使用Math.floor确保准确计算天数，不算首尾两天则减1
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) - 1;
        setDaysPassed(Math.max(0, diffDays)); // 确保不会出现负数
      } catch (error) {
        console.log('日期解析错误，使用默认值');
        setDaysPassed(365);
      }
    };

    calculateDays();
    const timer = setInterval(calculateDays, 1000 * 60 * 60 * 24);
    return () => clearInterval(timer);
  }, [userData.date]);

  useEffect(() => {
    const loadImage = async () => {
      const savedImage = await getImage('anniversary');
      if (savedImage) {
        setAnniversaryImage(savedImage);
      }
    };
    loadImage();
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await saveImage('anniversary', file);
        setAnniversaryImage(imageUrl);
      } catch (error) {
        console.error('保存图片失败:', error);
      }
    }
  };

  return (
    <div className="absolute left-[54.1%] w-[38.65%] aspect-square top-[52.9%]" data-name="纪念日小组件">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div 
        className="absolute left-1/2 w-full aspect-square top-1/2 translate-x-[-50%] translate-y-[-50%] cursor-pointer hover:opacity-80 transition-opacity rounded-[24px] overflow-hidden"
        onClick={handleImageClick}
      >
        {anniversaryImage ? (
          <img alt="" className="block w-full h-full object-cover" src={anniversaryImage} />
        ) : (
          <div className="block w-full h-full" style={{ backgroundColor: '#D5EAE3' }} />
        )}
      </div>
      <div className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[11.25%] leading-[normal] left-1/2 text-[clamp(14px,4vw,16px)] text-center top-[11.875%] translate-x-[-50%] w-[62.5%] pointer-events-none ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>
        <p className="mb-0">就任审神者</p>
        <p>&nbsp;</p>
      </div>
      <p className={`absolute font-['Source_Han_Sans_CN_VF:Normal',sans-serif] font-[350] h-[14.375%] leading-[normal] left-1/2 text-[clamp(11px,3.25vw,13px)] text-center top-[28.125%] translate-x-[-50%] w-[31.25%] pointer-events-none ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>已过去</p>
      <p className={`absolute font-['Actor:Regular',sans-serif] h-[33.75%] leading-[normal] left-1/2 not-italic text-[0px] text-center top-[calc(50%-16.875%)] translate-x-[-50%] w-[72.5%] pointer-events-none ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>
        <span className="font-['Actor:Regular',sans-serif] text-[clamp(36px,12vw,48px)]">{daysPassed}</span>
        <span className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal text-[clamp(11px,3.25vw,13px)]">天</span>
      </p>
    </div>
  );
}

function ProfileWidget({ userData, onUserDataChange, colorMode, preloadedImages }: { userData: UserData; onUserDataChange?: (data: UserData) => void; colorMode: string; preloadedImages?: Record<string, string | null> }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState(30);
  const [customText, setCustomText] = useState('自定义文本');
  const [isEditingText, setIsEditingText] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(preloadedImages?.['profileBackground'] || null);
  // 从缓存初始化头像，避免闪烁
  const [avatarImage, setAvatarImage] = useState<string | null>(() => {
    // 优先使用预加载的，其次是缓存的
    return preloadedImages?.['avatar'] || getUserAvatar() || null;
  });
  
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        } catch (error) {
          console.log('无法读取电量信息，使用默认值');
        }
      }
    };
    updateBattery();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedText = await db.get<string>(STORES.MISC, 'customText');
        if (savedText) {
          setCustomText(savedText);
        }

        const savedBackground = await getImage('profileBackground');
        if (savedBackground) {
          setBackgroundImage(savedBackground);
        }
        
        const savedAvatar = await getImage('avatar');
        if (savedAvatar) {
          setAvatarImage(savedAvatar);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const handleTextClick = () => {
    setIsEditingText(true);
  };

  const handleTextBlur = async () => {
    setIsEditingText(false);
    await db.set(STORES.MISC, 'customText', customText);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomText(e.target.value);
  };

  const batteryWidth = Math.max(2, Math.round((batteryLevel / 100) * 28));

  const handleBackgroundClick = () => {
    backgroundInputRef.current?.click();
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await saveImage('profileBackground', file);
        setBackgroundImage(imageUrl);
      } catch (error) {
        console.error('保存图片失败:', error);
      }
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await saveImage('avatar', file);
        setAvatarImage(imageUrl);
        
        // 触发头像变化事件
        window.dispatchEvent(new Event('avatarChanged'));
        
        // 更新聊天缓存中的头像
        setUserAvatarCache(imageUrl);
      } catch (error) {
        console.error('保存图片失败:', error);
      }
    }
  };

  return (
    <div className="absolute h-[41.6%] left-1/2 top-[6.6%] translate-x-[-50%] w-[88.4%]" data-name="组件1">
      <div className={`relative backdrop-blur-[15px] backdrop-filter h-full rounded-[24px] shadow-[0px_0px_2px_0px_inset_#ffffff,0px_1px_1px_0px_inset_rgba(255,255,255,0.5)] w-full ${colorMode === 'dark' ? 'bg-[rgba(0,0,0,0.3)]' : 'bg-[rgba(255,255,255,0.5)]'}`}>
        {/* Rectangle 17 - 背景图，上、左、右三边与Rectangle 1完全贴合，下边对齐头像4/10处 */}
        {/* 头像top是39.43%，高度是25.68%，从上数4/10处是39.43% + 25.68% * 0.4 = 49.702% */}
        <div 
          className="absolute left-0 right-0 top-0 h-[49.7%] rounded-tl-[24px] rounded-tr-[24px] cursor-pointer hover:opacity-80 transition-opacity overflow-hidden" 
          onClick={handleBackgroundClick}
        >
          {backgroundImage ? (
            <img alt="" className="absolute inset-0 w-full h-full object-cover rounded-tl-[24px] rounded-tr-[24px]" src={backgroundImage} />
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-tl-[24px] rounded-tr-[24px]" style={{ backgroundColor: '#D5EAE3' }} />
          )}
        </div>
        
        <div className="absolute contents left-[1.37%] top-[39.43%]" data-name="个人信息">
          {/* 审神者名往下挪一点，向左挪一点 */}
          <div className="flex items-center absolute left-[28.5%] top-[51%]">
            <p className={`text-[clamp(14px,4vw,16px)] mr-[6px] ${colorMode === 'dark' ? 'text-white' : 'text-black'}`}>{userData.name}</p>
            <div className="flex-shrink-0" data-name="认证标签">
              <div className="relative bg-[#609f60] h-[14px] rounded-[6px] px-[5px] flex items-center justify-center">
                <p className="text-[10px] text-white whitespace-nowrap" style={{ fontFamily: 'YShi NewHei T, sans-serif', fontWeight: '600' }}>
                  已认证
                </p>
              </div>
            </div>
          </div>
          <p className={`absolute font-['Source_Han_Sans_Old_Style:Normal',sans-serif] h-[2.61%] leading-[normal] left-[28.5%] not-italic text-[clamp(12px,3.5vw,14px)] top-[58.5%] w-[68.03%] ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}>{userData.country} · {userData.fortress} · {userData.date}</p>
          
          {/* 头像 - 与Rectangle 1的左边边框贴着 */}
          <div 
            className="absolute left-0 w-[25.68%] aspect-square top-[39.43%] cursor-pointer hover:opacity-80 transition-opacity"
            data-name="头像"
            onClick={(e) => {
              e.stopPropagation();
              handleAvatarClick();
            }}
          >
            {avatarImage ? (
              <img alt="" className="block w-full h-full object-cover rounded-full" src={avatarImage} />
            ) : (
              <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 94 94">
                <path d={svgPaths.p15366300} fill={colorMode === 'dark' ? 'rgba(0,0,0,0.5)' : 'white'} />
              </svg>
            )}
          </div>
        </div>
        
        <div className="absolute contents left-[5.19%] top-[66.5%]" data-name="Group 1">
          <div className="absolute flex items-center gap-[2.5%] left-[5.19%] top-[66.5%] w-[89.62%] h-[12.8%]">
            {/* Rectangle 22 - 电池和图标容器 */}
            <div className={`flex items-center rounded-[24px] px-[2.5%] py-[2.5%] gap-[3%] w-[59.5%] h-full justify-center ${colorMode === 'dark' ? 'bg-[rgba(0,0,0,0.3)]' : 'bg-[rgba(255,255,255,0.5)]'}`}>
              <div className={`relative h-[90%] aspect-[2.43/1] rounded-[8px] flex-shrink-0 ${colorMode === 'dark' ? 'bg-[rgba(0,0,0,0.3)]' : 'bg-[rgba(255,255,255,0.5)]'}`}>
                <div className={`absolute left-[8.8%] top-[21.4%] w-[41.2%] h-[57.1%] rounded-[4px] ${colorMode === 'dark' ? 'bg-[rgba(255,255,255,0.2)]' : 'bg-[#d9d9d9]'}`}>
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-[4px] transition-all duration-300 ${colorMode === 'dark' ? 'bg-white' : 'bg-[#5c5c5c]'}`}
                    style={{ width: `${batteryLevel}%` }}
                  />
                </div>
                <div className="absolute right-[6%] top-0 h-full flex items-center">
                   <p className={`font-['Didact_Gothic:Regular',sans-serif] text-[clamp(10px,1.4vh,14px)] ${colorMode === 'dark' ? 'text-white' : 'text-[#5c5c5c]'}`}>
                     {batteryLevel}%
                   </p>
                </div>
              </div>
              
              <div className="relative h-[90%] aspect-square flex-shrink-0">
                <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" fill={colorMode === 'dark' ? 'rgba(0,0,0,0.5)' : 'white'} fillOpacity="0.5" r="14" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className={`font-['Didact_Gothic:Regular','Noto_Sans_Symbols2:Regular',sans-serif] text-[clamp(15px,2.6vh,23px)] ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}>♡</p>
                </div>
              </div>
              
              <div className="relative h-[90%] aspect-square flex-shrink-0">
                <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" fill={colorMode === 'dark' ? 'rgba(0,0,0,0.5)' : 'white'} fillOpacity="0.5" r="14" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className={`font-['Arial','Noto_Sans_Symbols2:Regular',sans-serif] text-[clamp(15px,2.6vh,23px)] leading-none ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`} style={{ transform: 'translateY(5%)' }}>♫</p>
                </div>
              </div>
              
              <div className="relative h-[90%] aspect-square flex-shrink-0">
                <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" fill={colorMode === 'dark' ? 'rgba(0,0,0,0.5)' : 'white'} fillOpacity="0.5" r="14" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className={`font-['Didact_Gothic:Regular','Noto_Sans_Symbols2:Regular',sans-serif] text-[clamp(15px,2.6vh,23px)] ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}>❀</p>
                </div>
              </div>
            </div>
            {/* Rectangle 23 - 时间显示容器，与Rectangle 22高度一致，宽度固定 */}
            <div className={`rounded-[24px] px-[3%] py-[2.5%] w-[38%] h-full flex items-center justify-center ${colorMode === 'dark' ? 'bg-[rgba(0,0,0,0.5)]' : 'bg-[rgba(255,255,255,0.5)]'}`}>
              <p className={`bakbak-one-regular text-[clamp(20px,6.5vw,26px)] text-center whitespace-nowrap overflow-hidden ${colorMode === 'dark' ? 'text-white/50' : 'text-[#afafaf]'}`}>
                {formatTime(currentTime)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Group 3 - 自定义文本和分割线 */}
        <div className="absolute left-[calc(50%+0.41%)] top-[83.03%] translate-x-[-50%] w-[86.61%]" data-name="Group 3">
          {isEditingText ? (
            <input
              type="text"
              value={customText}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              autoFocus
              className={`w-full font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal text-[clamp(12px,3.5vw,14px)] text-center bg-transparent border-none outline-none ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}
            />
          ) : (
            <p 
              onClick={handleTextClick}
              className={`w-full font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal text-[clamp(12px,3.5vw,14px)] text-center cursor-pointer hover:opacity-70 transition-opacity mb-2 ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}
            >
              {customText}
            </p>
          )}
          {/* 分割线 */}
          <div className="w-full h-[1.31%]">
            <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 317 5">
              <path d={svgPaths.p3086ef80} fill={colorMode === 'dark' ? 'rgba(255,255,255,0.7)' : '#5C5C5C'} />
            </svg>
          </div>
        </div>
        
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Normal',sans-serif] font-[350] h-[6.27%] leading-[normal] left-[93.99%] text-[clamp(10px,3vw,12px)] text-right top-[92.43%] translate-x-[-100%] w-[28.42%] whitespace-pre-wrap ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}>{formatDate(currentTime)}</p>
      </div>
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/*"
        onChange={handleBackgroundChange}
        className="hidden"
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
    </div>
  );
}

export default function Desktop1({ userData, onUserDataChange, onChatClick, preloadedImages }: { userData: UserData; onUserDataChange?: (data: UserData) => void; onChatClick?: () => void; preloadedImages?: Record<string, string | null> }) {
  const [colorMode, setColorMode] = useState('light');
  const [iconImages, setIconImages] = useState<Record<string, string | null>>({
    'desktop1-chat': preloadedImages?.['system-icon-desktop1-chat'] || null,
    'desktop1-forum': preloadedImages?.['system-icon-desktop1-forum'] || null,
    'desktop1-memory': preloadedImages?.['system-icon-desktop1-memory'] || null,
    'desktop1-transfer': preloadedImages?.['system-icon-desktop1-transfer'] || null,
  });

  useEffect(() => {
    const loadColorMode = async () => {
      // 加载保存的颜色模式
      const savedColorMode = await db.get<string>(STORES.APPEARANCE, 'desktop_color_mode');
      setColorMode(savedColorMode || 'light');
    };
    loadColorMode();

    const loadIcons = async () => {
      const icons: Record<string, string | null> = {};
      const iconIds = ['desktop1-chat', 'desktop1-forum', 'desktop1-memory', 'desktop1-transfer'];
      for (const id of iconIds) {
        const url = await getImage(`system-icon-${id}`);
        if (url) {
          icons[id] = url;
        }
      }
      setIconImages(icons);
    };
    loadIcons();

    // 监听颜色模式变化事件
    const handleColorModeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setColorMode(customEvent.detail);
    };

    // 监听图标变化事件
    const handleIconChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ iconId: string; url: string | null }>;
      const { iconId, url } = customEvent.detail;
      if (iconId.startsWith('desktop1-')) {
        setIconImages(prev => ({ ...prev, [iconId]: url }));
      }
    };

    window.addEventListener('colorModeChange', handleColorModeChange);
    window.addEventListener('iconChange', handleIconChange);
    return () => {
      window.removeEventListener('colorModeChange', handleColorModeChange);
      window.removeEventListener('iconChange', handleIconChange);
    };
  }, []);

  return (
    <>
      <ProfileWidget userData={userData} onUserDataChange={onUserDataChange} colorMode={colorMode} />
      
      {/* App图标 */}
      {/* 第一行第一列 - 联络 */}
      <div className="absolute contents left-[6.76%] top-[52.9%]" data-name="联络">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%-35.51%)] text-[clamp(10px,3vw,12px)] text-center top-[60.54%] translate-x-[-50%] w-[13.04%] pointer-events-none ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>联络</p>
        <button 
          className="absolute left-[6.76%] w-[14.98%] aspect-square top-[52.9%] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity overflow-hidden rounded-[18%]"
          onClick={onChatClick}
        >
          <img alt="" className="block w-full h-full object-cover pointer-events-none" src={iconImages['desktop1-chat'] || imgChat} />
        </button>
      </div>

      {/* 第一行第二列 - 论坛 */}
      <div className="absolute contents left-[30.43%] top-[52.9%]" data-name="论坛">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%-11.84%)] text-[clamp(10px,3vw,12px)] text-center top-[60.54%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>论坛</p>
        <div className="absolute left-[30.43%] w-[14.98%] aspect-square top-[52.9%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop1-forum'] || img5} />
        </div>
      </div>

      {/* 第二行第一列 - 回想 */}
      <div className="absolute contents left-[6.76%] top-[63.59%]" data-name="回想">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%-35.51%)] text-[clamp(10px,3vw,12px)] text-center top-[71.2%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>回想</p>
        <div className="absolute left-[6.76%] w-[14.98%] aspect-square top-[63.59%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop1-memory'] || img4} />
        </div>
      </div>

      {/* 第二行第二列 - 传送 */}
      <div className="absolute contents left-[30.43%] top-[63.59%]" data-name="传送">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%-11.84%)] text-[clamp(10px,3vw,12px)] text-center top-[71.2%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>传送</p>
        <div className="absolute left-[30.43%] w-[14.98%] aspect-square top-[63.59%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop1-transfer'] || img3} />
        </div>
      </div>

      <AnniversaryWidget userData={userData} colorMode={colorMode} />
    </>
  );
}