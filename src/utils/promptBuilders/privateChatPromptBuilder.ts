/**
 * 私聊 Prompt 构建器
 * 
 * 负责构建私聊模块的完整 AI prompt
 */

import { db, STORES } from '../db';
import solarlunar from 'solarlunar';

export interface PrivateChatPromptOptions {
  characterId: string;
  character: {
    id: string;
    name: string;
    description: string;
    manifestDate?: string;
  };
  userNickname: string;
  displayName: string;
  allMessages: Array<{
    id: string;
    text: string;
    senderId: 'user' | 'character' | 'system';
    senderName: string;
    timestamp: Date | number;
    stickerId?: string;
    imageKey?: string;
    isImageRecognition?: boolean;
    isPlaceholderImage?: boolean;
    quote?: {
      sender: string;
      content: string;
    };
    redPacket?: {
      amount: number;
      blessing: string;
      opened?: boolean;
    };
  }>;
}

export interface PrivateChatPromptResult {
  systemPrompt: string;
  userPrompt: string;
  apiConfig: {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    temperature: number;
    maxTokens?: number;
  };
  characterName: string;
}

/**
 * 构建私聊 AI prompt
 */
export async function buildPrivateChatPrompt(
  options: PrivateChatPromptOptions
): Promise<PrivateChatPromptResult> {
  const { characterId, character, userNickname, displayName, allMessages } = options;
  
  try {
    // 1. 获取 API 配置
    const apiConfig = await getAPIConfig();
    
    // 2. 获取聊天设置
    const chatSettings = await getChatSettings(characterId);
    
    // 3. 获取用户信息
    const userData = await getUserData();
    
    // 4. 获取角色信息（包含绑定的世界书）
    const characterData = await getCharacterData(characterId);
    
    // 5. 获取世界书（合并全局设置、聊天设置和角色绑定的世界书）
    const worldBooks = await getWorldBooks(chatSettings.enabledWorldBooks, characterData.worldBooks);
    
    // 6. 获取时间信息
    const timeInfo = await getTimeInfo(userData, character);
    
    // 7. 获取表情包信息（如果启用）
    const stickerInfo = await getStickerInfo(chatSettings.enableStickers, chatSettings.stickerProbability);
    
    // 8. 构建聊天历史并检查是否有未领取的用户红包
    const { chatHistory, hasUnclaimedUserRedPacket } = await buildChatHistory(
      allMessages,
      chatSettings.contextMessageCount,
      userNickname,
      character.name,
      stickerInfo.stickerMeanings,
      chatSettings.timeAwareness
    );
    
    // 9. 构建系统 prompt
    const systemPrompt = buildSystemPrompt({
      character,
      userData,
      userNickname,
      worldBooks,
      timeInfo,
      chatHistory,
      stickerInfo,
      chatSettings,
      hasUnclaimedUserRedPacket,
    });
    
    // 10. 构建用户 prompt
    const userPrompt = '请根据以上设定和聊天记录，生成角色的回复。';
    
    return {
      systemPrompt,
      userPrompt,
      apiConfig,
      characterName: character.name,
    };
    
  } catch (error) {
    console.error('[PrivateChatPromptBuilder] 构建 prompt 失败:', error);
    throw error;
  }
}

/**
 * 获取 API 配置
 */
async function getAPIConfig() {
  const apiConfigsStr = await db.get<string>(STORES.API_SETTINGS, 'api_configs');
  const currentConfigIndex = parseInt((await db.get<string>(STORES.API_SETTINGS, 'current_config_index')) || '0');
  
  if (!apiConfigsStr) {
    throw new Error('请先在设置中配置 API');
  }
  
  const apiConfigs = JSON.parse(apiConfigsStr);
  const apiConfig = apiConfigs[currentConfigIndex];
  
  if (!apiConfig || !apiConfig.apiKey || !apiConfig.baseUrl) {
    throw new Error('API 配置不完整，请检查设置');
  }
  
  return {
    apiKey: apiConfig.apiKey,
    baseUrl: apiConfig.baseUrl,
    modelName: apiConfig.modelName,
    temperature: apiConfig.temperature || 0.9,
    maxTokens: apiConfig.maxTokens,
  };
}

/**
 * 获取聊天设置
 */
async function getChatSettings(characterId: string) {
  const globalSettings = (await db.get<any>(STORES.CHATS, 'chat_settings')) || {};
  const detailSettings = (await db.get<any>(STORES.CHAT_SETTINGS, `chat_detail_settings_${characterId}`)) || {};
  
  return {
    contextMessageCount: globalSettings.contextMessageCount || 10,
    enabledWorldBooks: globalSettings.enabledWorldBooks || [],
    timeAwareness: globalSettings.timeAwareness !== undefined ? globalSettings.timeAwareness : true,
    enableStickers: detailSettings.enableStickers !== undefined ? detailSettings.enableStickers : true,
    stickerProbability: detailSettings.stickerProbability !== undefined ? detailSettings.stickerProbability : 30,
  };
}

/**
 * 获取用户信息
 */
async function getUserData() {
  const userData = (await db.get<any>(STORES.USER_DATA, 'userData')) || {};
  const userDescription = (await db.get<string>(STORES.USER_DATA, 'user_description')) || '';
  
  return {
    name: userData.name || '未设置',
    country: userData.country || '未设置',
    fortress: userData.fortress || '未设置',
    date: userData.date || '未设置',
    birthday: userData.birthday || '',
    attendant: userData.attendant || '',
    initialSword: userData.initialSword || '',
    description: userDescription,
  };
}

/**
 * 获取角色信息（包含绑定的世界书）
 */
async function getCharacterData(characterId: string) {
  const characters = (await db.get<any[]>(STORES.CHARACTERS, 'characters')) || [];
  const character = characters.find(char => char.id === characterId);
  
  return {
    worldBooks: character?.worldBooks || [],
  };
}

/**
 * 获取世界书（合并全局设置、聊天设置和角色绑定的世界书）
 */
async function getWorldBooks(enabledWorldBooks: string[], characterWorldBooks: string[]) {
  const allWorldBooks: any[] = (await db.get<any[]>(STORES.WORLD_BOOKS, 'world_books')) || [];
  
  // 合并所有启用的世界书 ID，使用 Set 去重
  const allEnabledIds = new Set([...enabledWorldBooks, ...characterWorldBooks]);
  
  // 过滤出全局世界书和已启用的局部世界书
  const globalWorldBooks = allWorldBooks.filter(wb => wb.scope === 'global');
  const enabledLocalWorldBooks = allWorldBooks.filter(wb => 
    wb.scope === 'local' && allEnabledIds.has(wb.id)
  );
  
  // 按位置分组
  const allBooks = [...globalWorldBooks, ...enabledLocalWorldBooks];
  const beforeWorldBooks = allBooks.filter(wb => wb.position === 'before');
  const afterWorldBooks = allBooks.filter(wb => wb.position === 'after');
  
  return {
    before: beforeWorldBooks,
    after: afterWorldBooks,
  };
}

/**
 * 获取时间信息
 */
async function getTimeInfo(userData: any, character: any) {
  const now = new Date();
  const hours = now.getHours();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 时段判断
  const timeOfDay = hours < 6 ? '深夜' : hours < 12 ? '早上' : hours < 18 ? '下午' : '晚上';
  
  // 季节和节气
  let season = '';
  let holiday = '';
  let term = '';
  
  try {
    const lunar = solarlunar.solar2lunar(now.getFullYear(), month, day);
    
    if (lunar.festival) {
      holiday = lunar.festival;
    }
    
    if (lunar.Term) {
      term = lunar.Term;
    }
    
    // 根据节气判断季节
    const getSeasonBySolarTerm = (t: string | null) => {
      if (!t) return null;
      const spring = ["立春", "雨水", "惊蛰", "春分", "清明", "谷雨"];
      const summer = ["立夏", "小满", "芒种", "夏至", "小暑", "大暑"];
      const autumn = ["立秋", "处暑", "白露", "秋分", "寒露", "霜降"];
      const winter = ["立冬", "小雪", "大雪", "冬至", "小寒", "大寒"];
      if (spring.includes(t)) return "春";
      if (summer.includes(t)) return "夏";
      if (autumn.includes(t)) return "秋";
      if (winter.includes(t)) return "冬";
      return null;
    };
    
    const solarTermSeason = getSeasonBySolarTerm(lunar.Term);
    season = solarTermSeason || (month >= 3 && month <= 5 ? '春' : month >= 6 && month <= 8 ? '夏' : month >= 9 && month <= 11 ? '秋' : '冬');
  } catch (error) {
    console.error('获取农历信息失败:', error);
    season = month >= 3 && month <= 5 ? '春' : month >= 6 && month <= 8 ? '夏' : month >= 9 && month <= 11 ? '秋' : '冬';
  }
  
  // 公历节日
  const monthDay = `${month}-${day}`;
  const solarHolidayMap: { [key: string]: string } = {
    '1-1': '元旦',
    '2-3': '节分',
    '2-4': '节分',
    '2-14': '情人节',
    '3-3': '女儿节',
    '3-8': '妇女节',
    '4-1': '愚人节',
    '5-1': '劳动节',
    '5-4': '青年节',
    '6-1': '儿童节',
    '8-13': '盂兰盆节',
    '8-14': '盂兰盆节',
    '8-15': '盂兰盆节',
    '10-1': '国庆节',
    '12-24': '平安夜',
    '12-25': '圣诞节',
    '12-31': '大晦日',
  };
  
  if (!holiday && solarHolidayMap[monthDay]) {
    holiday = solarHolidayMap[monthDay];
  }
  
  // 就任日周年纪念
  let anniversary = '';
  if (userData.date) {
    const parsed = parseDateString(userData.date);
    if (parsed && parsed.month === month && parsed.day === day) {
      const years = now.getFullYear() - parsed.year;
      if (years > 0) {
        anniversary = `就任${years}周年纪念日`;
      } else if (years === 0) {
        anniversary = '就任纪念日';
      }
    }
  }
  
  // 审神者生日
  let birthdayText = '';
  if (userData.birthday) {
    const parsed = parseDateString(userData.birthday);
    if (parsed && parsed.month === month && parsed.day === day) {
      birthdayText = '审神者的生日';
    }
  }
  
  // 显现日纪念
  let manifestAnniversary = '';
  if (character?.manifestDate) {
    const parsed = parseDateString(character.manifestDate);
    if (parsed && parsed.month === month && parsed.day === day) {
      const years = now.getFullYear() - parsed.year;
      if (years > 0) {
        manifestAnniversary = `与审神者的相遇${years}周年纪念日`;
      } else if (years === 0) {
        manifestAnniversary = '与审神者的初遇纪念日';
      } else {
        manifestAnniversary = '与审神者的相遇纪念日';
      }
    }
  }
  
  return {
    timeOfDay,
    season,
    holiday,
    term,
    anniversary,
    birthday: birthdayText,
    manifestAnniversary,
    currentTime: `${now.getFullYear()}年${month.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
  };
}

/**
 * 解析日期字符串
 */
function parseDateString(dateStr: string): { year: number; month: number; day: number } | null {
  try {
    // 尝试解析 YYYY-MM-DD 格式
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        return {
          year: parseInt(parts[0]),
          month: parseInt(parts[1]),
          day: parseInt(parts[2]),
        };
      } else if (parts.length >= 2) {
        return {
          year: new Date().getFullYear(),
          month: parseInt(parts[0]),
          day: parseInt(parts[1]),
        };
      }
    }
    
    // 尝试解析 YYYY年MM月DD日 格式
    if (dateStr.includes('年')) {
      const yearMatch = dateStr.match(/(\d{4})年/);
      const monthMatch = dateStr.match(/(\d+)月/);
      const dayMatch = dateStr.match(/(\d+)日/);
      
      if (monthMatch && dayMatch) {
        return {
          year: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
          month: parseInt(monthMatch[1]),
          day: parseInt(dayMatch[1]),
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('解析日期失败:', error);
    return null;
  }
}

/**
 * 获取表情包信息
 */
async function getStickerInfo(enableStickers: boolean, stickerProbability: number) {
  if (!enableStickers) {
    return {
      enabled: false,
      stickers: [],
      stickerMeanings: {},
      stickerList: '',
      stickerGuidance: '',
    };
  }
  
  // 动态导入表情包管理器
  const { getAllStickers, getStickerMeaningsForAI } = await import('../stickerManager');
  const allStickers = await getAllStickers();
  const stickerMeanings = await getStickerMeaningsForAI();
  
  // 构建表情包列表字符串
  const stickerList = allStickers.length > 0 
    ? allStickers.map(s => `- ID: ${s.id} | 含义: ${s.meaning}`).join('\n')
    : '（暂无可用表情包）';
  
  // 根据发送概率生成不同的指导语
  let stickerGuidance = '';
  if (allStickers.length > 0) {
    if (stickerProbability <= 20) {
      stickerGuidance = `你可以在回复中使用以下表情包，但要非常克制。只有在对话氛围特别适合（如表达强烈情感、幽默时刻等）时才使用，大多数情况下不需要发送表情包。表情包应该自然地融入对话中，而不是总是放在最后。`;
    } else if (stickerProbability <= 40) {
      stickerGuidance = `你可以在回复中偶尔使用以下表情包来增强情感表达。不要在每次回复中都使用表情包，只在感觉合适的时候使用。表情包应该自然地融入对话中，而不是总是放在最后。`;
    } else if (stickerProbability <= 60) {
      stickerGuidance = `你可以在回复中适度使用以下表情包，就像真实的聊天那样，根据对话氛围灵活选择合适的时机发送表情包。表情包应该自然地融入对话中，而不是总是放在最后。`;
    } else if (stickerProbability <= 80) {
      stickerGuidance = `你可以在回复中较为频繁地使用以下表情包，就像一个喜欢使用表情包的人那样。根据对话氛围灵活选择合适的时机发送表情包。表情包应该自然地融入对话中，而不是总是放在最后。`;
    } else {
      stickerGuidance = `你可以在回复中积极使用以下表情包来丰富对话，表情包是你表达情感的重要方式。根据对话氛围灵活选择合适的时机发送表情包。表情包应该自然地融入对话中，而不是总是放在最后。`;
    }
  }
  
  return {
    enabled: true,
    stickers: allStickers,
    stickerMeanings,
    stickerList,
    stickerGuidance,
  };
}

/**
 * 构建聊天历史并检查是否有未领取的用户红包
 */
async function buildChatHistory(
  allMessages: any[],
  contextMessageCount: number,
  userNickname: string,
  characterName: string,
  stickerMeanings: any,
  timeAwareness: boolean
) {
  const recentMessages = allMessages.slice(-contextMessageCount);
  
  // 检查是否有未领取的用户红包
  let hasUnclaimedUserRedPacket = false;
  for (const msg of recentMessages) {
    if (msg.senderId === 'user' && msg.redPacket && !msg.redPacket.opened) {
      hasUnclaimedUserRedPacket = true;
      break;
    }
  }
  
  // 如果未开启时间感知，使用简单格式
  if (!timeAwareness) {
    const chatHistory = recentMessages.map(msg => {
      // 系统消息：跳过，不显示在聊天历史中
      if (msg.senderId === 'system') {
        return null;
      }
      // 图片识别消息：显示识别结果
      if (msg.isImageRecognition) {
        return `${msg.senderId === 'user' ? userNickname : characterName}: ${msg.text}`;
      }
      // 伪图片消息：显示场景描述
      if (msg.isPlaceholderImage) {
        return `${msg.senderId === 'user' ? userNickname : characterName}: [伪图片: ${msg.text}]`;
      }
      // 表情包消息
      if (msg.stickerId && stickerMeanings[msg.stickerId]) {
        return `${msg.senderId === 'user' ? userNickname : characterName}: [表情包: ${stickerMeanings[msg.stickerId]}]`;
      }
      // 图片消息：只显示占位符
      if (msg.imageKey) {
        return `${msg.senderId === 'user' ? userNickname : characterName}: [发送了一张图片]`;
      }
      // 红包消息：根据状态显示不同文本
      if (msg.redPacket) {
        const sender = msg.senderId === 'user' ? userNickname : characterName;
        if (msg.redPacket.opened) {
          return `${sender}: [红包-已领取]`;
        } else {
          return `${sender}: [红包]`;
        }
      }
      // 普通文本消息
      return `${msg.senderId === 'user' ? userNickname : characterName}: ${msg.text}`;
    }).filter(msg => msg !== null).join('\n');
    
    return {
      chatHistory,
      hasUnclaimedUserRedPacket,
    };
  }
  
  // 开启时间感知，使用优化的时间格式
  const result: string[] = [];
  let lastDate: string | null = null;
  
  recentMessages.forEach((msg, index) => {
    // 跳过系统消息
    if (msg.senderId === 'system') {
      return;
    }
    
    // 保 timestamp 是 Date 对象
    const msgDate = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
    
    // 提取日期字符串（YYYY-MM-DD）
    const currentDate = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}-${String(msgDate.getDate()).padStart(2, '0')}`;
    
    // 第一条消息必须有日期戳，或者日期变化时插入日期戳
    if (index === 0 || lastDate !== currentDate) {
      result.push(`【${currentDate}】`);
      lastDate = currentDate;
    }
    
    // 提取时间（HH:MM）
    const timeStr = `${String(msgDate.getHours()).padStart(2, '0')}:${String(msgDate.getMinutes()).padStart(2, '0')}`;
    
    // 格式化消息内容
    let content = '';
    const sender = msg.senderId === 'user' ? userNickname : characterName;
    
    // 图片识别消息：显示识别结果
    if (msg.isImageRecognition) {
      content = msg.text;
    }
    // 伪图片消息：显示场景描述
    else if (msg.isPlaceholderImage) {
      content = `[伪图片: ${msg.text}]`;
    }
    // 表情包消息
    else if (msg.stickerId && stickerMeanings[msg.stickerId]) {
      content = `[表情包: ${stickerMeanings[msg.stickerId]}]`;
    }
    // 图片消��：只显示占位符
    else if (msg.imageKey) {
      content = '[发送了一张图片]';
    }
    // 红包消息：根据状态显示不同文本
    else if (msg.redPacket) {
      if (msg.redPacket.opened) {
        content = '[红包-已领取]';
      } else {
        content = '[红包]';
      }
    }
    // 普通文本消息
    else {
      content = msg.text;
    }
    
    // 接完整消息：[HH:MM] 发送者: 内容
    result.push(`[${timeStr}] ${sender}: ${content}`);
  });
  
  return {
    chatHistory: result.join('\n'),
    hasUnclaimedUserRedPacket,
  };
}

/**
 * 构建系统 prompt
 */
function buildSystemPrompt(params: any) {
  const { character, userData, userNickname, worldBooks, timeInfo, chatHistory, stickerInfo, chatSettings, hasUnclaimedUserRedPacket } = params;
  
  // 构建世界书内容
  const beforeWorldBooksContent = worldBooks.before.map((wb: any, idx: number) => 
    `- **世界书${idx + 1}（${wb.name}）:** ${wb.content}`
  ).join('\n');
  
  const afterWorldBooksContent = worldBooks.after.map((wb: any, idx: number) => 
    `- **世界书${idx + 1}（${wb.name}）:** ${wb.content}`
  ).join('\n');
  
  // 构建时间信息
  let timeInfoText = '';
  if (chatSettings.timeAwareness) {
    timeInfoText = `- **当前时间:** ${timeInfo.currentTime} (${timeInfo.timeOfDay}, ${timeInfo.season})`;
    if (timeInfo.term) {
      timeInfoText += `\n- **节气:** ${timeInfo.term}`;
    }
    if (timeInfo.holiday) {
      timeInfoText += `\n- **节日:** ${timeInfo.holiday}`;
    }
    if (timeInfo.anniversary) {
      timeInfoText += `\n- **特殊日期:** ${timeInfo.anniversary}`;
    }
    if (timeInfo.birthday) {
      timeInfoText += `\n- **特殊日期:** ${timeInfo.birthday}`;
    }
    if (timeInfo.manifestAnniversary) {
      timeInfoText += `\n- **特殊日期:** ${timeInfo.manifestAnniversary}`;
    }
  }
  
  // 构建历史对话时间戳说明（仅在开启时间感知时添加）
  const chatHistoryTimeNote = chatSettings.timeAwareness 
    ? `** 系统提示：**
1. 下列"历史对话"均为过去发生的对话。每条历史消息前面有一个短时间戳 [HH:MM]，当日期变更时会有单独的日期分隔行 【YYYY-MM-DD】。
2. 在生成回复时，务必基于当前时间信息判断，例如：如果历史消息中的时间是前几天的"23:15"，不要认为现在也是23:15，也不要重复提醒用户睡觉，除非用户主动提到现在需要睡觉。
3. 如需要参照历史的时间顺序或计算间隔，可直接使用消息前的时间戳。

` 
    : '';
  
  // 构建表情包信息
  const stickerInfoText = stickerInfo.enabled && stickerInfo.stickers.length > 0
    ? `${stickerInfo.stickerGuidance}\n${stickerInfo.stickerList}\n- 要发送表情包，使用 "stickerId" 字段，值为表情包的ID\n- 表情包消息示例: { "sender": "${character.name}", "stickerId": "sticker_xxxxx" }\n- 注意：一条消息只能是文字或表情包，不能同时包含两者\n- 表情包要自然地融入对话，可以在对话的任何位置使用，不要总是放在最后`
    : '（表情包功能未启用或暂无可用表情包）';
  
  // 构建红包领取提示（仅在有未领取的用户红包时添加）
  const redPacketClaimGuidance = hasUnclaimedUserRedPacket 
    ? `\n\n**红包领取 (重要):**\n- 如果审神者发送了红包（消息内容为\"[红包]\"），你可以领取它\n- **注意：已领取的红包会显示为\"[红包-已领取]\"，请不要重复领取**\n- 领取红包时，必须发送一条特殊的系统消息，格式为: { \"sender\": \"system\", \"content\": \"领取红包\" }\n- 请务必严格遵守此格式，否则无法正确触发红包领取状态更新`
    : '';
  
  return `你现在要进行一个"私聊模拟"角色扮演

**世界观与设定:**
- **世界观:** 刀剑乱舞
- **设定:** 刀剑男士是真实存在的付丧神，我们生活在一个真实的本丸中

**世界书载入（前）:**
${beforeWorldBooksContent || '- 无'}

**角色扮演核心要求:**
- 你需要模拟 **与审神者一对一私聊** 的一位刀剑男士
- 称呼、语气、习惯、关系、口癖等都必须严格符合原作中该角色的性格
- 该刀剑男士在称呼审神者时，根据其原作人设使用"主"、"主人"、"主公"、"主殿"、"主君"等
- 聊天内容应轻松、自然，贴近日常生活，可以包含感想、吐槽、本丸内的小事等
- 可以使用 emoji 或颜文字，增强线上聊天的真实感
- **严禁** 提及"游戏"、"AI"、"角色扮演"、"模拟"、"玩家"等任何指向现实世界的词语，刀剑男士必须坚信这是他们的真实生活

**当前聊天情景:**
- **当前私聊对象:** ${character.name}
- **角色设定:** ${character.description || '暂无设定'}${character.manifestDate ? `\n- **显现日:** ${character.manifestDate}（与审神者的初遇纪念日）` : ''}
${timeInfoText ? `- ${timeInfoText}` : ''}
- **关于审神者 (用户):**
  - **昵称:** ${userNickname}
  - **审神者名:** ${userData.name}
  - **属国:** ${userData.country}
  - **本丸名:** ${userData.fortress}
  - **就任日:** ${userData.date}${userData.birthday ? `\n  - **生日:** ${userData.birthday}` : ''}${userData.attendant ? `\n  - **近侍:** ${userData.attendant}` : ''}${userData.initialSword ? `\n  - **初始刀:** ${userData.initialSword}` : ''}${userData.description ? `\n  - **详细介绍:** ${userData.description}` : ''}

**你的任务与输出格式 (请严格遵守):**
- **任务:**  
    1. 根据下面的聊天记录，续写一段自然的、生活化的私聊内容

**发言规则:**
- 你只扮演 **一位刀剑男士：${character.name}**  
- 一般情况下他可以在一次回复中发送1-4消息（除非用户发送消息时做了特殊的要求）
- 若想表达较长内容，请拆成多条短消息
- 你可以在合适时引用审神者之前的消息，使用quote字段来实现

**消息风格 (非常重要):**
- **简短口语**
- **每条消息的末尾禁止使用句号**
- 每条消息都要像真实聊天那样短，可以多条连发
- 不要永远被动回复审神者  
  你可以：  
  - 主动询问审神者情况  
  - 主动分享自己的见闻、感想或本丸里的状况  
  - 主动提出建议或话题  
  自然把握主动与被动的平衡
- **引用图片时：** 无论是真实图片还是伪图片，quote中的content统一使用\"[图片]\"格式

${chatHistoryTimeNote}
**最近的聊天记录:**
${chatHistory || '（暂无聊天记录）'}

**世界书载入（后）:**
${afterWorldBooksContent || '- 无'}

**可用的表情包 (可选):**
${stickerInfoText}

**发送伪图片 (可选):**
- 你可以发送\"伪图片\"来模拟拍照或发送图片的效果
- 伪图片不是真实图片，而是一个带有场景描述的占位符
- 使用 \"isPlaceholderImage\" 字段标记，并在 \"content\" 中提供不超过100字的场景描述
- 伪图片消息示例: { \"sender\": \"${character.name}\", \"content\": \"本丸庭院的樱花树下，阳光透过花瓣洒在石板路上\", \"isPlaceholderImage\": true }
- 描述应该简洁生动，像是图片的标题或说明，不要超过100字
- 使用场景：想要分享某个场景、表达某种氛围，或回应审神者的要求时
${redPacketClaimGuidance}

**发送红包 (可选):**
- 你可以给审神者发送红包，作为礼物或祝福
- 使用场景：节日庆祝、纪念日、感谢审神者、日常心意等
- 红包消息格式: { \"sender\": \"${character.name}\", \"redPacket\": { \"amount\": 数额, \"blessing\": \"祝福语\" } }
- amount: 小判金数额，建议范围 500-10000
- blessing: 红包祝福语，简短温馨
- 注意：红包是独立消息，不能与文字内容同时发送

**输出格式 (必须为纯 JSON):**
{
    \"messages\": [
        { \"sender\": \"${character.name}\", \"content\": \"消息内容\" },
        {
            \"sender\": \"${character.name}\",
            \"content\": \"这是对审神者某条消息的回复\",
            \"quote\": {
                \"sender\": \"${userNickname}\",
                \"content\": \"审神者之前的发言内容\"
            }
        },
        {
            \"sender\": \"${character.name}\",
            \"content\": \"这是对审神者伪图片/真实图片的回复\",
            \"quote\": {
                \"sender\": \"${userNickname}\",
                \"content\": \"[图片]\"
            }
        },
        { \"sender\": \"${character.name}\", \"stickerId\": \"sticker_xxxxx\" },
        { \"sender\": \"${character.name}\", \"content\": \"场景描述文字（不超过100字）\", \"isPlaceholderImage\": true },
        { \"sender\": \"${character.name}\", \"redPacket\": { \"amount\": 200, \"blessing\": \"心意\" } }
    ]
}`;
}