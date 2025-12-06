import { db, STORES } from '../utils/db';
import { useState, useEffect, useRef } from 'react';
import { Check, Upload, Image as ImageIcon, X, Moon, Sun, Palette, Smartphone, LayoutGrid, ArrowUpCircle, Monitor, Grid } from 'lucide-react';
import { saveImage, getImage, deleteImage } from '../utils/imageDB';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from "motion/react";
import SettingsLayout from './SettingsLayout';

interface BeautifySettingsProps {
  onBack: () => void;
}

// Define all desktop icons
const APP_ICONS = [
  { id: 'desktop1-chat', name: '联络', location: '主屏幕' },
  { id: 'desktop1-forum', name: '论坛', location: '主屏幕' },
  { id: 'desktop1-memory', name: '回想', location: '主屏幕' },
  { id: 'desktop1-transfer', name: '传送', location: '主屏幕' },
  { id: 'desktop2-shop', name: '万屋', location: '第二屏' },
  { id: 'desktop2-game', name: '娱乐', location: '第二屏' },
  { id: 'desktop2-schedule', name: '日程', location: '第二屏' },
  { id: 'desktop2-health', name: '健康', location: '第二屏' },
  { id: 'bottom-organization', name: '组织', location: '底部栏' },
  { id: 'bottom-worldbook', name: '世界书', location: '底部栏' },
  { id: 'bottom-settings', name: '设定', location: '底部栏' },
];

export default function BeautifySettings({ onBack }: BeautifySettingsProps) {
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [wallpaperSaved, setWallpaperSaved] = useState(false);
  const [colorMode, setColorMode] = useState('light');
  const [iconImages, setIconImages] = useState<Record<string, string | null>>({});
  const [iconSaved, setIconSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedWallpaperKey = await db.get<string>(STORES.MISC, 'desktop_wallpaper');
        const savedColorMode = (await db.get<string>(STORES.APPEARANCE, 'desktop_color_mode')) || 'light';
        
        if (savedWallpaperKey) {
          if (savedWallpaperKey.startsWith('data:')) {
            setWallpaper(savedWallpaperKey);
          } else {
            const url = await getImage(savedWallpaperKey);
            setWallpaper(url);
          }
        }
        
        setColorMode(savedColorMode);

        const icons: Record<string, string | null> = {};
        for (const icon of APP_ICONS) {
          const url = await getImage(`system-icon-${icon.id}`);
          if (url) {
            icons[icon.id] = url;
          }
        }
        setIconImages(icons);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadSettings();
  }, []);


  const handleColorModeChange = async (mode: string) => {
    setColorMode(mode);
    await db.set(STORES.APPEARANCE, 'desktop_color_mode', mode);
    window.dispatchEvent(new CustomEvent('colorModeChange', { detail: mode }));
  };

  const handleWallpaperClick = () => {
    fileInputRef.current?.click();
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await saveImage('desktop-wallpaper', file);
        setWallpaper(url);
        await db.set(STORES.MISC, 'desktop_wallpaper', 'desktop-wallpaper');
        setWallpaperSaved(true);
        setTimeout(() => setWallpaperSaved(false), 2000);
        window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: url }));
      } catch (error) {
        console.error('Failed to save wallpaper:', error);
      }
    }
  };

  const handleResetWallpaper = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setWallpaper(null);
    await db.delete(STORES.MISC, 'desktop_wallpaper');
    await deleteImage('desktop-wallpaper');
    setWallpaperSaved(true);
    setTimeout(() => setWallpaperSaved(false), 2000);
    window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: null }));
  };

  const handleIconClick = (iconId: string) => {
    iconInputRefs.current[iconId]?.click();
  };

  const handleIconChange = async (iconId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      const url = await saveImage(`system-icon-${iconId}`, compressedFile);
      
      setIconImages(prev => ({ ...prev, [iconId]: url }));
      setIconSaved(true);
      setTimeout(() => setIconSaved(false), 2000);
      
      window.dispatchEvent(new CustomEvent('iconChange', { detail: { iconId, url } }));
    } catch (error) {
      console.error('Failed to save icon:', error);
    }
  };

  const handleResetIcon = async (iconId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteImage(`system-icon-${iconId}`);
      setIconImages(prev => ({ ...prev, [iconId]: null }));
      setIconSaved(true);
      setTimeout(() => setIconSaved(false), 2000);
      
      window.dispatchEvent(new CustomEvent('iconChange', { detail: { iconId, url: null } }));
    } catch (error) {
      console.error('Failed to reset icon:', error);
    }
  };


  return (
    <SettingsLayout title="界面个性化" onBack={onBack}>
        <div className="space-y-6 text-slate-800">

        {/* Toast Notification */}
        <AnimatePresence>
          {(wallpaperSaved || iconSaved) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-24 left-0 right-0 flex justify-center z-[60] pointer-events-none px-4"
            >
              <div className="bg-slate-800 text-white px-6 py-3 border border-slate-700 shadow-xl flex items-center gap-3 backdrop-blur-md">
                <Check className="w-4 h-4 text-green-400" strokeWidth={3} />
                <span className="text-xs font-bold tracking-wider uppercase">
                  {wallpaperSaved ? 'WALLPAPER_UPDATED' : 'ICON_CACHE_REFRESHED'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Section: Appearance */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
               <Monitor className="w-3 h-3" /> 显示模式
            </div>
            <div className="grid grid-cols-2 gap-3 bg-white p-2 border border-slate-200 shadow-sm">
              {[
                { label: '浅色 (LIGHT)', value: 'light', icon: Sun },
                { label: '深色 (DARK)', value: 'dark', icon: Moon },
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleColorModeChange(mode.value)}
                  className={`flex items-center justify-center gap-2 py-3 border transition-all duration-200 ${
                    colorMode === mode.value 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                      : 'bg-transparent text-slate-400 border-transparent active:bg-slate-50 active:text-slate-600 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <mode.icon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-xs font-bold tracking-wide">{mode.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Section: Wallpaper */}
          <section className="space-y-3">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                <Smartphone className="w-3 h-3" /> 桌面配置
             </div>
             
             <div className="bg-white p-4 border border-slate-200 shadow-sm relative">
               {/* Tech Corner */}
               <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-slate-200" />
               
               <div className="grid grid-cols-[80px_1fr] gap-5">
                  {/* Preview */}
                  <div 
                    onClick={handleWallpaperClick}
                    className="w-[80px] aspect-[9/16] bg-slate-100 border border-slate-300 relative group cursor-pointer overflow-hidden"
                  >
                    {wallpaper ? (
                      <img 
                        src={wallpaper} 
                        alt="Wallpaper" 
                        className="w-full h-full object-cover opacity-90 group-active:opacity-100 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="w-5 h-5" strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-active:opacity-100 group-hover:opacity-100 bg-slate-900/30 transition-opacity">
                       <Upload className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="flex flex-col justify-between py-1">
                     <div>
                        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">主屏幕壁纸</div>
                        <div className="text-[10px] text-slate-400 font-mono">RES: AUTO-FIT</div>
                        <div className="text-[10px] text-slate-400 font-mono">FMT: JPG/PNG</div>
                     </div>
                     
                     <div className="flex gap-2 mt-2">
                        <button
                           onClick={handleWallpaperClick}
                           className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-600 text-[10px] font-bold active:bg-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-wider"
                        >
                           上传
                        </button>
                        {wallpaper && (
                           <button
                              onClick={handleResetWallpaper}
                              className="px-3 py-2 border border-red-200 bg-red-50 text-red-500 text-[10px] font-bold active:bg-red-100 hover:bg-red-100 transition-colors"
                           >
                              <X className="w-3 h-3" />
                           </button>
                        )}
                     </div>
                  </div>
               </div>
             </div>
          </section>

          {/* Section: Icons */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                <LayoutGrid className="w-3 h-3" /> 图标矩阵
            </div>
            
            <div className="space-y-2">
              {APP_ICONS.map((icon, index) => (
                <div
                  key={icon.id}
                  className="flex items-center justify-between p-2 bg-white border border-slate-200 active:border-slate-400 hover:border-slate-400 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => handleIconClick(icon.id)}
                      className="w-10 h-10 bg-slate-50 border border-slate-200 cursor-pointer overflow-hidden relative"
                    >
                      {iconImages[icon.id] ? (
                        <img 
                          src={iconImages[icon.id]!} 
                          alt={icon.name}
                          className="w-full h-full object-cover opacity-90 group-active:opacity-100 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Grid className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">{icon.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{icon.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleIconClick(icon.id)}
                      className="p-1.5 text-slate-400 active:text-slate-800 active:bg-slate-100 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowUpCircle className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    
                    {iconImages[icon.id] && (
                      <button
                        onClick={(e) => handleResetIcon(icon.id, e)}
                        className="p-1.5 text-slate-300 active:text-red-500 active:bg-red-50 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>

                  {/* Hidden Input */}
                  <input
                    ref={(el) => (iconInputRefs.current[icon.id] = el)}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIconChange(icon.id, e)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>
          </section>

        </div>
        
        {/* Hidden Wallpaper Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleWallpaperChange}
          className="hidden"
        />
    </SettingsLayout>
  );
}
