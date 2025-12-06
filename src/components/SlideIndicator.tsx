import { useState, useEffect } from 'react';
import { db, STORES } from '../utils/db';

interface SlideIndicatorProps {
  currentPage: number;
}

export default function SlideIndicator({ currentPage }: SlideIndicatorProps) {
  const [colorMode, setColorMode] = useState('light');

  useEffect(() => {
    // 加载保存的颜色模式
    const loadColorMode = async () => {
      const savedColorMode = (await db.get<string>(STORES.APPEARANCE, 'desktop_color_mode')) || 'light';
      setColorMode(savedColorMode);
    };
    loadColorMode();

    // 监听颜色模式变化事件
    const handleColorModeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setColorMode(customEvent.detail);
    };

    window.addEventListener('colorModeChange', handleColorModeChange);
    return () => {
      window.removeEventListener('colorModeChange', handleColorModeChange);
    };
  }, []);

  const isDark = colorMode === 'dark';

  return (
    <div className="absolute h-[20px] left-1/2 top-[82%] translate-x-[-50%] w-[56px]" data-name="滑动显示栏">
      <div 
        className="absolute inset-0 rounded-[12px]" 
        style={{ backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)' }}
      />
      <div className="absolute left-[14px] size-[8px] top-[6px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill={isDark ? 'black' : 'white'} fillOpacity={currentPage === 0 ? "0.7" : "0.3"} r="4" />
        </svg>
      </div>
      <div className="absolute left-[34px] size-[8px] top-[6px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill={isDark ? 'black' : 'white'} fillOpacity={currentPage === 1 ? "0.7" : "0.3"} r="4" />
        </svg>
      </div>
    </div>
  );
}