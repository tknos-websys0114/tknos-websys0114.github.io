import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Moon, ThumbsUp, Minus, ThumbsDown, Trash2, Clock, Check, X } from "lucide-react";
import { db, STORES } from "../../utils/db";

interface SleepLog {
  id: string;
  startTime: string;
  endTime: string;
  quality: 'good' | 'average' | 'poor';
  createdAt: string;
}

interface SleepTrackerProps {
  onBack: () => void;
}

export default function SleepTracker({ onBack }: SleepTrackerProps) {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  
  // Form State
  const [sleepTimeStr, setSleepTimeStr] = useState('');
  const [wakeTimeStr, setWakeTimeStr] = useState('');
  const [quality, setQuality] = useState<'good' | 'average' | 'poor'>('good');

  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert(null), 2000);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await db.get<SleepLog[]>(STORES.HEALTH, 'sleep_logs');
      if (data && data.length > 0) {
        // Find if there's a log for today (based on endTime)
        const today = new Date();
        const todayStr = today.toDateString();
        
        const todayLog = data.find(log => {
          const logDate = new Date(log.endTime);
          return logDate.toDateString() === todayStr;
        });

        if (todayLog) {
          // If we found a log for today, set it to state and form
          setLogs([todayLog]);
          
          // Pre-fill form
          const start = new Date(todayLog.startTime);
          const end = new Date(todayLog.endTime);
          
          const startH = start.getHours().toString().padStart(2, '0');
          const startM = start.getMinutes().toString().padStart(2, '0');
          setSleepTimeStr(`${startH}:${startM}`);
          
          const endH = end.getHours().toString().padStart(2, '0');
          const endM = end.getMinutes().toString().padStart(2, '0');
          setWakeTimeStr(`${endH}:${endM}`);
          
          setQuality(todayLog.quality);

          // If there were other logs, clean them up (since we only keep today's)
          if (data.length > 1 || !data.includes(todayLog)) {
             await db.set(STORES.HEALTH, 'sleep_logs', [todayLog]);
          }
        } else {
          // No log for today, clear everything (auto-delete previous days)
          setLogs([]);
          await db.set(STORES.HEALTH, 'sleep_logs', []);
        }
      }
    } catch (error) {
      console.error("Failed to load sleep logs", error);
    }
  };

  const handleTimeInput = (value: string, setter: (v: string) => void) => {
    // Only allow numbers
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 4) {
      if (numbers.length >= 3) {
        const hours = numbers.slice(0, 2);
        const minutes = numbers.slice(2);
        
        // Simple validation
        if (parseInt(hours) > 23) return; 
        if (parseInt(minutes) > 59) return;
        
        setter(`${hours}:${minutes}`);
      } else {
        setter(numbers);
      }
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (sleepTimeStr.length !== 5 || wakeTimeStr.length !== 5) {
      showAlert('error', '请输入完整的时间 (例如 23:00)');
      return;
    }

    const today = new Date();
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Parse Wake Time (Assume Today)
    const [wakeH, wakeM] = wakeTimeStr.split(':').map(Number);
    const wakeDate = new Date(today);
    wakeDate.setHours(wakeH, wakeM, 0, 0);

    // Parse Sleep Time
    const [sleepH, sleepM] = sleepTimeStr.split(':').map(Number);
    const sleepDate = new Date(today);
    sleepDate.setHours(sleepH, sleepM, 0, 0);

    // Heuristic: If sleep time is later than wake time (e.g. 23:00 vs 07:00), 
    // it implies sleep started yesterday.
    // If sleep time is earlier (e.g. 01:00 vs 07:00), it implies sleep started today.
    // But we also need to handle cases where wake time is strictly earlier in the day than sleep time if someone slept during the day?
    // User requirement: "Default today can only record how today slept".
    // Usually "how today slept" means the sleep that finished today.
    
    if (sleepDate > wakeDate) {
      sleepDate.setDate(sleepDate.getDate() - 1);
    }

    // Check for duplicate (overlapping) logs? 
    // For simplicity, just allow saving.

    const newLog: SleepLog = {
      id: Date.now().toString(),
      startTime: sleepDate.toISOString(),
      endTime: wakeDate.toISOString(),
      quality,
      createdAt: new Date().toISOString()
    };

    try {
      // Overwrite with ONLY this new log
      const updatedLogs = [newLog];
      await db.set(STORES.HEALTH, 'sleep_logs', updatedLogs);
      setLogs(updatedLogs);
      
      showAlert('success', '睡眠记录已保存');
    } catch (error) {
      showAlert('error', '保存失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这条记录吗？")) return;
    
    try {
      await db.set(STORES.HEALTH, 'sleep_logs', []);
      setLogs([]);
      // Reset form
      setSleepTimeStr('');
      setWakeTimeStr('');
      setQuality('good');
      
      showAlert('success', '记录已删除');
    } catch (error) {
      showAlert('error', '删除失败');
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小时${minutes}分`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center text-[#6B7C93] transition-transform active:scale-90 active:bg-white/60"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-[#9FA8DA] tracking-[0.2em] uppercase mb-0.5">Sleep Log</span>
          <h1 className="text-lg font-black text-[#5C6B7F] tracking-wide">睡眠日志</h1>
        </div>
        
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Record Section */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 p-6 rounded-[2rem] shadow-sm">
           <h3 className="text-xs font-bold text-[#9FA8DA] uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 记录昨晚睡眠
           </h3>
           
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">入睡 (HH:MM)</label>
                    <input
                       type="tel"
                       placeholder="2300"
                       value={sleepTimeStr}
                       onChange={(e) => handleTimeInput(e.target.value, setSleepTimeStr)}
                       maxLength={5}
                       className="w-full bg-white/50 border border-white/60 text-center py-4 rounded-2xl text-lg font-mono font-bold text-[#5C6B7F] placeholder:text-[#D1D5DB] focus:border-[#AEC6CF] focus:outline-none focus:ring-2 focus:ring-[#AEC6CF]/20"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">醒来 (HH:MM)</label>
                    <input
                       type="tel"
                       placeholder="0730"
                       value={wakeTimeStr}
                       onChange={(e) => handleTimeInput(e.target.value, setWakeTimeStr)}
                       maxLength={5}
                       className="w-full bg-white/50 border border-white/60 text-center py-4 rounded-2xl text-lg font-mono font-bold text-[#5C6B7F] placeholder:text-[#D1D5DB] focus:border-[#AEC6CF] focus:outline-none focus:ring-2 focus:ring-[#AEC6CF]/20"
                    />
                 </div>
              </div>
              
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-[#7D8CA3] uppercase tracking-wider pl-1">睡眠质量</label>
                 <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setQuality('good')}
                      className={`py-3 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                         quality === 'good' 
                         ? 'bg-[#E0F2F1] text-[#4DB6AC] shadow-inner ring-1 ring-[#4DB6AC]/20' 
                         : 'bg-white/40 text-[#B0BEC5] hover:bg-white/60'
                      }`}
                    >
                       <ThumbsUp className="w-5 h-5" />
                       <span className="text-[10px] font-bold">安眠</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality('average')}
                      className={`py-3 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                         quality === 'average' 
                         ? 'bg-[#FFF3E0] text-[#FFB74D] shadow-inner ring-1 ring-[#FFB74D]/20' 
                         : 'bg-white/40 text-[#B0BEC5] hover:bg-white/60'
                      }`}
                    >
                       <Minus className="w-5 h-5" />
                       <span className="text-[10px] font-bold">一般</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality('poor')}
                      className={`py-3 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                         quality === 'poor' 
                         ? 'bg-[#FFEBEE] text-[#E57373] shadow-inner ring-1 ring-[#E57373]/20' 
                         : 'bg-white/40 text-[#B0BEC5] hover:bg-white/60'
                      }`}
                    >
                       <ThumbsDown className="w-5 h-5" />
                       <span className="text-[10px] font-bold">浅眠</span>
                    </button>
                 </div>
              </div>
              
              <button 
                onClick={handleSave}
                className="w-full bg-[#AEC6CF] text-white py-4 font-bold text-sm tracking-widest uppercase rounded-2xl shadow-md shadow-[#AEC6CF]/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                 <Check className="w-5 h-5" />
                 {logs.length > 0 ? "更新记录" : "保存记录"}
              </button>

              {logs.length > 0 && (
                  <button 
                    onClick={handleDelete}
                    className="w-full bg-[#FFEBEE] text-[#E57373] py-4 font-bold text-sm tracking-widest uppercase rounded-2xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                     <Trash2 className="w-5 h-5" />
                     清除今日记录
                  </button>
              )}
           </div>
        </div>
      </div>
      {/* Alert Modal */}
      {alert && alert.show && (
        <div className="fixed top-[90px] inset-x-0 z-[100] flex justify-center pointer-events-none">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: -10 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.9, opacity: 0, y: -10 }}
             className="mx-auto w-fit flex items-center gap-2 px-4 py-3 pointer-events-auto"
             style={{
                background: 'rgba(253, 251, 247, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                borderRadius: '20px',
                color: '#5C6B7F',
                boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
                fontSize: '13px',
                fontWeight: 'bold'
             }}
           >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                  alert.type === 'success' ? 'bg-[#AEC6CF]' : 'bg-[#E57373]'
              }`}>
                  {alert.type === 'success' ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={3} />}
              </div>
              <span>{alert.message}</span>
           </motion.div>
        </div>
      )}
    </div>
  );
}
