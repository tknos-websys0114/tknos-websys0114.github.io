import imgRectangle7 from "figma:asset/5af5206435ad5cfebc28e1e705c6e80ef0c7422e.png";
import imgRectangle8 from "figma:asset/ab7960173f63086c2ae265b8899b77bae3bfc5fd.png";
import img from "figma:asset/2c4e24fb97d83db5e0d40da3356ff7df2f9fbf99.png";
import img1 from "figma:asset/3b015cc5afccb7e9689502b97c0580e29782af83.png";
import img2 from "figma:asset/d66caaf044e33e1487e4b0199ac46e1b563e30e2.png";
import img3 from "figma:asset/320f6f27a201a50ba3f60a7311ec793841dca491.png";
import imgRoundedRectangle from "figma:asset/deedf28837b5a73dd7e4ef951e588042d34bc0fa.png";
import { useState, useEffect, useRef } from "react";
import { saveImage, getImage } from "../utils/imageDB";
import { db, STORES } from "../utils/db";

export default function Desktop2({ preloadedImages }: { preloadedImages?: Record<string, string | null> }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customText1, setCustomText1] = useState('自定义文字');
  const [customText2, setCustomText2] = useState('自定义文字自定义文字');
  const [isEditingText1, setIsEditingText1] = useState(false);
  const [isEditingText2, setIsEditingText2] = useState(false);
  const [timeImage, setTimeImage] = useState<string | null>(preloadedImages?.['desktop2_timeImage'] || null);
  const [cardImage1, setCardImage1] = useState<string | null>(preloadedImages?.['desktop2_card1'] || null);
  const [cardImage2, setCardImage2] = useState<string | null>(preloadedImages?.['desktop2_card2'] || null);
  const [cardImage3, setCardImage3] = useState<string | null>(preloadedImages?.['desktop2_card3'] || null);
  const [cardImage4, setCardImage4] = useState<string | null>(preloadedImages?.['desktop2_card4'] || null);
  const [colorMode, setColorMode] = useState('light');
  const [iconImages, setIconImages] = useState<Record<string, string | null>>({
    'desktop2-shop': preloadedImages?.['system-icon-desktop2-shop'] || null,
    'desktop2-game': preloadedImages?.['system-icon-desktop2-game'] || null,
    'desktop2-schedule': preloadedImages?.['system-icon-desktop2-schedule'] || null,
    'desktop2-health': preloadedImages?.['system-icon-desktop2-health'] || null,
  });
  
  const timeImageInputRef = useRef<HTMLInputElement>(null);
  const cardImageInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const savedText1 = await db.get<string>(STORES.MISC, 'desktop2_customText1');
      const savedText2 = await db.get<string>(STORES.MISC, 'desktop2_customText2');
      const savedColorMode = await db.get<string>(STORES.APPEARANCE, 'desktop_color_mode');
      
      if (savedText1) setCustomText1(savedText1);
      if (savedText2) setCustomText2(savedText2);
      setColorMode(savedColorMode || 'light');

      const savedTimeImage = await getImage('desktop2_timeImage');
      if (savedTimeImage) setTimeImage(savedTimeImage);
      
      const savedCard1 = await getImage('desktop2_card1');
      if (savedCard1) setCardImage1(savedCard1);
      
      const savedCard2 = await getImage('desktop2_card2');
      if (savedCard2) setCardImage2(savedCard2);
      
      const savedCard3 = await getImage('desktop2_card3');
      if (savedCard3) setCardImage3(savedCard3);
      
      const savedCard4 = await getImage('desktop2_card4');
      if (savedCard4) setCardImage4(savedCard4);

      // 加载图标
      const icons: Record<string, string | null> = {};
      const iconIds = ['desktop2-shop', 'desktop2-game', 'desktop2-schedule', 'desktop2-health'];
      for (const id of iconIds) {
        const url = await getImage(`system-icon-${id}`);
        if (url) {
          icons[id] = url;
        }
      }
      setIconImages(icons);
    };
    loadData();

    // 监听颜色模式变化事件
    const handleColorModeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setColorMode(customEvent.detail);
    };

    // 监听图标变化事件
    const handleIconChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ iconId: string; url: string | null }>;
      const { iconId, url } = customEvent.detail;
      if (iconId.startsWith('desktop2-')) {
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = () => {
    const month = currentTime.getMonth() + 1;
    const day = currentTime.getDate();
    return { month, day };
  };

  const formatWeekday = () => {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekdays[currentTime.getDay()];
  };

  const handleText1Click = () => setIsEditingText1(true);
  const handleText2Click = () => setIsEditingText2(true);

  const handleText1Blur = async () => {
    setIsEditingText1(false);
    await db.set(STORES.MISC, 'desktop2_customText1', customText1);
  };

  const handleText2Blur = async () => {
    setIsEditingText2(false);
    await db.set(STORES.MISC, 'desktop2_customText2', customText2);
  };

  const handleTimeImageClick = () => {
    timeImageInputRef.current?.click();
  };

  const handleCardImageClick = (index: number) => {
    cardImageInputRefs[index].current?.click();
  };

  const handleTimeImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await saveImage('desktop2_timeImage', file);
        setTimeImage(imageUrl);
      } catch (error) {
        console.error('保存图片失败:', error);
      }
    }
  };

  const handleCardImageChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await saveImage(`desktop2_card${index + 1}`, file);
        const setters = [setCardImage1, setCardImage2, setCardImage3, setCardImage4];
        setters[index](imageUrl);
      } catch (error) {
        console.error('保存图片失败:', error);
      }
    }
  };

  return (
    <>
      {/* 图片时间组件 */}
      <div className="absolute h-[15%] left-1/2 top-[6.6%] translate-x-[-50%] w-[86%]" data-name="图片时间组件">
        <div 
          className="absolute inset-0 rounded-[24px] cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={handleTimeImageClick}
        >
          {timeImage ? (
            <img alt="" className="absolute inset-0 w-full h-full object-cover rounded-[24px]" src={timeImage} />
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-[24px]" style={{ backgroundColor: '#D5EAE3' }} />
          )}
        </div>
        <p className={`absolute bakbak-one-regular leading-[normal] left-1/2 top-1/2 text-[clamp(70px,12vh,120px)] text-center translate-x-[-50%] translate-y-[-50%] w-[87%] pointer-events-none ${colorMode === 'dark' ? 'text-[rgba(0,0,0,0.5)]' : 'text-[rgba(255,255,255,0.5)]'}`}>
          {formatTime(currentTime)}
        </p>
        <input
          ref={timeImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleTimeImageChange}
          className="hidden"
        />
      </div>

      {/* 万屋、游戏、日程、健康关怀 - 使用absolute contents定位 */}
      <div className="absolute contents left-[6.76%] top-[26.3%]" data-name="万屋">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%-35.51%)] text-[clamp(10px,3vw,12px)] text-center top-[33.94%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>万屋</p>
        <div className="absolute left-[6.76%] w-[14.98%] aspect-square top-[26.3%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop2-shop'] || img} />
        </div>
      </div>

      <div className="absolute contents left-[30.43%] top-[26.3%]" data-name="娱乐">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%-11.84%)] text-[clamp(10px,3vw,12px)] text-center top-[33.94%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>娱乐</p>
        <div className="absolute left-[30.43%] w-[14.98%] aspect-square top-[26.3%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop2-game'] || img1} />
        </div>
      </div>

      <div className="absolute contents left-[54.1%] top-[26.3%]" data-name="日程">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%+11.84%)] text-[clamp(10px,3vw,12px)] text-center top-[33.94%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>日程</p>
        <div className="absolute left-[54.1%] w-[14.98%] aspect-square top-[26.3%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop2-schedule'] || img2} />
        </div>
      </div>

      <div className="absolute contents left-[77.78%] top-[26.3%]" data-name="健康">
        <p className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[1.85%] leading-[normal] left-[calc(50%+35.51%)] text-[clamp(10px,3vw,12px)] text-center top-[33.94%] translate-x-[-50%] w-[13.04%] ${colorMode === 'dark' ? 'text-black' : 'text-white'}`}>健康</p>
        <div className="absolute left-[77.78%] w-[14.98%] aspect-square top-[26.3%] overflow-hidden rounded-[18%]">
          <img alt="" className="block w-full h-full object-cover" src={iconImages['desktop2-health'] || img3} />
        </div>
      </div>

      {/* 图片组件2 */}
      <div className="absolute h-[38.04%] left-1/2 top-[38.64%] translate-x-[-50%] w-[86%]" data-name="图片组件2">
        <div className={`absolute backdrop-blur-[15px] backdrop-filter inset-0 rounded-[24px] shadow-[0px_0px_2px_0px_inset_#ffffff,0px_1px_1px_0px_inset_rgba(255,255,255,0.5)] ${colorMode === 'dark' ? 'bg-[rgba(0,0,0,0.3)]' : 'bg-[rgba(255,255,255,0.5)]'}`} />
        
        {/* 四张卡片图片 */}
        <div 
          className="absolute h-[62%] left-[7.3%] rounded-[26px] top-[32.86%] w-[19.66%] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleCardImageClick(0)}
        >
          {cardImage1 ? (
            <img alt="" className="absolute inset-0 w-full h-full object-cover rounded-[26px]" src={cardImage1} />
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-[26px]" style={{ backgroundColor: '#D5EAE3' }} />
          )}
        </div>
        <div 
          className="absolute h-[62%] left-[29.21%] rounded-[26px] top-[33.14%] w-[19.66%] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleCardImageClick(1)}
        >
          {cardImage2 ? (
            <img alt="" className="absolute inset-0 w-full h-full object-cover rounded-[26px]" src={cardImage2} />
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-[26px]" style={{ backgroundColor: '#D5EAE3' }} />
          )}
        </div>
        <div 
          className="absolute h-[62%] left-[51.12%] rounded-[26px] top-[32.86%] w-[19.66%] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleCardImageClick(2)}
        >
          {cardImage3 ? (
            <img alt="" className="absolute inset-0 w-full h-full object-cover rounded-[26px]" src={cardImage3} />
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-[26px]" style={{ backgroundColor: '#D5EAE3' }} />
          )}
        </div>
        <div 
          className="absolute h-[62%] left-[73.03%] rounded-[26px] top-[32.86%] w-[19.66%] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleCardImageClick(3)}
        >
          {cardImage4 ? (
            <img alt="" className="absolute inset-0 w-full h-full object-cover rounded-[26px]" src={cardImage4} />
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-[26px]" style={{ backgroundColor: '#D5EAE3' }} />
          )}
        </div>

        {/* 日期显示 */}
        <p className={`absolute bona-nova-regular h-[22.29%] leading-[normal] left-[5.34%] not-italic top-0 w-[46.63%] ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}>
          <span className="text-[clamp(48px,15vw,64px)]">{formatDate().month}</span>
          <span className="text-[clamp(36px,11.25vw,48px)]">/</span>
          <span className="text-[clamp(48px,15vw,64px)]">{formatDate().day}</span>
        </p>

        {/* 星期显示 */}
        <p className={`absolute font-['Bona_Nova:Bold','Noto_Sans_JP:Bold',sans-serif] h-[14.29%] leading-[normal] left-[6.18%] text-[clamp(18px,6vw,24px)] top-[21.3%] w-[44.66%] ${colorMode === 'dark' ? 'text-white' : 'text-white'}`} style={{ fontVariationSettings: "'wght' 700", fontFamily: 'YShi NewHei T, sans-serif', fontWeight: 'bold' }}>
          {formatWeekday()}
        </p>

        {/* 自定义文字1 */}
        {isEditingText1 ? (
          <input
            type="text"
            value={customText1}
            onChange={(e) => setCustomText1(e.target.value)}
            onBlur={handleText1Blur}
            autoFocus
            className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[7.43%] leading-[normal] left-[92.42%] text-[clamp(12px,4vw,16px)] text-right top-[12.29%] translate-x-[-100%] w-[40%] bg-transparent border-none outline-none ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}
          />
        ) : (
          <p 
            onClick={handleText1Click}
            className={`absolute font-['Source_Han_Sans_CN_VF:Regular',sans-serif] font-normal h-[7.43%] leading-[normal] left-[92.42%] text-[clamp(12px,4vw,16px)] text-right top-[12.29%] translate-x-[-100%] w-[40%] cursor-pointer hover:opacity-70 transition-opacity ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}
          >
            {customText1}
          </p>
        )}

        {/* 自定义文字2 */}
        {isEditingText2 ? (
          <input
            type="text"
            value={customText2}
            onChange={(e) => setCustomText2(e.target.value)}
            onBlur={handleText2Blur}
            autoFocus
            className={`absolute h-[7.43%] leading-[normal] left-[92.42%] text-[clamp(12px,4vw,16px)] text-right top-[22.57%] translate-x-[-100%] w-[80%] bg-transparent border-none outline-none ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}
          />
        ) : (
          <p 
            onClick={handleText2Click}
            className={`absolute h-[7.43%] leading-[normal] left-[92.42%] text-[clamp(12px,4vw,16px)] text-right top-[22.57%] translate-x-[-100%] w-[80%] cursor-pointer hover:opacity-70 transition-opacity ${colorMode === 'dark' ? 'text-white/70' : 'text-[#5c5c5c]'}`}
          >
            {customText2}
          </p>
        )}
      </div>

      {/* Hidden file inputs for card images */}
      {cardImageInputRefs.map((ref, index) => (
        <input
          key={index}
          ref={ref}
          type="file"
          accept="image/*"
          onChange={(e) => handleCardImageChange(index, e)}
          className="hidden"
        />
      ))}
    </>
  );
}