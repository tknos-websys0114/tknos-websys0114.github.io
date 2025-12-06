import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import SwipeableDesktop from "./components/SwipeableDesktop";
import PWAInstaller from "./components/PWAInstaller";
import PWAIconGenerator from "./components/PWAIconGenerator";
import LoadingScreen from "./components/LoadingScreen";
import { usePWA } from "./hooks/usePWA";
import { db, STORES } from "./utils/db";
import { getImageCategoryStats, listAllImages, getImage } from "./utils/imageDB";

interface UserData {
  name: string;
  country: string;
  fortress: string;
  date: string;
}

import { Toaster } from "sonner@2.0.3";

export default function App() {
  const [currentView, setCurrentView] = useState<'loading' | 'login' | 'desktop'>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLoading, setShowLoading] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Record<string, string | null>>({});
  const [initialChatId, setInitialChatId] = useState<string | null>(null);

  // 初始化 PWA
  usePWA();

  // 添加全局调试工具
  useEffect(() => {
    // 图片分类调试工具
    (window as any).debugImageStorage = async () => {
      console.log('=== Image Storage Debug ===');
      const stats = await getImageCategoryStats();
      console.log('Category stats:', stats);
      const images = await listAllImages();
      console.log('All images:', images);
      console.log('Total images:', images.length);
      return { stats, images };
    };

    console.log('Debug tools available:');
    console.log('- window.debugImageStorage() - 查看图片分类统计');
  }, []);

  // 添加苹果PWA支持的meta标签
  useEffect(() => {
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Touken OS' },
      { name: 'mobile-web-app-capable', content: 'yes' }
    ];

    const links = [
      { rel: 'apple-touch-icon', href: '/icon-192.png' }
    ];

    // 添加meta标签
    metaTags.forEach(tag => {
      let meta = document.querySelector(`meta[name="${tag.name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', tag.name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', tag.content);
    });

    // 添加link标签
    links.forEach(linkData => {
      // 查找是否已存在相同的 href
      let link = document.querySelector(`link[href="${linkData.href}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', linkData.rel);
        link.setAttribute('href', linkData.href);
        document.head.appendChild(link);
      }
    });

    // 添加字体
    const fontLinks = [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bakbak+One&family=Bona+Nova:ital,wght@0,400;0,700;1,400&family=Braah+One&display=swap' }
    ];

    fontLinks.forEach(linkData => {
      if (!document.querySelector(`link[href="${linkData.href}"]`)) {
        const link = document.createElement('link');
        link.rel = linkData.rel;
        link.href = linkData.href;
        if (linkData.crossOrigin !== undefined) {
          link.crossOrigin = linkData.crossOrigin;
        }
        document.head.appendChild(link);
      }
    });
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('Initializing application...');
        
        // 初始化数据库
        console.log('Initializing database...');
        await db.init();
        
        // 注册 Service Worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            // 请求通知权限
            if ('Notification' in window && Notification.permission === 'default') {
               await Notification.requestPermission();
            }
          } catch (error: any) {
             console.warn('[SW] Service Worker registration issue:', error);
          }
        }

        // 检查 URL 参数是否有 chatId (用于通知点击跳转)
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdParam = urlParams.get('chatId');
        if (chatIdParam) {
          console.log('Found chatId in URL:', chatIdParam);
          setInitialChatId(chatIdParam);
          window.history.replaceState({}, '', '/');
        }
        
        // 从IndexedDB检查是否有保存的用户数据
        const checkDataPromise = db.get<UserData>(STORES.USER_DATA, 'userData');
        
        // 强制等待至少 2.5 秒，让加载动画播完
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2500));

        // 预加载关键图片资源
        const preloadPromise = (async () => {
          const keysToPreload = [
            // Desktop 通用
            'desktop_wallpaper',
            // Desktop 1
            'profileBackground', 
            'avatar', 
            'anniversary',
            'system-icon-desktop1-chat', 
            'system-icon-desktop1-forum', 
            'system-icon-desktop1-memory', 
            'system-icon-desktop1-transfer',
            // Desktop 2
            'desktop2_timeImage',
            'desktop2_card1',
            'desktop2_card2',
            'desktop2_card3',
            'desktop2_card4',
            'system-icon-desktop2-shop',
            'system-icon-desktop2-game',
            'system-icon-desktop2-schedule',
            'system-icon-desktop2-health'
          ];
          
          const loaded: Record<string, string | null> = {};
          // 并发加载
          await Promise.all(keysToPreload.map(async (key) => {
            try {
              loaded[key] = await getImage(key);
            } catch (e) {
              console.warn(`Failed to preload image ${key}`, e);
              loaded[key] = null;
            }
          }));
          return loaded;
        })();

        const [savedData, images] = await Promise.all([checkDataPromise, preloadPromise, minLoadingTime]);
        setPreloadedImages(images);
        
        if (savedData) {
          console.log('User data found, redirecting to desktop');
          setUserData(savedData);
          setShowLoading(false);
          setCurrentView('desktop');
        } else {
          console.log('No user data found, showing login page');
          setShowLoading(false);
          setCurrentView('login');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setShowLoading(false);
        setCurrentView('login');
      }
    };

    initApp();
  }, []);

  const handleLoginSuccess = (data: UserData) => {
    setUserData(data);
    setCurrentView('desktop');
  };

  if (showLoading && currentView === 'loading') {
    return (
      <>
        <LoadingScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  if (currentView === 'login') {
    return (
      <>
        <PWAIconGenerator />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <PWAInstaller />
        <Toaster position="top-center" />
      </>
    );
  }

  if (currentView === 'desktop' && userData) {
    return (
      <>
        <PWAIconGenerator />
        <SwipeableDesktop userData={userData} preloadedImages={preloadedImages} initialChatId={initialChatId} />
        <PWAInstaller />
        <Toaster position="top-center" />
      </>
    );
  }

  return null;
}