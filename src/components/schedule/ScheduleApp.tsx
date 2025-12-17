import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Calendar as CalendarIcon, Table, ArrowLeft, Share2, X, Check, Users, User, ChevronRight } from 'lucide-react';
import TodoList from './TodoList';
import CalendarView from './CalendarView';
import TimeTable from './TimeTable';
import { db, STORES } from '../../utils/db';

interface ScheduleAppProps {
  onBack: () => void;
}

type Tab = 'todo' | 'calendar' | 'timetable';

interface ScheduleSettings {
  shareEnabled: boolean;
  shareScope: 'all' | 'specific';
  shareCharacterId: string;
}

interface Character {
  id: string;
  name: string;
  avatar?: string;
}

const DEFAULT_SETTINGS: ScheduleSettings = {
  shareEnabled: false,
  shareScope: 'all',
  shareCharacterId: ''
};

export default function ScheduleApp({ onBack }: ScheduleAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>('todo');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isCharSelectOpen, setIsCharSelectOpen] = useState(false);

  const tabs = [
    { id: 'todo', label: '待办', icon: CheckSquare },
    { id: 'calendar', label: '日程', icon: CalendarIcon },
    { id: 'timetable', label: '课表', icon: Table },
  ];

  useEffect(() => {
    loadSettings();
    loadCharacters();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await db.get<ScheduleSettings>(STORES.SCHEDULE, 'schedule_settings');
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (e) {
      console.error("Failed to load schedule settings", e);
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

  const handleSaveSettings = async () => {
    try {
      await db.set(STORES.SCHEDULE, 'schedule_settings', settings);
      setShowSettings(false);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 2000);
    } catch (e) {
      setShowErrorAlert(true);
      setTimeout(() => setShowErrorAlert(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#5A5A5A] relative overflow-hidden">
      {/* 顶部导航栏 - 手账风格 */}
      <div className="w-full relative z-10 pt-8 pb-4 px-6 flex items-center justify-between bg-[#FDFBF7]">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 active:scale-90 transition-all duration-200"
        >
          <ArrowLeft className="w-6 h-6 text-[#5A5A5A]" strokeWidth={2} />
        </button>
        
        <div className="text-lg font-bold tracking-widest text-[#5A5A5A] border-b-2 border-dashed border-[#5A5A5A]/30 pb-1">
          {tabs.find(t => t.id === activeTab)?.label}
        </div>
        
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 active:scale-90 transition-all duration-200 text-[#5A5A5A]"
        >
          <Share2 className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      
      {/* 装饰性胶带效果 */}
      <div className="absolute top-16 right-[-20px] w-24 h-6 bg-[#E8DCC4] rotate-[15deg] opacity-60 pointer-events-none z-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 20px)' }}></div>
      <div className="absolute top-20 left-[-10px] w-16 h-4 bg-[#D4E0D6] rotate-[-5deg] opacity-60 pointer-events-none z-0" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(255,255,255,0.5) 5px, rgba(255,255,255,0.5) 10px)' }}></div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden relative w-full">
        <div className="h-full w-full">
          {activeTab === 'todo' && <TodoList />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'timetable' && <TimeTable />}
        </div>
      </div>

      {/* 底部 Tab 栏 */}
      <div className="bg-[#FDFBF7] border-t border-dashed border-[#5A5A5A]/20 pb-safe pt-2 px-6 w-full">
        <div className="w-full flex justify-between items-center h-16 md:justify-center md:gap-32">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className="flex flex-col items-center justify-center gap-1 w-20 relative group active:scale-95 transition-transform duration-150"
              >
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#5A5A5A] text-[#FDFBF7] shadow-lg scale-110 rotate-[-3deg]' 
                      : 'bg-transparent text-[#9A9A9A]'
                  }`}
                >
                  <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold tracking-wider transition-colors duration-300 ${isActive ? 'text-[#5A5A5A]' : 'text-[#9A9A9A]'}`}>
                  {tab.label}
                </span>
                
                {/* 选中时的装饰点 */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabDot"
                    className="absolute -bottom-1 w-1 h-1 bg-[#5A5A5A] rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex items-center justify-center p-6">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.9, opacity: 0 }}
             transition={{ type: "spring", stiffness: 400, damping: 30 }}
             className="bg-[#FDFBF7] w-full max-w-[320px] rounded-2xl shadow-xl border-2 border-[#5A5A5A]/10 relative overflow-hidden"
           >
              <div className="bg-white/50 border-b border-dashed border-[#5A5A5A]/10 p-4 flex justify-between items-center">
                 <span className="text-lg font-bold text-[#5A5A5A]">数据共享设置</span>
                 <button 
                   onClick={() => setShowSettings(false)} 
                   className="p-1 text-[#999] hover:text-[#5A5A5A] active:scale-90 transition-transform"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Main Switch */}
                 <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-[#5A5A5A]">共享日程数据</h3>
                        <p className="text-xs text-[#999] mt-1">允许刀剑男士了解您的日程安排</p>
                    </div>
                    <button 
                        onClick={() => setSettings({...settings, shareEnabled: !settings.shareEnabled})}
                        className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${settings.shareEnabled ? 'bg-[#5A5A5A]' : 'bg-[#E0E0E0]'}`}
                    >
                        <motion.div 
                          animate={{ x: settings.shareEnabled ? 26 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                        />
                    </button>
                 </div>

                 <AnimatePresence>
                 {settings.shareEnabled && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 border-t border-dashed border-[#5A5A5A]/10 overflow-hidden"
                     >
                        <label className="text-xs font-bold text-[#999] block mb-2">共享范围</label>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSettings({...settings, shareScope: 'all'})}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    settings.shareScope === 'all' 
                                    ? 'bg-[#5A5A5A] border-[#5A5A5A] text-white' 
                                    : 'bg-white border-[#E0E0E0] text-[#999]'
                                }`}
                            >
                                <Users className="w-5 h-5" />
                                <span className="text-xs font-bold">本丸全员</span>
                            </button>
                            <button
                                onClick={() => setSettings({...settings, shareScope: 'specific'})}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    settings.shareScope === 'specific' 
                                    ? 'bg-[#5A5A5A] border-[#5A5A5A] text-white' 
                                    : 'bg-white border-[#E0E0E0] text-[#999]'
                                }`}
                            >
                                <User className="w-5 h-5" />
                                <span className="text-xs font-bold">指定近侍</span>
                            </button>
                        </div>

                        {settings.shareScope === 'specific' && (
                            <div className="mt-2">
                                <button
                                    onClick={() => setIsCharSelectOpen(!isCharSelectOpen)}
                                    className="w-full bg-white border border-[#E0E0E0] px-4 py-2.5 rounded-lg text-xs font-bold text-[#5A5A5A] flex items-center justify-between active:bg-[#F5F5F5] transition-colors"
                                >
                                    <div className="flex items-center gap-2 pl-1">
                                        <span>{characters.find(c => c.id === settings.shareCharacterId)?.name || "选择刀剑男士"}</span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 text-[#999] transition-transform ${isCharSelectOpen ? 'rotate-90' : ''}`} />
                                </button>

                                <AnimatePresence>
                                {isCharSelectOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 bg-white border border-[#E0E0E0] rounded-xl shadow-sm max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                            {characters.length === 0 && (
                                                <div className="p-3 text-center text-xs text-[#999]">暂无刀剑男士</div>
                                            )}
                                            {characters.map(char => (
                                                <button
                                                    key={char.id}
                                                    onClick={() => {
                                                        setSettings({...settings, shareCharacterId: char.id});
                                                        setIsCharSelectOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 mb-1 transition-colors ${
                                                        settings.shareCharacterId === char.id ? 'bg-[#5A5A5A] text-white' : 'hover:bg-[#F5F5F5] text-[#5A5A5A]'
                                                    }`}
                                                >
                                                    {char.name}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        )}
                     </motion.div>
                 )}
                 </AnimatePresence>

                 <button 
                   onClick={handleSaveSettings}
                   className="w-full bg-[#5A5A5A] text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                 >
                    <Check className="w-4 h-4" />
                    保存设置
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessAlert && (
        <div className="fixed top-[90px] inset-x-0 z-[100] flex justify-center pointer-events-none">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: -10 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.9, opacity: 0, y: -10 }}
             className="mx-auto w-fit flex items-center gap-2 px-4 py-3 pointer-events-auto shadow-sm"
             style={{
                background: 'rgba(253, 251, 247, 0.95)',
                backdropFilter: 'blur(4px)',
                border: '1px dashed rgba(90, 90, 90, 0.3)',
                borderRadius: '16px',
                color: '#5A5A5A',
                fontSize: '13px',
                fontWeight: 'bold'
             }}
           >
              <div className="w-5 h-5 rounded-full bg-[#5A5A5A] flex items-center justify-center text-[#FDFBF7]">
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
             className="mx-auto w-fit flex items-center gap-2 px-4 py-3 pointer-events-auto shadow-sm"
             style={{
                background: 'rgba(253, 251, 247, 0.95)',
                backdropFilter: 'blur(4px)',
                border: '1px dashed rgba(229, 115, 115, 0.5)',
                borderRadius: '16px',
                color: '#5A5A5A',
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