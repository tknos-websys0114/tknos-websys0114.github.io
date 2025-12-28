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
  
  // 处理 AI 任务
  if (type === 'PROCESS_AI_TASK') {
    console.log('[Service Worker] 收到 AI 任务:', payload);
    const { taskType } = payload;
    
    try {
      let { apiConfig, messages } = payload;
      
      // 如果有待识别的图片，先调用视觉模型识别图片
      if (payload.pendingImageBase64 && payload.imageRecognitionPrompt) {
        console.log('[Service Worker] 识别图片...');
        
        const visionResponse = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: apiConfig.modelName,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: payload.imageRecognitionPrompt },
                  {
                    type: 'image_url',
                    image_url: { url: payload.pendingImageBase64 }
                  }
                ]
              }
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });
        
        if (!visionResponse.ok) {
          throw new Error('图片识别失败');
        }
        
        const visionData = await visionResponse.json();
        const imageDescription = visionData.choices?.[0]?.message?.content || '（无法识别图片内容）';
        
        console.log('[Service Worker] 图片识别结果:', imageDescription);
        
        // 将图片识别结果添加到消息历史中
        messages = [
          messages[0], // system prompt
          {
            role: 'user',
            content: messages[1].content + `\n\n[审神者发送了一张图片，图片内容: ${imageDescription}]`
          }
        ];
      }
      
      // 调用 AI API 生成角色回复
      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: messages,
          temperature: apiConfig.temperature,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
      }
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('AI未返回有效响应');
      }
      
      console.log('[Service Worker] AI 原始响应:', aiResponse);

      // 分支逻辑：记忆提取 vs 聊天回复
      if (taskType === 'memory_extraction') {
          const memories = parseMemoryResult(aiResponse);
          await saveMemoriesToDB(payload.characterId, memories);

          // 发送成功消息给所有客户端
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'AI_TASK_COMPLETED',
              payload: {
                taskId: payload.taskId,
                characterId: payload.characterId,
                taskType: 'memory_extraction',
                result: { memories }
              }
            });
          });
          console.log('[Service Worker] 记忆提取任务完成:', payload.taskId);

      } else {
          // 默认：聊天回复逻辑
          
          let parsedResponse;
          let aiMessages = [];
          
          try {
            // 1. 尝试直接解析整个响应
            parsedResponse = JSON.parse(aiResponse);
            aiMessages = parsedResponse.messages || [];
          } catch (e1) {
            console.log('[Service Worker] 直接解析失败，尝试提取 JSON...');
            
            try {
              // 2. 尝试提取 markdown 代码块中的 JSON
              const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
              if (codeBlockMatch) {
                parsedResponse = JSON.parse(codeBlockMatch[1]);
                aiMessages = parsedResponse.messages || [];
              } else {
                // 3. 尝试提取第一个完整的 JSON 对象
                const firstBrace = aiResponse.indexOf('{');
                if (firstBrace === -1) {
                  throw new Error('响应中未找到 JSON 对象');
                }
                
                let braceCount = 0;
                let jsonEnd = -1;
                
                for (let i = firstBrace; i < aiResponse.length; i++) {
                  if (aiResponse[i] === '{') braceCount++;
                  if (aiResponse[i] === '}') braceCount--;
                  
                  if (braceCount === 0) {
                    jsonEnd = i + 1;
                    break;
                  }
                }
                
                if (jsonEnd === -1) {
                  throw new Error('JSON 对象未正确闭合');
                }
                
                const jsonStr = aiResponse.substring(firstBrace, jsonEnd);
                parsedResponse = JSON.parse(jsonStr);
                aiMessages = parsedResponse.messages || [];
              }
            } catch (e2) {
              console.error('[Service Worker] JSON 解析失败:', e2.message);
              console.error('[Service Worker] AI 响应内容:', aiResponse);
              throw new Error(`AI响应格式错误: ${e2.message}`);
            }
          }
          
          if (aiMessages.length === 0) {
            throw new Error('AI未返回任何消息');
          }
          
          // 构建消息对象
          const newMessages = aiMessages.map((msg, index) => {
            // 处理系统消息
            if (msg.sender === 'system') {
              return {
                id: `${Date.now()}-${index}`,
                text: msg.content,
                senderId: 'system',
                senderName: '系统',
                timestamp: new Date().toISOString(),
                isRead: true,
              };
            }

            // 处理伪图片消息
            if (msg.isPlaceholderImage) {
              const description = (msg.content || '').slice(0, 100);
              return {
                id: `${Date.now()}-${index}`,
                text: description,
                senderId: 'character',
                senderName: payload.characterName,
                timestamp: new Date().toISOString(),
                isPlaceholderImage: true,
                isRead: true,
              };
            }
            
            // 处理红包消息
            if (msg.redPacket) {
              return {
                id: `${Date.now()}-${index}`,
                text: '[红包]',
                senderId: 'character',
                senderName: payload.characterName,
                timestamp: new Date().toISOString(),
                redPacket: {
                  amount: msg.redPacket.amount,
                  blessing: msg.redPacket.blessing,
                  opened: false,
                },
                isRead: true,
              };
            }
            
            const message = {
              id: `${Date.now()}-${index}`,
              text: msg.stickerId ? '[表情]' : (msg.content || ''),
              senderId: 'character',
              senderName: payload.characterName,
              timestamp: new Date().toISOString(),
              stickerId: msg.stickerId,
              isRead: true,
            };
            
            if (msg.quote) {
              message.quote = {
                sender: msg.quote.sender,
                content: msg.quote.content,
              };
            }
            
            return message;
          });
          
          // 保存消息到 IndexedDB 并更新未读计数
          await saveMessageToDB(payload.characterId, newMessages, payload.displayName);
          
          // 检查此时是否有前台窗口
          const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const isVisible = allClients.some(client => client.visibilityState === 'visible');

          // 如果应用在后台，发送系统通知
          const ENABLE_NOTIFICATIONS = false;
          if (ENABLE_NOTIFICATIONS && !isVisible) {
            const lastMsg = newMessages[newMessages.length - 1];
            const title = payload.displayName || payload.characterName || '新消息';
            
            self.registration.showNotification(title, {
              body: lastMsg.text,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: payload.characterId,
              data: {
                conversationId: payload.characterId,
                characterName: title
              }
            });
          }
          
          // 发送成功消息给所有客户端
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'AI_TASK_COMPLETED',
              payload: {
                taskId: payload.taskId,
                characterId: payload.characterId,
                messages: newMessages,
                displayName: payload.displayName,
              }
            });
          });
          console.log('[Service Worker] AI 任务完成:', payload.taskId);
      }
      
    } catch (error) {
      console.error('[Service Worker] AI 任务失败:', error);
      
      // 发送失败消息给所有客户端
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'AI_TASK_FAILED',
          payload: {
            taskId: payload.taskId,
            characterId: payload.characterId,
            error: error.message,
          }
        });
      });
    }
  }
});

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { conversationId, characterName } = event.notification.data || {};
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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
    })
  );
});

// IndexedDB Helper Functions
const DB_NAME = 'ToukenRanbuDB';
const DB_VERSION = 9;
const STORES = {
  CHAT_MESSAGES: 'chatMessages',
  CHATS: 'chats',
  CHARACTERS: 'characters'
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveMessageToDB(characterId, newMessages, senderDisplayName) {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      // 1. Update Chat Messages and Chat List in one transaction
      const tx = db.transaction([STORES.CHAT_MESSAGES, STORES.CHATS], 'readwrite');
      const msgStore = tx.objectStore(STORES.CHAT_MESSAGES);
      const chatsStore = tx.objectStore(STORES.CHATS);
      
      const msgKey = `chat_messages_${characterId}`;
      
      // Get existing messages
      const msgRequest = msgStore.get(msgKey);
      msgRequest.onsuccess = () => {
        const existingMessages = msgRequest.result || [];
        const updatedMessages = [...existingMessages, ...newMessages];
        msgStore.put(updatedMessages, msgKey);
        
        // Get chat list
        const chatListRequest = chatsStore.get('chat_list');
        chatListRequest.onsuccess = () => {
          const chatList = chatListRequest.result || [];
          const chatIndex = chatList.findIndex(c => c.id === characterId);
          
          if (chatIndex !== -1) {
            const chat = chatList[chatIndex];
            const lastMsg = newMessages[newMessages.length - 1];
            
            // Increment unread count
            const currentUnread = chat.unread || 0;

            // Determine sender name for display (prefer nickname/remark)
            let displaySender = lastMsg.senderName;
            if (lastMsg.senderId === 'character' && senderDisplayName) {
              displaySender = senderDisplayName;
            }
            
            chatList[chatIndex] = {
              ...chat,
              lastMessage: lastMsg.text,
              lastSender: displaySender,
              timestamp: new Date(lastMsg.timestamp).getTime(),
              time: new Date(lastMsg.timestamp).toLocaleTimeString(),
              unread: currentUnread + newMessages.length
            };
            
            chatsStore.put(chatList, 'chat_list');
          }
        };
      };
      
      tx.oncomplete = () => {
        console.log('[Service Worker] Messages saved to DB');
        db.close();
        resolve();
      };
      
      tx.onerror = () => {
        console.error('[Service Worker] Transaction failed:', tx.error);
        db.close();
        reject(tx.error);
      };
    });
    
  } catch (error) {
    console.error('[Service Worker] DB Save Failed:', error);
  }
}

async function saveMemoriesToDB(characterId, newMemories) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.CHARACTERS], 'readwrite');
      const store = tx.objectStore(STORES.CHARACTERS);
      
      const request = store.get('characters');
      
      request.onsuccess = () => {
        const characters = request.result || [];
        const charIndex = characters.findIndex(c => c.id === characterId);
        
        if (charIndex >= 0) {
          const char = characters[charIndex];
          const existingMemories = char.memories || [];
          // Merge memories
          char.memories = [...existingMemories, ...newMemories];
          characters[charIndex] = char;
          
          store.put(characters, 'characters');
          console.log('[Service Worker] Saved', newMemories.length, 'memories for', char.name);
        }
      };
      
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      
      tx.onerror = () => {
        console.error('[Service Worker] Memory Transaction failed:', tx.error);
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('[Service Worker] Memory DB Save Failed:', error);
  }
}

function parseMemoryResult(text) {
    try {
        let jsonStr = text;
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        } else {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = text.substring(firstBrace, lastBrace + 1);
            }
        }

        const data = JSON.parse(jsonStr);
        const items = [];
        const now = new Date().toISOString().split('T')[0];

        // 1. Permanent
        if (Array.isArray(data.permanent)) {
            data.permanent.forEach(content => {
                if (typeof content === 'string' && content.trim()) {
                    items.push({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                        type: 'permanent',
                        content: content.trim(),
                        created_at: now,
                        active: true,
                        tags: []
                    });
                }
            });
        }

        // 2. Event
        if (Array.isArray(data.event)) {
            data.event.forEach(event => {
                if (event && event.content) {
                    const tags = Array.isArray(event.tags) ? event.tags : (typeof event.tags === 'string' ? [event.tags] : []);
                    let expires_at = undefined;
                    if (event.expire_at && /^\d{4}-\d{2}-\d{2}$/.test(event.expire_at)) {
                        expires_at = event.expire_at;
                    } else if (event.suggested_expire_days) {
                        const d = new Date();
                        d.setDate(d.getDate() + Number(event.suggested_expire_days));
                        expires_at = d.toISOString().split('T')[0];
                    }
                    items.push({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                        type: 'event',
                        content: event.content,
                        created_at: now,
                        tags: tags,
                        active: true,
                        expires_at
                    });
                }
            });
        }

        // 3. Summary
        if (data.summary) {
            const summary = data.summary;
            if (typeof summary === 'object' && summary.content) {
                 const tags = Array.isArray(summary.tags) ? summary.tags : (typeof summary.tags === 'string' ? [summary.tags] : []);
                 items.push({
                     id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                     type: 'summary',
                     content: summary.content,
                     created_at: now,
                     active: true,
                     tags: tags
                 });
            } else if (typeof summary === 'string') {
                 items.push({
                     id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                     type: 'summary',
                     content: summary,
                     created_at: now,
                     active: true,
                     tags: []
                 });
            }
        }
        return items;
    } catch (e) {
        console.error('[Service Worker] Memory Parse Failed:', e);
        return [];
    }
}