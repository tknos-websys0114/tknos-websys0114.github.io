import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Moon, Flower2, Activity, Share2, X, Check, Users, User, ChevronRight, Stethoscope } from "lucide-react";
import { db, STORES } from "../../utils/db";

interface HealthDashboardProps {
  onClose: () => void;
  onNavigate: (view: HealthView) => void;
}

interface HealthSettings {
  shareEnabled: boolean;
  shareScope: 'all' | 'specific';
  shareCharacterId: string;
}

interface Character {
  id: string;
  name: string;
  avatar?: string;
}

const DEFAULT_SETTINGS: HealthSettings = {
  shareEnabled: false,
  shareScope: 'all',
  shareCharacterId: ''
};

export default function HealthDashboard({ onClose, onNavigate }: HealthDashboardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [settings, setSettings] = useState<HealthSettings>(DEFAULT_SETTINGS);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isCharSelectOpen, setIsCharSelectOpen] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCharacters();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await db.get<HealthSettings>(STORES.HEALTH, 'health_settings');
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (e) {
      console.error("Failed to load health settings", e);
    }
  };

  const loadCharacters = async () => {
    try {
      const data = await db.get<Character[]>(STORES.CHARACTERS, 'characters');
      if (data) setCharacters(data);
    } catch (e) {
      console.error("Failed to load characters", e);
    }
  };

  const handleSave = async () => {
    try {
      await db.set(STORES.HEALTH, 'health_settings', settings);
      setShowSettings(false);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 2000);
    } catch (e) {
      setShowErrorAlert(true);
      setTimeout(() => setShowErrorAlert(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center text-[#6B7C93] transition-transform active:scale-90 active:bg-white/60"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-[#9FA8DA] tracking-[0.2em] uppercase mb-0.5">Health Care</span>
          <h1 className="text-lg font-black text-[#5C6B7F] tracking-wide">本丸医务室</h1>
        </div>
        
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center text-[#6B7C93] transition-transform active:scale-90 active:bg-white/60"
        >
          <Share2 className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        <div className="text-center mb-8 relative">
           <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/30 backdrop-blur-sm border border-white/40 mb-4">
              <Activity className="w-8 h-8 text-[#88B04B]" />
           </div>
           <p className="text-sm text-[#7D8CA3] font-medium leading-relaxed max-w-[280px] mx-auto">
              审神者大人的健康是本丸的宝物。<br/>请保持身心愉悦。
           </p>
        </div>

        {/* Menu Grid */}
        <div className="grid gap-5">
          
          {/* Sleep Tracker Card */}
          <button
            onClick={() => onNavigate('sleep')}
            className="group relative bg-white/40 backdrop-blur-md border border-white/50 p-6 rounded-[2rem] text-left transition-transform active:scale-[0.96] overflow-hidden"
          >
             {/* Decorative Background Blob - Static */}
             <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#E6E6FA] rounded-full filter blur-[40px] opacity-60" />
             
             <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="w-12 h-12 bg-[#E6E6FA] text-[#6A5ACD] flex items-center justify-center rounded-2xl mb-4">
                     <Moon className="w-6 h-6 fill-current" />
                  </div>
                  <h3 className="text-xl font-black text-[#5C6B7F] mb-1">睡眠记录</h3>
                  <p className="text-xs text-[#8E9CB3] font-medium">
                     记录每日睡眠时间与质量，<br/>分析休息状况。
                  </p>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center text-[#B39EB5]">
                   <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
             </div>
          </button>

          {/* Cycle Tracker Card */}
          <button
            onClick={() => onNavigate('cycle')}
            className="group relative bg-white/40 backdrop-blur-md border border-white/50 p-6 rounded-[2rem] text-left transition-transform active:scale-[0.96] overflow-hidden"
          >
             {/* Decorative Background Blob - Static */}
             <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#FFD1DC] rounded-full filter blur-[40px] opacity-60" />

             <div className="relative z-10 flex items-start justify-between">
                <div>
                   <div className="w-12 h-12 bg-[#FFD1DC] text-[#E57373] flex items-center justify-center rounded-2xl mb-4">
                      <Flower2 className="w-6 h-6" />
                   </div>
                   <h3 className="text-xl font-black text-[#5C6B7F] mb-1">生理周期</h3>
                   <p className="text-xs text-[#8E9CB3] font-medium">
                      记录并预测生理周期，<br/>提前做好准备。
                   </p>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center text-[#FFB7B2]">
                   <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
             </div>
          </button>

          {/* Diagnosis Tracker Card */}
          <button
            onClick={() => onNavigate('diagnosis')}
            className="group relative bg-white/40 backdrop-blur-md border border-white/50 p-6 rounded-[2rem] text-left transition-transform active:scale-[0.96] overflow-hidden"
          >
             {/* Decorative Background Blob - Static */}
             <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#C1E1C1] rounded-full filter blur-[40px] opacity-60" />

             <div className="relative z-10 flex items-start justify-between">
                <div>
                   <div className="w-12 h-12 bg-[#C1E1C1] text-[#6B8E23] flex items-center justify-center rounded-2xl mb-4">
                      <Stethoscope className="w-6 h-6" />
                   </div>
                   <h3 className="text-xl font-black text-[#5C6B7F] mb-1">诊断记录</h3>
                   <p className="text-xs text-[#8E9CB3] font-medium">
                      记录正在经历的病症，<br/>跟踪康复进度。
                   </p>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center text-[#8FBC8F]">
                   <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
             </div>
          </button>

        </div>

      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-[#5C6B7F]/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <div className="bg-[#FDFBF7]/95 backdrop-blur-xl w-full max-w-[320px] rounded-[2rem] border border-white/50 shadow-md animate-in zoom-in-95 duration-200">
              <div className="bg-white/40 border-b border-white/50 p-6 flex justify-between items-center rounded-t-[2rem]">
                 <span className="text-lg font-black tracking-wide text-[#5C6B7F]">数据共享设置</span>
                 <button onClick={() => setShowSettings(false)} className="bg-white/40 p-1 rounded-full text-[#7D8CA3] active:bg-white/60 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Main Switch */}
                 <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-[#5C6B7F]">共享健康数据</h3>
                        <p className="text-[10px] text-[#9FA8DA] mt-1">允许刀剑男士了解您的身体状况</p>
                    </div>
                    <button 
                        onClick={() => setSettings({...settings, shareEnabled: !settings.shareEnabled})}
                        className={`w-12 h-7 rounded-full transition-colors relative ${settings.shareEnabled ? 'bg-[#AEC6CF]' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.shareEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                 </div>

                 {settings.shareEnabled && (
                     <div className="space-y-4 pt-4 border-t border-[#7D8CA3]/10 animate-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-[#7D8CA3] uppercase tracking-wider block mb-2">共享范围</label>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSettings({...settings, shareScope: 'all'})}
                                className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                                    settings.shareScope === 'all' 
                                    ? 'bg-[#AEC6CF]/10 border-[#AEC6CF] text-[#5C6B7F]' 
                                    : 'bg-white/40 border-transparent text-[#9FA8DA]'
                                }`}
                            >
                                <Users className="w-5 h-5" />
                                <span className="text-xs font-bold">本丸全员</span>
                            </button>
                            <button
                                onClick={() => setSettings({...settings, shareScope: 'specific'})}
                                className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                                    settings.shareScope === 'specific' 
                                    ? 'bg-[#AEC6CF]/10 border-[#AEC6CF] text-[#5C6B7F]' 
                                    : 'bg-white/40 border-transparent text-[#9FA8DA]'
                                }`}
                            >
                                <User className="w-5 h-5" />
                                <span className="text-xs font-bold">指定近侍</span>
                            </button>
                        </div>

                        {settings.shareScope === 'specific' && (
                            <div className="relative mt-2">
                                <button
                                    onClick={() => setIsCharSelectOpen(!isCharSelectOpen)}
                                    className="w-full bg-white/50 border border-white/60 px-4 py-3 rounded-2xl text-xs font-bold text-[#5C6B7F] flex items-center justify-between active:bg-white/70 transition-colors"
                                >
                                    <div className="flex items-center gap-2 pl-1">
                                        <span>{characters.find(c => c.id === settings.shareCharacterId)?.name || "选择"}</span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform ${isCharSelectOpen ? 'rotate-90' : ''}`} />
                                </button>

                                {isCharSelectOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsCharSelectOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg z-20 max-h-48 overflow-y-auto p-1 animate-in fade-in zoom-in-95">
                                            {characters.length === 0 && (
                                                <div className="p-3 text-center text-[10px] text-[#9FA8DA]">暂无刀剑男士</div>
                                            )}
                                            {characters.map(char => (
                                                <button
                                                    key={char.id}
                                                    onClick={() => {
                                                        setSettings({...settings, shareCharacterId: char.id});
                                                        setIsCharSelectOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-1 ${
                                                        settings.shareCharacterId === char.id ? 'bg-[#AEC6CF]/20 text-[#5C6B7F]' : 'hover:bg-black/5 text-[#7D8CA3]'
                                                    }`}
                                                >
                                                    {char.name}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                     </div>
                 )}

                 <button 
                   onClick={handleSave}
                   className="w-full bg-[#AEC6CF] text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-md shadow-[#AEC6CF]/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-4"
                 >
                    <Check className="w-4 h-4" />
                    保存设置
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessAlert && (
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
              <div className="w-5 h-5 rounded-full bg-[#AEC6CF] flex items-center justify-center text-white">
                  <Check className="w-3 h-3" strokeWidth={3} />
              </div>
              <span>共享设置已保存</span>
           </motion.div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorAlert && (
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
              <div className="w-5 h-5 rounded-full bg-[#E57373] flex items-center justify-center text-white">
                  <X className="w-3 h-3" strokeWidth={3} />
              </div>
              <span>保存失败</span>
           </motion.div>
        </div>
      )}
    </div>
  );
}
