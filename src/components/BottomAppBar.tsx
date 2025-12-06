import img from "figma:asset/c50f0278eb53f2dd6c95d7fda7f37649c4c89657.png";
import img1 from "figma:asset/0c312f8d07d528c1790594577aa15be94965ea1b.png";
import img2 from "figma:asset/d12fb0f5a7c98f7ca307964198d2d0075ea990ff.png";
import { useState, useEffect } from "react";
import { db, STORES } from "../utils/db";
import { getImage } from "../utils/imageDB";

interface BottomAppBarProps {
  onSettingsClick?: () => void;
  onWorldBookClick?: () => void;
  onCharacterClick?: () => void;
}

export default function BottomAppBar({ onSettingsClick, onWorldBookClick, onCharacterClick }: BottomAppBarProps) {
  const [colorMode, setColorMode] = useState('light');
  const [iconImages, setIconImages] = useState<Record<string, string | null>>({
    'bottom-organization': null,
    'bottom-worldbook': null,
    'bottom-settings': null,
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
      const iconIds = ['bottom-organization', 'bottom-worldbook', 'bottom-settings'];
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
      if (iconId.startsWith('bottom-')) {
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
      {/* 底部App栏 */}
      {/* 组织 */}
      <button 
        className="absolute left-[13%] w-[14.98%] aspect-square top-[88%] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity overflow-hidden rounded-[18%]"
        onClick={onCharacterClick}
        data-name="组织"
      >
        <img alt="" className="block w-full h-full object-cover pointer-events-none" src={iconImages['bottom-organization'] || img2} />
      </button>

      {/* 世界书 */}
      <button 
        className="absolute left-[42.51%] w-[14.98%] aspect-square top-[88%] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity overflow-hidden rounded-[18%]"
        onClick={onWorldBookClick}
        data-name="世界书"
      >
        <img alt="" className="block w-full h-full object-cover pointer-events-none" src={iconImages['bottom-worldbook'] || img1} />
      </button>

      {/* 设置 */}
      <button 
        className="absolute left-[72.02%] w-[14.98%] aspect-square top-[88%] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity overflow-hidden rounded-[18%]"
        onClick={onSettingsClick}
        data-name="设置"
      >
        <img alt="" className="block w-full h-full object-cover pointer-events-none" src={iconImages['bottom-settings'] || img} />
      </button>
    </>
  );
}