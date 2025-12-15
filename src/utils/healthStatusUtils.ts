import { db, STORES } from './db';

interface CycleLog {
  id: string;
  startDate: string;
}

interface CycleSettings {
  cycleLength: number;
  periodLength: number;
}

interface SleepLog {
  id: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  quality: 'good' | 'average' | 'poor';
  createdAt: string;
}

interface DiagnosisLog {
  id: string;
  illnessName: string;
  status: 'treating' | 'recovered';
}

interface HealthSettings {
  shareEnabled: boolean;
  shareScope: 'all' | 'specific';
  shareCharacterId: string;
}

export type CycleStatusType = 'none' | 'period' | 'late' | 'prediction';

export interface CycleStatus {
  type: CycleStatusType;
  message: string;
  days: number;
}

/**
 * 核心生理周期计算逻辑 (与 UI 共用)
 */
export function calculateCycleStatus(logs: CycleLog[], settings: CycleSettings): CycleStatus {
  if (!logs || logs.length === 0) {
    return { type: 'none', message: '暂无记录', days: 0 };
  }

  // 确保日志按日期降序排列
  const sortedLogs = [...logs].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  
  const lastLog = sortedLogs[0];
  
  // 使用本地时间处理日期
  const parseLocalDay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const lastStart = parseLocalDay(lastLog.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time part for accurate date diff

  const diffTime = today.getTime() - lastStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 1. 处于经期中
  if (diffDays >= 0 && diffDays < settings.periodLength) {
    return { 
      type: 'period', 
      message: `经期第 ${diffDays + 1} 天`,
      days: settings.periodLength - diffDays // 剩余天数
    };
  }

  // 计算下次经期开始日期
  const nextStart = new Date(lastStart);
  nextStart.setDate(lastStart.getDate() + settings.cycleLength);
  
  const diffNextTime = nextStart.getTime() - today.getTime();
  const diffNext = Math.ceil(diffNextTime / (1000 * 60 * 60 * 24));
  
  // 2. 已推迟
  if (diffNext < 0) {
    return {
      type: 'late',
      message: `预计已推迟 ${Math.abs(diffNext)} 天`,
      days: Math.abs(diffNext)
    };
  }

  // 3. 预测期
  return {
    type: 'prediction',
    message: `距离下次经期还有 ${diffNext} 天`,
    days: diffNext
  };
}

export async function getHealthStatus(characterId: string): Promise<string> {
  try {
    // 1. 检查共享设置
    const settings = await db.get<HealthSettings>(STORES.HEALTH, 'health_settings');
    if (!settings || !settings.shareEnabled) {
      return '';
    }

    if (settings.shareScope === 'specific' && settings.shareCharacterId !== characterId) {
      return '';
    }

    const parts: string[] = [];

    // 2. 获取睡眠数据
    const sleepLogs = await db.get<SleepLog[]>(STORES.HEALTH, 'sleep_logs') || [];
    if (sleepLogs.length > 0) {
      const today = new Date();
      const todayStr = today.toDateString(); // "Fri Oct 27 2023"
      
      // 找到结束时间是今天的记录（代表昨晚睡到现在）
      const todayLog = sleepLogs.find(log => {
        const logDate = new Date(log.endTime);
        return logDate.toDateString() === todayStr;
      });
      
      if (todayLog) {
        const qualityMap: Record<string, string> = {
          'good': '好',
          'average': '一般',
          'poor': '差'
        };
        
        // 格式化时间 HH:mm
        const formatTime = (isoStr: string) => {
          const d = new Date(isoStr);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const bedtime = formatTime(todayLog.startTime);
        const wakeup = formatTime(todayLog.endTime);
        
        parts.push(`昨晚睡眠时间${bedtime}-${wakeup}质量:${qualityMap[todayLog.quality] || '未知'}`);
      }
    }

    // 3. 获取生理周期数据 (使用共享逻辑)
    const cycleLogs = await db.get<CycleLog[]>(STORES.HEALTH, 'cycle_logs') || [];
    const cycleSettings = await db.get<CycleSettings>(STORES.HEALTH, 'cycle_settings') || { cycleLength: 28, periodLength: 5 };

    if (cycleLogs.length > 0) {
      const status = calculateCycleStatus(cycleLogs, cycleSettings);
      
      if (status.type === 'period') {
         // UI消息格式是 "经期第 N 天"，直接复用
         parts.push(status.message.replace(/\s/g, ''));
      } else if (status.type === 'late') {
         parts.push(status.message.replace(/\s/g, ''));
      } else if (status.type === 'prediction') {
         parts.push(`距下次经期${status.days}天`);
      }
    }

    // 4. 获取诊断记录 (只获取治疗中)
    const diagnosisLogs = await db.get<DiagnosisLog[]>(STORES.HEALTH, 'diagnosis_logs') || [];
    const treatingLogs = diagnosisLogs.filter(log => log.status === 'treating');
    
    if (treatingLogs.length > 0) {
      const illnessNames = treatingLogs.map(log => log.illnessName).join('、');
      parts.push(`生病中:${illnessNames}`);
    }

    return parts.join(' ');
  } catch (error) {
    console.error('Failed to get health status:', error);
    return '';
  }
}
