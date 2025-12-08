import { useEffect } from 'react';

export function usePWA() {
  useEffect(() => {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);

            // 检查更新
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 新的 Service Worker 可用
                    console.log('New content is available; please refresh.');
                    
                    // 可以在这里显示更新提示
                    if (confirm('发现新版本！点击确定刷新页面以更新。')) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });

        // 当 Service Worker 控制器改变时刷新页面
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      });
    }

    // 添加 viewport meta 标签以确保移动端正确显示
    const addMetaTags = () => {
      // Viewport
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

      // Theme color
      let themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.setAttribute('content', '#000000');

      // Apple mobile web app capable
      let appleMobileWebAppCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      if (!appleMobileWebAppCapable) {
        appleMobileWebAppCapable = document.createElement('meta');
        appleMobileWebAppCapable.setAttribute('name', 'apple-mobile-web-app-capable');
        document.head.appendChild(appleMobileWebAppCapable);
      }
      appleMobileWebAppCapable.setAttribute('content', 'yes');

      // Apple mobile web app status bar style
      let appleStatusBarStyle = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!appleStatusBarStyle) {
        appleStatusBarStyle = document.createElement('meta');
        appleStatusBarStyle.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(appleStatusBarStyle);
      }
      appleStatusBarStyle.setAttribute('content', 'default');

      // Apple mobile web app title
      let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (!appleTitle) {
        appleTitle = document.createElement('meta');
        appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
        document.head.appendChild(appleTitle);
      }
      appleTitle.setAttribute('content', 'Touken OS');

      // Description
      let description = document.querySelector('meta[name="description"]');
      if (!description) {
        description = document.createElement('meta');
        description.setAttribute('name', 'description');
        document.head.appendChild(description);
      }
      description.setAttribute('content', '刀剑乱舞模拟手机桌面系统');

      // Manifest link
      let manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.setAttribute('rel', 'manifest');
        document.head.appendChild(manifestLink);
      }
      manifestLink.setAttribute('href', '/manifest.json');

      // Apple touch icon
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.setAttribute('href', '/icon-192.png');

      // Favicon
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.setAttribute('rel', 'icon');
        document.head.appendChild(favicon);
      }
      favicon.setAttribute('href', '/icon-192.png');
    };

    addMetaTags();

    // 阻止双指缩放（PWA 全屏体验）
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });

    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });

    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });

    // 阻止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

  }, []);
}
