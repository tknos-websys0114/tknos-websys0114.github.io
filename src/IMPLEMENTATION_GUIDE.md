# IM 通知系统完整实现指南

## 📋 目标

实现一个完整的 IM 通知系统，支持：
- ✅ 后台 AI 调用（离开聊天界面不中断）
- ✅ 锁屏通知推送
- ✅ 消息列表实时刷新
- ✅ 多会话并发处理
- ✅ 未读消息徽章

## 🏗️ 架构设计

### 核心分工

**前端 (React)**
- 负责 UI 渲染
- 构建完整的 AI prompt（包含角色、世界书、时间信息、表情包等）
- 组织消息历史
- 创建任务并提交到队列
- 监听 Service Worker 返回的结果
- 更新 UI 和数据库

**Service Worker**
- 只负责后台执行 AI HTTP 请求
- 不构建 prompt（接收前端已构建好的 prompt）
- 处理任务队列
- 发送系统通知
- 通知前端任务完成/失败

### 数据流

```
用户发送消息
    ↓
前端构建完整 prompt
    ↓
创建任务 → IndexedDB (AI_TASKS store)
    ↓
Service Worker 监听到新任务
    ↓
后台调用 AI API
    ↓
保存 AI 回复到数据库
    ↓
发送系统通知
    ↓
postMessage 通知前端
    ↓
前端刷新 UI
```

## 📝 实现步骤

### 第 1 步：创建任务队列系统 (taskQueue.ts)

**文件**: `/utils/taskQueue.ts`

**功能**:
- 定义任务数据结构
- 提供任务 CRUD 操作
- 支持任务状态管理（pending/processing/completed/failed）

**关键类型**:

```typescript
// 任务数据结构
export interface AITask {
  taskId: string;
  chatId: string; // 会话 ID
  type: 'ai_reply';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  payload: {
    // 前端已构建好的完整 prompt
    systemPrompt: string;
    userPrompt: string;
    
    // AI 配置
    apiKey: string;
    baseUrl: string;
    modelName: string;
    temperature: number;
    
    // 待识别的图片（如果有）
    pendingImageBase64?: string;
    
    // 用于通知的信息
    characterName: string;
    userNickname: string;
  };
  result?: {
    messages: Array<{
      id: string;
      text: string;
      senderId: 'character';
      senderName: string;
      timestamp: number;
      stickerId?: string;
      isPlaceholderImage?: boolean;
      quote?: {
        sender: string;
        content: string;
      };
    }>;
  };
  error?: string;
}
```

**关键函数**:

```typescript
// 创建任务
export async function createAITask(
  chatId: string,
  payload: AITask['payload']
): Promise<string>

// 获取待处理任务
export async function getPendingTasks(): Promise<AITask[]>

// 更新任务状态
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<void>

// 完成任务
export async function completeTask(
  taskId: string,
  result: AITask['result']
): Promise<void>

// 标记任务失败
export async function failTask(
  taskId: string,
  error: string
): Promise<void>
```

**注意事项**:
- ✅ 任务 ID 必须唯一（使用 `task_${Date.now()}_${Math.random()}`）
- ✅ 任务必须包含 chatId，用于将结果路由到正确的会话
- ✅ payload 不存储组件状态，只存储序列化数据

---

### 第 2 步：修改数据库架构 (db.ts)

**文件**: `/utils/db.ts`

**新增 Store**:

```typescript
export const STORES = {
  // ... 原有的 stores
  AI_TASKS: 'ai_tasks', // 新增：AI 任务队列
};

// 在 initDB 中添加
if (!db.objectStoreNames.contains(STORES.AI_TASKS)) {
  db.createObjectStore(STORES.AI_TASKS);
}
```

**注意事项**:
- ✅ 需要更新数据库版本号
- ✅ 确保向后兼容（检查 objectStore 是否存在）

---

### 第 3 步：创建 Prompt 构建辅助函数 (aiPromptBuilder.ts)

**文件**: `/utils/aiPromptBuilder.ts`

**功能**:
- 在前端构建完整的 AI prompt
- 包含所有必要的上下文（角色、世界书、时间、表情包等）
- 返回可序列化的 prompt 字符串

**关键函数**:

```typescript
export async function buildAIPrompt(options: {
  characterId: string;
  character: Character;
  userNickname: string;
  displayName: string;
  allMessages: Message[];
}): Promise<{
  systemPrompt: string;
  userPrompt: string;
  apiConfig: {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    temperature: number;
  };
  characterName: string;
}>
```

**Prompt 应该包含**:
- 世界观设定
- 世界书内容（全局 + 已启用的局部）
- 角色设定和性格描述
- 用户信息（审神者名、生日、就任日等）
- 时间信息（当前时段、季节、节气、特殊日期）
- 聊天历史（最近 N 条消息）
- 表情包列表和使用指导
- 输出格式要求

**注意事项**:
- ✅ 所有数据从 IndexedDB 读取
- ✅ 不依赖 React state（可能在后台运行）
- ✅ 返回纯字符串，可序列化

---

### 第 4 步：修改 PrivateChat.tsx 的 handleAIReply

**文件**: `/components/PrivateChat.tsx`

**旧逻辑** (删除):
```typescript
// ❌ 删除直接调用 AI API 的代码
// ❌ 删除 prompt 构建后直接调用 fetch
// ❌ 删除 try-catch-finally 中的 AI 调用
```

**新逻辑**:

```typescript
const handleAIReply = async () => {
  if (isAIReplying) return;
  setIsAIReplying(true);
  
  try {
    // 1. 发送用户消息（如果有）
    if (inputText.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        text: inputText.trim(),
        senderId: 'user',
        senderName: userNickname,
        timestamp: new Date(),
      };
      
      allMessagesRef.current = [...allMessagesRef.current, userMessage];
      setMessages([...allMessagesRef.current]);
      
      await saveMessages(allMessagesRef.current);
      await updateChatList(allMessagesRef.current);
      
      setInputText('');
    }
    
    // 2. 处理待发送的图片（如果有）
    let pendingImageBase64;
    if (pendingImage) {
      const reader = new FileReader();
      pendingImageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pendingImage);
      });
      
      // 清空待发送图片
      setPendingImage(null);
      setPendingImagePreview(null);
    }
    
    // 3. 构建完整的 AI prompt（前端负责）
    const promptData = await buildAIPrompt({
      characterId,
      character: character!,
      userNickname,
      displayName,
      allMessages: allMessagesRef.current,
    });
    
    // 4. 创建任务
    const taskId = await createAITask(characterId, {
      systemPrompt: promptData.systemPrompt,
      userPrompt: promptData.userPrompt,
      apiKey: promptData.apiConfig.apiKey,
      baseUrl: promptData.apiConfig.baseUrl,
      modelName: promptData.apiConfig.modelName,
      temperature: promptData.apiConfig.temperature,
      pendingImageBase64,
      characterName: promptData.characterName,
      userNickname,
    });
    
    console.log(`[PrivateChat] AI 任务已创建: ${taskId}`);
    
    // ✅ 注意：不要在这里设置 setIsAIReplying(false)
    // ✅ 等待 Service Worker 返回结果后再设置
    
  } catch (error: any) {
    console.error('[PrivateChat] 创建任务失败:', error);
    setErrorToast({ show: true, message: `AI回复失败: ${error.message}` });
    setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
    setIsAIReplying(false); // 只在创建任务失败时才重置
  }
};
```

**注意事项**:
- ✅ 在前端构建完整 prompt
- ✅ 不调用 AI API
- ✅ 创建任务后不重置 isAIReplying（等待后台返回）
- ✅ 支持图片识别（传递 base64）

---

### 第 5 步：在 PrivateChat.tsx 添加消息监听

**文件**: `/components/PrivateChat.tsx`

**在 useEffect 中添加**:

```typescript
useEffect(() => {
  // ... 原有的初始化代码
  
  // 监听 Service Worker 消息
  const handleServiceWorkerMessage = async (event: MessageEvent) => {
    const { type, chatId, taskId, result, error } = event.data;
    
    // 只处理当前聊天的消息
    if (chatId !== characterId) return;
    
    if (type === 'AI_TASK_COMPLETED') {
      console.log('[PrivateChat] AI 任务完成，刷新消息列表');
      
      // 从数据库重新加载消息
      const key = `chat_messages_${characterId}`;
      const updatedMessages = await db.get<Message[]>(STORES.CHAT_MESSAGES, key) || [];
      
      // 更新状态
      allMessagesRef.current = updatedMessages;
      setMessages([...updatedMessages]);
      setIsAIReplying(false);
      
      // 更新缓存
      globalCache.messages[characterId] = updatedMessages;
      
    } else if (type === 'AI_TASK_FAILED') {
      console.error('[PrivateChat] AI 任务失败:', error);
      setErrorToast({ show: true, message: `AI回复失败: ${error}` });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
      setIsAIReplying(false);
    }
  };
  
  // 注册监听器
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }
  
  return () => {
    // 清理监听器
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    }
  };
}, [characterId]);
```

**注意事项**:
- ✅ 使用 chatId 过滤消息（只处理当前聊天）
- ✅ 从数据库重新加载消息（不依赖缓存）
- ✅ 更新缓存以保持一致性
- ✅ 正确清理监听器

---

### 第 6 步：扩展 Service Worker (sw.js)

**文件**: `/public/sw.js`

**核心功能**:
1. 轮询检查待处理任务
2. 调用 AI API
3. 解析响应
4. 保存消息到数据库
5. 发送系统通知
6. 通知前端

**完整实现**:

```javascript
// ========== 全局变量 ==========
let taskPollingInterval = null;
const POLLING_INTERVAL = 2000; // 2秒检查一次

// ========== Service Worker 生命周期 ==========
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      startTaskPolling(); // 启动任务轮询
    })()
  );
});

// ========== 任务轮询系统 ==========
function startTaskPolling() {
  if (taskPollingInterval) return; // 避免重复启动
  
  console.log('[SW] 启动任务轮询');
  taskPollingInterval = setInterval(async () => {
    try {
      await processPendingTasks();
    } catch (error) {
      console.error('[SW] 任务处理失败:', error);
    }
  }, POLLING_INTERVAL);
}

function stopTaskPolling() {
  if (taskPollingInterval) {
    clearInterval(taskPollingInterval);
    taskPollingInterval = null;
    console.log('[SW] 停止任务轮询');
  }
}

// ========== IndexedDB 操作 ==========
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SaniwaDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromDB(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToDB(storeName, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromDB(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
      const keys = [];
      const keyRequest = store.getAllKeys();
      keyRequest.onsuccess = () => {
        const result = {};
        request.result.forEach((value, index) => {
          result[keyRequest.result[index]] = value;
        });
        resolve(result);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

// ========== 任务处理 ==========
async function processPendingTasks() {
  // 获取所有任务
  const allTasks = await getAllFromDB('ai_tasks');
  
  // 筛选待处理任务
  const pendingTasks = Object.entries(allTasks)
    .filter(([_, task]) => task.status === 'pending')
    .map(([taskId, task]) => ({ taskId, ...task }))
    .sort((a, b) => a.createdAt - b.createdAt);
  
  if (pendingTasks.length === 0) return;
  
  console.log(`[SW] 发现 ${pendingTasks.length} 个待处理任务`);
  
  // 逐个处理任务（串行，避免并发冲突）
  for (const task of pendingTasks) {
    try {
      await processTask(task);
    } catch (error) {
      console.error(`[SW] 任务处理失败 ${task.taskId}:`, error);
    }
  }
}

async function processTask(task) {
  const { taskId, chatId, payload } = task;
  
  console.log(`[SW] 处理任务 ${taskId} (聊天: ${chatId})`);
  
  // 更新状态为 processing
  task.status = 'processing';
  task.updatedAt = Date.now();
  await saveToDB('ai_tasks', taskId, task);
  
  try {
    // 1. 处理图片识别（如果有）
    let imageDescription = null;
    if (payload.pendingImageBase64) {
      console.log(`[SW] 识别图片...`);
      imageDescription = await recognizeImage(payload);
    }
    
    // 2. 调用 AI API 生成回复
    console.log(`[SW] 调用 AI API...`);
    const aiMessages = await callAI(payload, imageDescription);
    
    // 3. 保存消息到数据库
    console.log(`[SW] 保存消息到数据库...`);
    await saveAIMessages(chatId, aiMessages, payload.characterName);
    
    // 4. 更新聊天列表
    await updateChatList(chatId, aiMessages, payload.characterName);
    
    // 5. 发送系统通知
    await sendNotification(chatId, aiMessages[0], payload);
    
    // 6. 标记任务完成
    task.status = 'completed';
    task.updatedAt = Date.now();
    task.result = { messages: aiMessages };
    await saveToDB('ai_tasks', taskId, task);
    
    console.log(`[SW] 任务完成 ${taskId}`);
    
    // 7. 通知前端
    await notifyClients({
      type: 'AI_TASK_COMPLETED',
      chatId,
      taskId,
      result: task.result,
    });
    
  } catch (error) {
    console.error(`[SW] 任务失败 ${taskId}:`, error);
    
    // 标记任务失败
    task.status = 'failed';
    task.updatedAt = Date.now();
    task.error = error.message || String(error);
    await saveToDB('ai_tasks', taskId, task);
    
    // 通知前端
    await notifyClients({
      type: 'AI_TASK_FAILED',
      chatId,
      taskId,
      error: task.error,
    });
  }
}

// ========== AI API 调用 ==========
async function recognizeImage(payload) {
  const response = await fetch(`${payload.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${payload.apiKey}`,
    },
    body: JSON.stringify({
      model: payload.modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请详细描述这张图片的内容，包括主要物体、颜色、光线、背景等。用简洁的中文回答，不要超过100字。'
            },
            {
              type: 'image_url',
              image_url: {
                url: payload.pendingImageBase64
              }
            }
          ]
        }
      ],
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`图片识别失败: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '无法识别图片内容';
}

async function callAI(payload, imageDescription) {
  // 如果有图片识别结果，添加到 prompt 中
  let userPrompt = payload.userPrompt;
  if (imageDescription) {
    userPrompt = `[图片识别结果] ${imageDescription}\n\n${userPrompt}`;
  }
  
  const response = await fetch(`${payload.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${payload.apiKey}`,
    },
    body: JSON.stringify({
      model: payload.modelName,
      messages: [
        { role: 'system', content: payload.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: payload.temperature,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 失败 (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;
  
  if (!aiResponse) {
    throw new Error('AI 未返回有效响应');
  }
  
  // 解析 JSON 响应
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 响应格式错误');
  }
  
  const parsedResponse = JSON.parse(jsonMatch[0]);
  const messages = parsedResponse.messages || [];
  
  // 转换为消息格式
  return messages.map((msg, index) => {
    const timestamp = Date.now() + index;
    
    if (msg.isPlaceholderImage) {
      return {
        id: `${timestamp}`,
        text: (msg.content || '').slice(0, 100),
        senderId: 'character',
        senderName: payload.characterName,
        timestamp,
        isPlaceholderImage: true,
        isRead: false, // 后台生成的消息标记为未读
      };
    }
    
    const message = {
      id: `${timestamp}`,
      text: msg.stickerId ? '[表情]' : (msg.content || ''),
      senderId: 'character',
      senderName: payload.characterName,
      timestamp,
      isRead: false, // 后台生成的消息标记为未读
    };
    
    if (msg.stickerId) {
      message.stickerId = msg.stickerId;
    }
    
    if (msg.quote) {
      message.quote = {
        sender: msg.quote.sender,
        content: msg.quote.content,
      };
    }
    
    return message;
  });
}

// ========== 数据库操作 ==========
async function saveAIMessages(chatId, aiMessages, characterName) {
  const key = `chat_messages_${chatId}`;
  const existingMessages = await getFromDB('chat_messages', key) || [];
  
  // 转换时间戳为 Date 对象
  const newMessages = aiMessages.map(msg => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
  
  const updatedMessages = [...existingMessages, ...newMessages];
  await saveToDB('chat_messages', key, updatedMessages);
}

async function updateChatList(chatId, aiMessages, characterName) {
  let chats = await getFromDB('chats', 'chat_list') || [];
  const existingChatIndex = chats.findIndex(chat => chat.id === chatId);
  
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const lastMessage = aiMessages[aiMessages.length - 1];
  
  const chatItem = {
    id: chatId,
    name: characterName,
    lastMessage: lastMessage.text,
    lastSender: characterName,
    time: timeString,
    timestamp: now.getTime(),
    unreadCount: (existingChatIndex !== -1 ? (chats[existingChatIndex].unreadCount || 0) : 0) + aiMessages.length,
  };
  
  if (existingChatIndex !== -1) {
    const existingChat = chats[existingChatIndex];
    chatItem.isPinned = existingChat.isPinned;
    chatItem.remark = existingChat.remark;
    chats[existingChatIndex] = chatItem;
  } else {
    chats.unshift(chatItem);
  }
  
  await saveToDB('chats', 'chat_list', chats);
}

// ========== 系统通知 ==========
async function sendNotification(chatId, message, payload) {
  // 检查通知权限
  if (Notification.permission !== 'granted') {
    console.log('[SW] 没有通知权限，跳过');
    return;
  }
  
  // 检查是否有活跃的客户端在当前聊天
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    if (client.visibilityState === 'visible') {
      // 如果有可见窗口，不发送通知（用户正在查看）
      console.log('[SW] 检测到活跃窗口，跳过通知');
      return;
    }
  }
  
  // 发送通知
  const notificationTitle = payload.characterName;
  const notificationBody = message.stickerId ? '[表情]' : message.text;
  
  await self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: chatId, // 同一聊天的通知会合并
    data: {
      chatId,
      url: '/', // 点击通知后跳转的 URL
    },
  });
  
  console.log('[SW] 已发送通知');
}

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const chatId = event.notification.data.chatId;
  
  event.waitUntil(
    (async () => {
      // 查找已打开的窗口
      const clients = await self.clients.matchAll({ type: 'window' });
      
      // 如果有窗口，聚焦它
      if (clients.length > 0) {
        await clients[0].focus();
        // TODO: 发送消息让前端打开对应聊天
        clients[0].postMessage({
          type: 'OPEN_CHAT',
          chatId,
        });
      } else {
        // 没有窗口，打开新窗口
        await self.clients.openWindow('/');
      }
    })()
  );
});

// ========== 通知前端 ==========
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage(message);
  }
}

// ========== 原有的 fetch 监听器（保持不变）==========
self.addEventListener('fetch', (event) => {
  // 你原有的缓存策略
});
```

**注意事项**:
- ✅ Service Worker 不构建 prompt（接收前端已构建的 prompt）
- ✅ 支持图片识别
- ✅ 后台生成的消息标记为未读（isRead: false）
- ✅ 更新聊天列表的未读计数
- ✅ 只在没有活跃窗口时发送通知
- ✅ 不破坏原有的 fetch 监听器

---

### 第 7 步：在 App.tsx 注册 Service Worker

**文件**: `/App.tsx`

**在 useEffect 中添加**:

```typescript
useEffect(() => {
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker 注册成功:', registration);
      })
      .catch((error) => {
        console.error('[App] Service Worker 注册失败:', error);
      });
  }
}, []);
```

---

### 第 8 步：在消息列表组件监听未读消息

**文件**: `/components/MessageList.tsx`（或你的消息列表组件）

**添加监听器**:

```typescript
useEffect(() => {
  // 监听 Service Worker 消息
  const handleServiceWorkerMessage = async (event: MessageEvent) => {
    const { type, chatId } = event.data;
    
    if (type === 'AI_TASK_COMPLETED' || type === 'AI_TASK_FAILED') {
      // 刷新聊天列表
      await loadChatList();
    }
  };
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }
  
  return () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    }
  };
}, []);
```

**注意事项**:
- ✅ 监听所有聊天的任务完成事件
- ✅ 刷新整个聊天列表以更新未读计数
- ✅ 正确清理监听器

---

## 🧪 测试步骤

### 测试 1：基本功能
1. 打开聊天界面
2. 发送一条消息
3. 验证 AI 回复正常

### 测试 2：离开界面
1. 发送一条消息
2. 立即关闭聊天界面（返回桌面）
3. 等待几秒
4. 重新打开聊天界面
5. ✅ 应该看到 AI 的回复

### 测试 3：锁屏通知
1. 发送一条消息
2. 按 Home 键或锁屏
3. ✅ 应该收到系统通知

### 测试 4：未读消息
1. 发送一条消息
2. 关闭聊天界面
3. 等待 AI 回复
4. 在消息列表中查看
5. ✅ 应该显示未读徽章

### 测试 5：多会话并发
1. 打开聊天 A，发送消息
2. 切换到聊天 B，发送消息
3. 返回桌面
4. ✅ 两个聊天都应该收到回复
5. ✅ 消息不应该错位

---

## ⚠️ 常见问题

### Q1: Service Worker 没有启动任务轮询
**原因**: Service Worker 可能被浏览器休眠
**解决**: 确保在 `activate` 事件中调用 `startTaskPolling()`

### Q2: 前端收不到 Service Worker 的消息
**原因**: 监听器未正确注册或已被清理
**解决**: 检查 useEffect 依赖数组，确保监听器不被意外移除

### Q3: AI 回复后消息列表没有刷新
**原因**: 消息列表组件没有监听 Service Worker 消息
**解决**: 在消息列表组件添加监听器

### Q4: 任务重复处理
**原因**: 任务状态更新不及时
**解决**: 在处理任务前立即更新状态为 `processing`

### Q5: 通知权限被拒绝
**原因**: 用户未授权
**解决**: 在适当时机（如首次发送消息）请求通知权限

---

## 📊 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                          前端 (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 用户发送消息                                              │
│      ↓                                                       │
│  2. 构建完整 prompt (buildAIPrompt)                          │
│      ↓                                                       │
│  3. 创建任务 (createAITask)                                  │
│      ↓                                                       │
│  4. 保存到 IndexedDB (AI_TASKS store)                        │
│      ↓                                                       │
│  5. 等待 Service Worker 处理...                              │
│                                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Worker (后台)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 轮询检查 IndexedDB (每 2 秒)                             │
│      ↓                                                       │
│  2. 发现待处理任务                                            │
│      ↓                                                       │
│  3. 更新状态为 processing                                     │
│      ↓                                                       │
│  4. 处理图片识别（如果有）                                     │
│      ↓                                                       │
│  5. 调用 AI API (使用前端构建的 prompt)                       │
│      ↓                                                       │
│  6. 解析 AI 响应                                             │
│      ↓                                                       │
│  7. 保存消息到 IndexedDB (CHAT_MESSAGES store)               │
│      ↓                                                       │
│  8. 更新聊天列表 (未读计数)                                   │
│      ↓                                                       │
│  9. 发送系统通知 (如果没有活跃窗口)                            │
│      ↓                                                       │
│  10. 更新任务状态为 completed                                 │
│      ↓                                                       │
│  11. postMessage 通知所有前端客户端                           │
│                                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       前端 (React)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 接收 Service Worker 消息                                 │
│      ↓                                                       │
│  2. 检查 chatId 是否匹配                                      │
│      ↓                                                       │
│  3. 从 IndexedDB 重新加载消息                                 │
│      ↓                                                       │
│  4. 更新 UI (setMessages)                                    │
│      ↓                                                       │
│  5. 重置 isAIReplying                                        │
│      ↓                                                       │
│  6. 更新缓存                                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ 检查清单

- [ ] 创建 taskQueue.ts
- [ ] 更新 db.ts 添加 AI_TASKS store
- [ ] 创建 aiPromptBuilder.ts
- [ ] 修改 PrivateChat.tsx 的 handleAIReply
- [ ] 在 PrivateChat.tsx 添加消息监听
- [ ] 扩展 Service Worker (sw.js)
- [ ] 在 App.tsx 注册 Service Worker
- [ ] 在消息列表组件添加监听器
- [ ] 测试基本功能
- [ ] 测试离开界面
- [ ] 测试锁屏通知
- [ ] 测试未读消息
- [ ] 测试多会话并发

---

## 🎯 最终效果

完成后，你的应用将支持：

✅ **离开界面后 AI 继续运行**
- 发送消息后可以立即关闭聊天
- 可以切换到其他界面
- 可以按 Home 键退出 PWA
- AI 在后台继续处理，不会中断

✅ **锁屏通知**
- 离开应用后收到系统通知
- 通知显示角色名和消息内容
- 点击��知可以打开应用

✅ **消息列表实时刷新**
- AI 回复后自动更新未读计数
- 显示最新消息预览
- 支持多会话同时接收消息

✅ **严格的会话隔离**
- 每个任务包含 chatId
- 消息不会发送到错误的聊天
- 支持多个聊天并发处理

---

## 📚 相关文件

- `/utils/taskQueue.ts` - 任务队列管理
- `/utils/aiPromptBuilder.ts` - Prompt 构建
- `/utils/db.ts` - 数据库操作
- `/components/PrivateChat.tsx` - 聊天界面
- `/public/sw.js` - Service Worker
- `/App.tsx` - 应用入口

---

## 🔧 调试技巧

### 查看 Service Worker 状态
1. 打开 Chrome DevTools
2. 进入 Application > Service Workers
3. 查看 Service Worker 状态和日志

### 查看 IndexedDB
1. 打开 Chrome DevTools
2. 进入 Application > Storage > IndexedDB
3. 查看 ai_tasks store 中的任务

### 查看通知权限
1. 打开 Chrome DevTools
2. 进入 Application > Notifications
3. 检查权限状态

### 强制刷新 Service Worker
```javascript
// 在控制台执行
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

---

好了，现在你可以按照这个文档一步一步实现整个 IM 通知系统！🚀
