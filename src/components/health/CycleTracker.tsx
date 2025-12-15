import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flower2, Settings, Calendar as CalendarIcon, Trash2, X, Save, Bell, User } from "lucide-react";
import { db, STORES } from "../../utils/db";
import { toast } from "sonner@2.0.3";
import { calculateCycleStatus } from "../../utils/healthStatusUtils";

interface CycleLog {
  id: string;
  startDate: string; // YYYY-MM-DD
}

interface CycleSettings {
  cycleLength: number;
  periodLength: number;
}


interface CycleTrackerProps {
  onBack: () => void;
}

const DEFAULT_SETTINGS: CycleSettings = {
  cycleLength: 28,
  periodLength: 5
};

export default function CycleTracker({ onBack }: CycleTrackerProps) {
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_SETTINGS);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Log Form
  const [logDate, setLogDate] = useState('');

  // Settings Form
  const [tempSettings, setTempSettings] = useState<CycleSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedLogs = await db.get<CycleLog[]>(STORES.HEALTH, 'cycle_logs');
      const savedSettings = await db.get<CycleSettings>(STORES.HEALTH, 'cycle_settings');
      
      if (savedLogs) {
        setLogs(savedLogs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      }
      if (savedSettings) {
        // Merge with default to ensure new fields exist
        const mergedSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
        setSettings(mergedSettings);
        setTempSettings(mergedSettings);
      }
    } catch (error) {
      console.error("Failed to load cycle data", error);
    }
  };

  const handleOpenLog = () => {
    setLogDate(new Date().toISOString().split('T')[0]);
    setShowLogModal(true);
  };

  const handleSaveLog = async () => {
    if (!logDate) return;
    
    // Check if date already exists
    if (logs.some(l => l.startDate === logDate)) {
      toast.error("该日期已记录", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
      return;
    }

    const newLog: CycleLog = {
      id: Date.now().toString(),
      startDate: logDate
    };

    const updatedLogs = [newLog, ...logs].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    try {
      await db.set(STORES.HEALTH, 'cycle_logs', updatedLogs);
      setLogs(updatedLogs);
      setShowLogModal(false);
      toast.success("记录已保存", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
    } catch (error) {
      toast.error("保存失败", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    
    try {
      const updatedLogs = logs.filter(l => l.id !== id);
      await db.set(STORES.HEALTH, 'cycle_logs', updatedLogs);
      setLogs(updatedLogs);
      toast.success("记录已删除", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
    } catch (error) {
      toast.error("删除失败", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await db.set(STORES.HEALTH, 'cycle_settings', tempSettings);
      setSettings(tempSettings);
      setShowSettingsModal(false);
      toast.success("设置已更新", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
    } catch (error) {
      toast.error("更新失败", {
        style: {
           background: 'rgba(253, 251, 247, 0.85)',
           backdropFilter: 'blur(12px)',
           border: '1px solid rgba(255, 255, 255, 0.6)',
           borderRadius: '20px',
           color: '#5C6B7F',
           boxShadow: '0 10px 40px -10px rgba(92, 107, 127, 0.15)',
           fontSize: '13px',
           fontWeight: 'bold'
        }
      });
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newDate);
  };

  // Calculate Status for a specific date in calendar
  const getDateStatus = (day: number) => {
    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const targetTime = targetDate.getTime();

    // 1. Check if it's a recorded period
    for (const log of logs) {
      const start = new Date(log.startDate);
      // Reset time to noon to avoid timezone issues when comparing just dates
      start.setHours(12, 0, 0, 0); 
      targetDate.setHours(12, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays < settings.periodLength) {
        return { type: 'recorded', dayIndex: diffDays };
      }
    }

    // 2. Check if it's a predicted period (only if we have logs)
    if (logs.length > 0) {
      const lastLog = logs[0]; // logs are sorted desc
      const lastStart = new Date(lastLog.startDate);
      lastStart.setHours(12, 0, 0, 0);
      targetDate.setHours(12, 0, 0, 0);
      
      // Calculate how many cycles have passed since last log
      // We want to find a 'n' such that lastStart + n * cycleLength is close to targetDate
      
      const diffTime = targetDate.getTime() - lastStart.getTime();
      const diffDaysRaw = diffTime / (1000 * 60 * 60 * 24);
      
      // If target is in the past relative to last log, we don't predict
      if (diffDaysRaw < 0) return null;

      const cycles = Math.floor(diffDaysRaw / settings.cycleLength);
      
      // Check for the NEXT few cycles (to cover current month view)
      // We check if the target date falls into the period range of cycle 'cycles' or 'cycles + 1'
      
      const checkPrediction = (n: number) => {
         if (n <= 0) return false; // Don't predict for the cycle that actually happened (that's recorded)
         const predictedStart = new Date(lastStart);
         predictedStart.setDate(lastStart.getDate() + n * settings.cycleLength);
         
         const pDiff = targetDate.getTime() - predictedStart.getTime();
         const pDays = Math.round(pDiff / (1000 * 60 * 60 * 24));
         
         return pDays >= 0 && pDays < settings.periodLength;
      };

      if (checkPrediction(cycles) || checkPrediction(cycles + 1)) {
        return { type: 'predicted' };
      }
    }

    return null;
  };

  // Main Status Logic (existing)
  const getStatus = () => {
    return calculateCycleStatus(logs, settings);
  };

  const status = getStatus();

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
          <span className="text-[11px] font-bold text-[#9FA8DA] tracking-[0.2em] uppercase mb-0.5">Cycle Log</span>
          <h1 className="text-lg font-black text-[#5C6B7F] tracking-wide">生理周期</h1>
        </div>
        
        <button
          onClick={() => setShowSettingsModal(true)}
          className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center text-[#6B7C93] transition-transform active:scale-90 active:bg-white/60"
        >
          <Settings className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Calendar View */}
        <div className="bg-white/40 backdrop-blur-md border border-white/50 p-6 rounded-[2rem]">
           {/* Calendar Header */}
           <div className="flex items-center justify-between mb-6">
              <button onClick={() => changeMonth(-1)} className="p-2 text-[#7D8CA3] active:bg-white/40 rounded-xl transition-colors">
                 <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-black text-[#5C6B7F]">
                 {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
              </h2>
              <button onClick={() => changeMonth(1)} className="p-2 text-[#7D8CA3] active:bg-white/40 rounded-xl transition-colors">
                 <ChevronRight className="w-5 h-5" />
              </button>
           </div>
           
           {/* Weekday Headers */}
           <div className="grid grid-cols-7 mb-4">
              {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                 <div key={i} className="text-center text-xs font-bold text-[#9FA8DA]">
                    {day}
                 </div>
              ))}
           </div>
           
           {/* Days Grid */}
           <div className="grid grid-cols-7 gap-y-4">
              {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                 <div key={`empty-${i}`} />
              ))}
              
              {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                 const day = i + 1;
                 const dateStatus = getDateStatus(day);
                 const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();
                 
                 let bgClass = '';
                 let textClass = 'text-[#7D8CA3]';
                 
                 if (dateStatus?.type === 'recorded') {
                    bgClass = 'bg-[#FFB7B2] shadow-sm';
                    textClass = 'text-white font-bold';
                 } else if (dateStatus?.type === 'predicted') {
                    bgClass = 'bg-[#FFEBEE] border-2 border-dashed border-[#FFB7B2]';
                    textClass = 'text-[#E57373] font-bold';
                 } else if (isToday) {
                    bgClass = 'bg-white shadow-sm';
                    textClass = 'text-[#5C6B7F] font-bold';
                 }

                 return (
                    <div key={day} className="flex flex-col items-center justify-center relative">
                       <div className={`
                          w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                          ${bgClass} ${textClass}
                       `}>
                          {day}
                       </div>
                    </div>
                 );
              })}
           </div>

           {/* Legend */}
           <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#FFB7B2]" />
                 <span className="text-[10px] text-[#7D8CA3]">经期</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#FFEBEE] border border-dashed border-[#FFB7B2]" />
                 <span className="text-[10px] text-[#7D8CA3]">预测</span>
              </div>
           </div>
        </div>

        {/* Status Card */}
        <div className="relative bg-gradient-to-br from-[#FFD1DC] to-[#FFB7B2] p-8 rounded-[2.5rem] text-center overflow-hidden shadow-md">
           {/* Decorative - Static */}
           <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-white/20 rounded-full blur-[40px] pointer-events-none" />
           <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-[#E57373]/10 rounded-full blur-[30px] pointer-events-none mix-blend-overlay" />

           <div className="relative z-10">
              <div className="w-16 h-16 mx-auto bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-white/40">
                 <Flower2 className="w-8 h-8 text-white drop-shadow-sm" />
              </div>
              
              {status.type === 'none' ? (
                <div>
                   <h2 className="text-xl font-black text-white mb-1 tracking-wide drop-shadow-sm">暂无数据</h2>
                   <p className="text-xs text-white/80 font-medium">请记录上次经期开始日期</p>
                </div>
              ) : status.type === 'period' ? (
                <div>
                   <h2 className="text-xl font-black text-white mb-1 tracking-wide drop-shadow-sm">{status.message}</h2>
                   <p className="text-xs text-white/90 font-bold bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">预计还有 {status.days} 天结束</p>
                </div>
              ) : (
                <div>
                   <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">{status.message}</p>
                   <div className="flex items-baseline justify-center gap-2 text-white drop-shadow-sm">
                      <span className="text-5xl font-black leading-none">{status.days}</span>
                      <span className="text-lg font-bold opacity-80">天</span>
                   </div>
                </div>
              )}

              <button
                onClick={handleOpenLog}
                className="mt-6 bg-white text-[#FFB7B2] px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-sm"
              >
                 记录经期开始
              </button>
           </div>
        </div>

        {/* History List */}
        <div>
           <h3 className="text-xs font-bold text-[#9FA8DA] uppercase tracking-widest mb-4 flex items-center gap-2 pl-2">
              <CalendarIcon className="w-4 h-4" /> 历史记录
           </h3>
           
           <div className="space-y-3 pb-8">
              {logs.length === 0 ? (
                 <div className="p-8 text-center bg-white/40 border-2 border-dashed border-[#E0E0E0] rounded-[1.5rem] text-xs text-[#9E9E9E]">
                    暂无历史记录
                 </div>
              ) : (
                 logs.map(log => (
                    <div key={log.id} className="bg-white/40 backdrop-blur-sm border border-white/50 p-4 rounded-2xl flex items-center justify-between active:bg-white/60 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-2 h-10 bg-[#FFD1DC] rounded-full" />
                          <div>
                             <div className="text-base font-bold text-[#5C6B7F]">
                                {new Date(log.startDate).toLocaleDateString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit'})}
                             </div>
                             <div className="text-[10px] text-[#FFB7B2] font-black uppercase tracking-wider bg-[#FFEBEE] px-2 py-0.5 rounded-md inline-block mt-1">
                                经期开始
                             </div>
                          </div>
                       </div>
                       
                       <button
                         onClick={() => handleDeleteLog(log.id)}
                         className="w-10 h-10 rounded-xl flex items-center justify-center text-[#D6D3CC] active:bg-[#FFEBEE] active:text-[#E57373] transition-colors"
                       >
                          <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                 ))
              )}
           </div>
        </div>

      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-[#5C6B7F]/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <div className="bg-[#FDFBF7]/95 backdrop-blur-xl w-full max-w-[320px] rounded-[2rem] border border-white/50 shadow-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-white/40 border-b border-white/50 p-6 flex justify-between items-center">
                 <span className="text-lg font-black tracking-wide text-[#5C6B7F]">记录日期</span>
                 <button onClick={() => setShowLogModal(false)} className="bg-white/40 p-1 rounded-full text-[#7D8CA3] active:bg-white/60 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-8">
                 <label className="block text-xs font-bold text-[#9FA8DA] mb-4 uppercase tracking-wider text-center">
                    经期开始日期
                 </label>
                 <input 
                   type="date"
                   value={logDate}
                   onChange={(e) => setLogDate(e.target.value)}
                   className="w-full bg-white/50 border border-white/60 px-4 py-4 rounded-2xl text-center font-mono font-bold text-[#5C6B7F] focus:border-[#FFB7B2] focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 mb-8"
                 />
                 
                 <button 
                   onClick={handleSaveLog}
                   className="w-full bg-[#FFB7B2] text-white py-4 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all rounded-2xl shadow-sm"
                 >
                    确认记录
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-[#5C6B7F]/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <div className="bg-[#FDFBF7]/95 backdrop-blur-xl w-full max-w-[320px] rounded-[2rem] border border-white/50 shadow-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-white/40 border-b border-white/50 p-6 flex justify-between items-center">
                 <span className="text-lg font-black tracking-wide text-[#5C6B7F]">周期设置</span>
                 <button onClick={() => setShowSettingsModal(false)} className="bg-white/40 p-1 rounded-full text-[#7D8CA3] active:bg-white/60 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-8 space-y-8">
                 <div>
                    <label className="flex items-center justify-between text-xs font-bold text-[#7D8CA3] mb-3 uppercase tracking-wider">
                       <span>平均周期长度</span>
                       <span className="text-[#FFB7B2] bg-[#FFEBEE] px-2 py-1 rounded-md">{tempSettings.cycleLength}天</span>
                    </label>
                    <input 
                      type="range"
                      min="20"
                      max="45"
                      value={tempSettings.cycleLength}
                      onChange={(e) => setTempSettings({...tempSettings, cycleLength: parseInt(e.target.value)})}
                      className="w-full accent-[#FFB7B2] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 <div>
                    <label className="flex items-center justify-between text-xs font-bold text-[#7D8CA3] mb-3 uppercase tracking-wider">
                       <span>经期持续天数</span>
                       <span className="text-[#FFB7B2] bg-[#FFEBEE] px-2 py-1 rounded-md">{tempSettings.periodLength}天</span>
                    </label>
                    <input 
                      type="range"
                      min="2"
                      max="10"
                      value={tempSettings.periodLength}
                      onChange={(e) => setTempSettings({...tempSettings, periodLength: parseInt(e.target.value)})}
                      className="w-full accent-[#FFB7B2] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 <div className="pt-2">
                    <button 
                      onClick={handleSaveSettings}
                      className="w-full bg-[#5C6B7F] text-white py-4 text-xs font-bold uppercase tracking-widest active:bg-[#4A5568] transition-colors flex items-center justify-center gap-2 rounded-2xl shadow-sm"
                    >
                       <Save className="w-4 h-4" />
                       保存设置
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
