/**
 * AI 任务队列管理
 * 
 * 负责任务的 CRUD 操作和状态管理
 */

import { db, STORES } from './db';

// 任务类型
export type TaskType = 'private_chat_reply' | 'image_recognition';

// 任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 任务数据结构
export interface AITask {
  taskId: string;
  chatId: string; // 会话 ID（用于路由结果）
  type: TaskType;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  payload: AITaskPayload;
  result?: AITaskResult;
  error?: string;
}

// 任务 Payload（前端构建的完整数据）
export interface AITaskPayload {
  // AI 配置
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
  maxTokens?: number;
  
  // 前端已构建好的完整 prompt
  systemPrompt: string;
  userPrompt: string;
  
  // 图片识别相关（如果有）
  pendingImageBase64?: string;
  imageRecognitionPrompt?: string; // 图片识别的 prompt
  
  // 用于通知和显示的信息
  characterName: string;
  userNickname: string;
  displayName?: string;
}

// 任务结果
export interface AITaskResult {
  // AI 回复的消息
  messages?: Array<{
    id: string;
    text: string;
    senderId: 'character' | 'user';
    senderName: string;
    timestamp: number;
    stickerId?: string;
    isPlaceholderImage?: boolean;
    quote?: {
      sender: string;
      content: string;
    };
  }>;
  
  // 图片识别结果
  imageDescription?: string;
}

/**
 * 创建 AI 任务
 */
export async function createAITask(
  chatId: string,
  type: TaskType,
  payload: AITaskPayload
): Promise<string> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const task: AITask = {
    taskId,
    chatId,
    type,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payload,
  };
  
  await db.set(STORES.AI_TASKS, taskId, task);
  console.log(`[TaskQueue] 创建任务 ${taskId} (类型: ${type}, 聊天: ${chatId})`);
  
  // 发送任务到 Service Worker 进行后台处理
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // 构建 API 配置
    const apiConfig = {
      apiKey: payload.apiKey,
      baseUrl: payload.baseUrl,
      modelName: payload.modelName,
      temperature: payload.temperature,
      maxTokens: payload.maxTokens,
    };
    
    // 构建消息数组
    const messages = [
      { role: 'system', content: payload.systemPrompt },
      { role: 'user', content: payload.userPrompt }
    ];
    
    // 发送消息到 Service Worker
    navigator.serviceWorker.controller.postMessage({
      type: 'PROCESS_AI_TASK',
      payload: {
        taskId,
        characterId: chatId,
        characterName: payload.characterName,
        apiConfig,
        messages,
        // 传递图片识别相关数据
        pendingImageBase64: payload.pendingImageBase64,
        imageRecognitionPrompt: payload.imageRecognitionPrompt,
      }
    });
    
    console.log(`[TaskQueue] 任务已发送到 Service Worker: ${taskId}`);
  } else {
    console.warn('[TaskQueue] Service Worker 不可用，任务只保存到数据库，需要前端自行处理');
    // 触发自定义事件通知前端 Service Worker 不可用，需要降级处理
    window.dispatchEvent(new CustomEvent('ai-task-needs-fallback', { detail: { taskId, task } }));
  }
  
  return taskId;
}

/**
 * 获取所有待处理的任务
 */
export async function getPendingTasks(): Promise<AITask[]> {
  const allTasks = await db.getAll<AITask>(STORES.AI_TASKS);
  
  return Object.values(allTasks)
    .filter(task => task.status === 'pending')
    .sort((a, b) => a.createdAt - b.createdAt); // 按创建时间排序
}

/**
 * 获取指定聊天的任务
 */
export async function getTasksByChatId(chatId: string): Promise<AITask[]> {
  const allTasks = await db.getAll<AITask>(STORES.AI_TASKS);
  
  return Object.values(allTasks)
    .filter(task => task.chatId === chatId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * 获取单个任务
 */
export async function getTask(taskId: string): Promise<AITask | null> {
  return await db.get<AITask>(STORES.AI_TASKS, taskId);
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  error?: string
): Promise<void> {
  const task = await getTask(taskId);
  if (!task) {
    console.error(`[TaskQueue] 任务不存在: ${taskId}`);
    return;
  }
  
  task.status = status;
  task.updatedAt = Date.now();
  if (error) {
    task.error = error;
  }
  
  await db.set(STORES.AI_TASKS, taskId, task);
  console.log(`[TaskQueue] 更新任务状态 ${taskId}: ${status}`);
}

/**
 * 完成任务
 */
export async function completeTask(
  taskId: string,
  result: AITaskResult
): Promise<void> {
  const task = await getTask(taskId);
  if (!task) {
    console.error(`[TaskQueue] 任务不存在: ${taskId}`);
    return;
  }
  
  task.status = 'completed';
  task.updatedAt = Date.now();
  task.result = result;
  
  await db.set(STORES.AI_TASKS, taskId, task);
  console.log(`[TaskQueue] 任务完成 ${taskId}`);
}

/**
 * 标记任务失败
 */
export async function failTask(taskId: string, error: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) {
    console.error(`[TaskQueue] 任务不存在: ${taskId}`);
    return;
  }
  
  task.status = 'failed';
  task.updatedAt = Date.now();
  task.error = error;
  
  await db.set(STORES.AI_TASKS, taskId, task);
  console.error(`[TaskQueue] 任务失败 ${taskId}:`, error);
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<void> {
  await db.delete(STORES.AI_TASKS, taskId);
  console.log(`[TaskQueue] 删除任务 ${taskId}`);
}

/**
 * 清理已完成的任务（保留最近 24 小时的）
 */
export async function cleanupCompletedTasks(): Promise<void> {
  const allTasks = await db.getAll<AITask>(STORES.AI_TASKS);
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  
  for (const [taskId, task] of Object.entries(allTasks)) {
    // 删除超过 24 小时的已完成/失败任务
    if (
      (task.status === 'completed' || task.status === 'failed') &&
      task.updatedAt < oneDayAgo
    ) {
      await deleteTask(taskId);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`[TaskQueue] 清理了 ${deletedCount} 个旧任务`);
  }
}