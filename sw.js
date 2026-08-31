importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (typeof workbox !== 'undefined') {
  // 配置 Workbox
  workbox.setConfig({ debug: false });
  
  // 核心：立即更新机制
  // skipWaiting: 新 SW 安装后立即激活，不等待旧 SW 停止
  workbox.core.skipWaiting();
  // clientsClaim: 新 SW 激活后立即接管所有页面，无需重新加载
  workbox.core.clientsClaim();

  // 1. HTML: Network First (确保始终获取最新入口文件)
  // 如果网络正常，使用网络最新版；如果离线，使用缓存
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'html-cache-v2',
      networkTimeoutSeconds: 3, // 3秒超时后使用缓存，防止白屏过久
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 1,
        }),
      ],
    })
  );

  // 预缓存核心页面，解决首次安装后离线或弱网白屏问题
  self.addEventListener('install', (event) => {
    const urlsToCache = [
      '/',
      '/index.html',
      '/manifest.json',
      '/icon-192.png'
    ];
    event.waitUntil(
      caches.open('html-cache-v2').then((cache) => {
        console.log('[Service Worker] Pre-caching core files');
        return cache.addAll(urlsToCache);
      })
    );
  });

  // 2. JS/CSS: Stale While Revalidate (即时响应 + 后台更新)
  // 优先使用缓存（快），同时后台更新缓存（下次访问即为新版）
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources-v2',
    })
  );

    // 3. 图片: Cache First (缓存优先)
  // 图片通常不变，缓存优先节省流量
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache-v2',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30天
        }),
      ],
    })
  );
  
  console.log('Workbox loaded: Network-first HTML + Auto Update enabled');
} else {
  console.log('Workbox failed to load - falling back to basic handling');
}

// --- 以下为业务逻辑 (AI回复 & 通知 & DB) ---

// 消息处理
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // 智能清理：接收前端发来的清理特定角色通知的请求
  if (type === 'CLEAR_NOTIFICATIONS' && payload && payload.characterId) {
    try {
      const notifications = await self.registration.getNotifications();
      for (const notification of notifications) {
        if (notification.data && notification.data.conversationId === payload.characterId) {
          notification.close();
        }
      }
    } catch (e) {
      console.warn('[Service Worker] 清理通知失败', e);
    }
    return;
  }

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { conversationId, characterName } = event.notification.data || {};
  
  event.waitUntil(
    (async () => {
      // 智能清理逻辑：清除该角色的所有堆积通知
      if (conversationId) {
        const notifications = await self.registration.getNotifications();
        for (const notification of notifications) {
          // 如果通知属于同一个角色（通过 conversationId 判断），则将其关闭
          if (notification.data && notification.data.conversationId === conversationId) {
            notification.close();
          }
        }
      }

      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // 1. 尝试找到已经打开的窗口并聚焦
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'open-conversation',
            conversationId,
            characterName
          });
          return client.focus();
        }
      }
      // 2. 如果没有打开的窗口，打开新窗口
      if (self.clients.openWindow) {
        return self.clients.openWindow(`/?chatId=${conversationId}`);
      }
    })()
  );
});
