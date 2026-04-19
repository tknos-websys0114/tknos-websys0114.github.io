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
          const memories = parseMemoryResult(aiResponse, payload.referenceDate);
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

      } else if (taskType === 'shop_generation') {
          // 尝试解析 JSON
          let shopItems = [];
          try {
            let jsonStr = aiResponse;
            const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1];
            } else {
                const firstBrace = aiResponse.indexOf('{');
                const lastBrace = aiResponse.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
                }
            }
            const parsed = JSON.parse(jsonStr);
            shopItems = parsed.items || [];
            
            // 为每个商品生成唯一 ID
            shopItems = shopItems.map(item => ({
                ...item,
                id: item.id || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                category: item.category || 'recommended' // Fallback
            }));
            
            // 保存商品到 IndexedDB (万屋双重写入机制)
            await saveShopItemsToDB(shopItems);

          } catch (e) {
            console.error('[Service Worker] Shop items parse failed', e);
            throw new Error('商品生成格式错误');
          }

          // 发送成功消息给所有客户端
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'AI_TASK_COMPLETED',
              payload: {
                taskId: payload.taskId,
                taskType: 'shop_generation',
                result: { shopItems }
              }
            });
          });
          console.log('[Service Worker] 万屋商品生成任务完成:', payload.taskId);

      } else if (taskType === 'whisper_chat_reply' || taskType === 'memory_summary') {
          // 传送模块：纯文本响应，不需要 JSON 解析
          console.log(`[Service Worker] ${taskType} 纯文本回复:`, aiResponse);
          const replyText = aiResponse.trim();
          
          let savedMessage = null;
          // 如果是 WhisperChat 回复，执行双重写入机制的后台部分
          if (taskType === 'whisper_chat_reply') {
            savedMessage = await saveWhisperMessageToDB(payload.characterId, replyText);
          } else if (taskType === 'memory_summary') {
            // Memory Summary 双重写入：构建 Memory 对象并保存
            const now = new Date();
            const memoryId = `mem_${now.getTime()}_${Math.random().toString(36).substr(2, 5)}`;
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const newMemory = {
                id: memoryId,
                type: 'date', // WhisperChat 总结默认为 date 类型
                content: replyText,
                created_at: todayStr,
                active: true,
                tags: ['自动总结']
            };
            
            await saveMemoriesToDB(payload.characterId, [newMemory]);
            savedMessage = newMemory; // 复用 savedMessage 变量传递给前端
            console.log('[Service Worker] Saved memory summary to DB:', memoryId);
          }
          
          // 直接将纯文本响应发送给客户端
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'AI_TASK_COMPLETED',
              payload: {
                taskId: payload.taskId,
                characterId: payload.characterId,
                taskType: taskType,
                result: replyText, // 返回纯文本
                message: savedMessage // 返回完整的消息对象（包含ID），供前端同步
              }
            });
          });
          console.log(`[Service Worker] ${taskType} 任务完成:`, payload.taskId);

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
                translation: msg.translation,
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
              translation: msg.translation,
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
          let enableNotifications = false;
          try {
            const db = await openDB();
            enableNotifications = await new Promise((resolve) => {
              const tx = db.transaction([STORES.CHATS], 'readonly');
              const store = tx.objectStore(STORES.CHATS);
              const req = store.get('chat_settings');
              req.onsuccess = () => {
                const settings = req.result;
                resolve(settings && settings.enableNotifications === true);
              };
              req.onerror = () => resolve(false);
            });
          } catch (e) {
            console.warn('[Service Worker] Failed to read chat settings for notifications', e);
          }

          // 确保只为私聊消息（标准的聊天任务）发送推送通知
          const isPrivateChat = !taskType || taskType === 'private_chat_reply';
          if (enableNotifications && !isVisible && isPrivateChat) {
            const title = payload.displayName || payload.characterName || '新消息';
            let avatarBase64 = null;
            try {
              avatarBase64 = await getCharacterAvatarBase64(payload.characterId);
            } catch(e) {}
            const iconUrl = avatarBase64 || "/icon-192.png";
            
            for (let i = 0; i < newMessages.length; i++) {
              const msg = newMessages[i];
              
              if (i > 0) {
                // 每条消息之间加一点延迟，模拟打字发送时间并避免通知覆盖
                await new Promise(res => setTimeout(res, 1500)); 
              }
              
              await self.registration.showNotification(title, {
                body: msg.text,
                icon: iconUrl,
                badge: "/icon-192.png",
                tag: `${payload.characterId}-${msg.id || Date.now()}-${i}`, // 确保tag唯一，保证每条都会弹出
                data: {
                  conversationId: payload.characterId,
                  characterName: title
                }
              });
            }
          }
          
          // �����送成功消息给所有客户端
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
            taskType: payload.taskType,
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

// IndexedDB Helper Functions
const DB_NAME = 'ToukenRanbuDB';
const DB_VERSION = 10; // 必须与主应用保持一致
const STORES = {
  CHAT_MESSAGES: 'chatMessages',
  CHATS: 'chats',
  CHARACTERS: 'characters',
  MISC: 'misc'
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getCharacterAvatarBase64(characterId) {
  try {
    const db = await openDB();
    const avatarKey = await new Promise((resolve) => {
      const tx = db.transaction([STORES.CHARACTERS], 'readonly');
      const store = tx.objectStore(STORES.CHARACTERS);
      const req = store.get('characters');
      req.onsuccess = () => {
        const chars = req.result || [];
        const char = chars.find(c => c.id === characterId);
        resolve(char ? char.avatar : null);
      };
      req.onerror = () => resolve(null);
    });

    if (!avatarKey) return null;

    if (typeof avatarKey === 'string' && avatarKey.startsWith('data:')) {
      return avatarKey;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open('DesktopImagesDB', 3);
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const imageDb = request.result;
        if (!imageDb.objectStoreNames.contains('images')) {
          imageDb.close();
          resolve(null);
          return;
        }

        const tx = imageDb.transaction(['images'], 'readonly');
        const store = tx.objectStore('images');
        
        // Use the proper category format if possible, fallback to old key
        const newKey = `avatars/${avatarKey}`;
        const getReq = store.get(newKey);
        
        getReq.onsuccess = async () => {
          let blob = getReq.result;
          
          const processBlob = async (b) => {
            if (!b) return resolve(null);
            if (typeof b === 'string') return resolve(b);
            try {
              const buffer = await b.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = btoa(binary);
              resolve(`data:${b.type || 'image/png'};base64,${base64}`);
            } catch (err) {
              console.warn('[Service Worker] Base64 conversion failed', err);
              resolve(null);
            }
          };

          if (!blob && newKey !== avatarKey) {
            const oldReq = store.get(avatarKey);
            oldReq.onsuccess = () => processBlob(oldReq.result);
            oldReq.onerror = () => resolve(null);
          } else {
            processBlob(blob);
          }
        };
        
        getReq.onerror = () => resolve(null);
        tx.oncomplete = () => imageDb.close();
      };
    });
  } catch (e) {
    console.warn('[Service Worker] Failed to get avatar base64', e);
    return null;
  }
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

// 万屋商品保存逻辑（双重写入机制的一部分）
async function saveShopItemsToDB(newItems) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.MISC], 'readwrite');
      const store = tx.objectStore(STORES.MISC);
      
      // 读取现有商品
      const request = store.get('shop_products');
      
      request.onsuccess = () => {
        const currentProducts = request.result || [];
        
        if (newItems.length > 0) {
           const categoryToReplace = newItems[0].category;
           let nextProducts = [...currentProducts];
           
           if (categoryToReplace === 'recommended') {
               // 替换现有推荐商品
               nextProducts = currentProducts.filter(p => p.category !== 'recommended');
               nextProducts = [...newItems, ...nextProducts];
           } else {
               // 替换同类商品
               nextProducts = currentProducts.filter(p => p.category !== categoryToReplace);
               nextProducts = [...newItems, ...nextProducts];
           }
           
           store.put(nextProducts, 'shop_products');
           console.log('[Service Worker] Saved shop items to DB');
        }
      };
      
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      
      tx.onerror = () => {
        console.error('[Service Worker] Shop Transaction failed:', tx.error);
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('[Service Worker] Shop DB Save Failed:', error);
  }
}

// WhisperChat 保存逻辑（双重写入机制）
async function saveWhisperMessageToDB(characterId, text) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.CHATS], 'readwrite');
      const store = tx.objectStore(STORES.CHATS);
      const key = `whisper_chat_messages_${characterId}`;
      
      const request = store.get(key);
      request.onsuccess = () => {
        const messages = request.result || [];
        // 构建与 WhisperChat.tsx 一致的消息对象
        const newMessage = {
            id: `${Date.now()}_ai`, // 确保ID唯一且符合前端格式
            text: text,
            sender: 'character',
            timestamp: new Date() // 使用对象格式，IDB支持
        };
        store.put([...messages, newMessage], key);
        console.log('[Service Worker] Saved WhisperChat message');
        // 返回保存的消息对象，以便前端同步使用相同的ID
        resolve(newMessage);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
      
      tx.onerror = () => {
        console.error('[Service Worker] WhisperChat Save Transaction failed:', tx.error);
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('[Service Worker] WhisperChat DB Save Failed:', error);
    return null;
  }
}

function parseMemoryResult(text, referenceDateStr) {
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
        
        // 使用参考日期作为计算基准，如果没有则默认为当前时间
        const baseDate = referenceDateStr ? new Date(referenceDateStr) : new Date();

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
                        const d = new Date(baseDate);
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
