/**
 * AI 任务管理器
 * 
 * 统一管理所有模块的 AI 调用任务
 */

import { createAITask, AITaskPayload } from './taskQueue';
import { buildPrivateChatPrompt, PrivateChatPromptOptions } from './promptBuilders/privateChatPromptBuilder';
import { fileToBase64, compressImage } from './imageRecognition';

/**
 * 创建私聊 AI 回复任务
 * 
 * @param options 私聊配置
 * @param pendingImage 待发送的图片（如果有）
 * @returns 任务 ID
 */
export async function createPrivateChatReplyTask(
  options: PrivateChatPromptOptions,
  pendingImage?: File | null
): Promise<string> {
  try {
    console.log('[AITaskManager] 创建私聊 AI 回复任务...');
    
    // 1. 构建完整的 prompt
    const promptResult = await buildPrivateChatPrompt(options);
    
    // 2. 处理待发送的图片（如果有）
    let pendingImageBase64: string | undefined;
    if (pendingImage) {
      console.log('[AITaskManager] 压缩图片...');
      // 压缩图片到合适大小
      pendingImageBase64 = await compressImage(pendingImage, 1024, 1024, 0.8);
    }
    
    // 3. 构建任务 payload
    const payload: AITaskPayload = {
      apiKey: promptResult.apiConfig.apiKey,
      baseUrl: promptResult.apiConfig.baseUrl,
      modelName: promptResult.apiConfig.modelName,
      temperature: promptResult.apiConfig.temperature,
      maxTokens: promptResult.apiConfig.maxTokens,
      systemPrompt: promptResult.systemPrompt,
      userPrompt: promptResult.userPrompt,
      pendingImageBase64,
      imageRecognitionPrompt: '请详细描述这张图片的内容，包括主要物体、颜色、光线、背景等。用简洁的中文回答，不要超过100字。',
      characterName: promptResult.characterName,
      userNickname: options.userNickname,
      displayName: options.displayName,
    };
    
    // 4. 创建任务
    const taskId = await createAITask(
      options.characterId,
      'private_chat_reply',
      payload
    );
    
    console.log(`[AITaskManager] 任务已创建: ${taskId}`);
    
    return taskId;
    
  } catch (error) {
    console.error('[AITaskManager] 创建任务失败:', error);
    throw error;
  }
}

// 未来可以在这里添加其他模块的任务创建函数
// 例如：createGroupChatReplyTask, createRolePlayTask 等
