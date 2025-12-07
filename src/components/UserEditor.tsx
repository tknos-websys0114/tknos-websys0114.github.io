import { ChevronLeft, Check, User, Flag, Castle, Calendar, Gift, FileText, Star, Save, X, FileSignature, Sword } from "lucide-react";
import { useState, useEffect } from "react";
import { db, STORES } from "../utils/db";
import { motion, AnimatePresence } from "motion/react";

interface UserEditorProps {
  onBack: () => void;
}

export default function UserEditor({ onBack }: UserEditorProps) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [fortress, setFortress] = useState('');
  const [attendant, setAttendant] = useState('');
  const [initialSword, setInitialSword] = useState('');
  const [date, setDate] = useState('');
  const [birthday, setBirthday] = useState('');
  const [description, setDescription] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await db.get<any>(STORES.USER_DATA, 'userData');
        if (data) {
          setName(data.name || '');
          setCountry(data.country || '');
          setFortress(data.fortress || '');
          setAttendant(data.attendant || '');
          setInitialSword(data.initialSword || '');
          setDate(data.date || '');
          setBirthday(data.birthday || '');
        }

        const savedDesc = await db.get<string>(STORES.USER_DATA, 'user_description');
        if (savedDesc) {
          setDescription(savedDesc);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      const userData = { name, country, fortress, attendant, initialSword, date, birthday };
      await db.set(STORES.USER_DATA, 'userData', userData);
      await db.set(STORES.USER_DATA, 'user_description', description);

      // 发送事件通知其他组件
      const event = new CustomEvent('userDataChanged', { detail: userData });
      window.dispatchEvent(event);
      
      // 清除聊天缓存
      window.dispatchEvent(new Event('chat-settings-updated'));

      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#F2F0EB] z-50 overflow-hidden flex flex-col font-['Source_Han_Sans_CN_VF',sans-serif]"
    >
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      {/* Top Navigation */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-10 bg-[#F2F0EB]/95 backdrop-blur-sm border-b border-stone-200">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-[#EAE8E3] border border-[#D6D3CC] rounded-md flex items-center justify-center text-[#5A5A55] transition-colors active:bg-white active:text-[#B93636] hover:bg-white hover:text-[#B93636]"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-[#8C8C89] tracking-[0.2em] uppercase">Form 10-24</span>
          <h1 className="text-base font-bold text-[#2C2C2C] tracking-wide">档案修正</h1>
        </div>
        
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto">
        
        <div className="mt-6 mb-8 text-center">
           <div className="inline-block border-b-2 border-[#2C2C2C] pb-1 mb-2">
              <h2 className="text-xl font-black text-[#2C2C2C] uppercase tracking-tighter flex items-center gap-2">
                 <FileSignature className="w-5 h-5" />
                 人员档案
              </h2>
           </div>
           <p className="text-[10px] font-mono text-[#8C8C89] uppercase tracking-widest">
              仅限授权访问
           </p>
        </div>

        <div className="space-y-6 max-w-[420px] mx-auto">
          
          {/* SECTION I: IDENTITY */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               第一节：身份信息
            </div>

            <div className="space-y-4 mt-2">
               <div>
                  <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1">
                     正式名称（审神者）
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-lg font-bold text-[#2C2C2C] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors placeholder:text-[#CCC]"
                    placeholder="输入名称"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Castle className="w-3 h-3" /> 本丸名
                     </label>
                     <input
                       type="text"
                       value={fortress}
                       onChange={(e) => setFortress(e.target.value)}
                       className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-sm font-medium text-[#4A4A4A] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Flag className="w-3 h-3" /> 所属国
                     </label>
                     <input
                       type="text"
                       value={country}
                       onChange={(e) => setCountry(e.target.value)}
                       className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-sm font-medium text-[#4A4A4A] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors"
                     />
                  </div>
               </div>
            </div>
          </div>

          {/* SECTION II: ASSIGNMENT */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               第二节：任命详情
            </div>

            <div className="mt-2 space-y-4">
               <div>
                  <label className="block text-[10px] font-mono text-[#B93636] uppercase tracking-wider mb-1 flex items-center gap-1">
                     <Star className="w-3 h-3" fill="currentColor" /> 指定近侍
                  </label>
                  <div className="relative">
                     <input
                       type="text"
                       value={attendant}
                       onChange={(e) => setAttendant(e.target.value)}
                       className="w-full bg-[#FFF5F5] border-b-2 border-[#EFCACA] px-3 py-2 text-sm font-bold text-[#B93636] focus:outline-none focus:border-[#B93636] focus:bg-white transition-colors"
                       placeholder="未指定"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                     <Sword className="w-3 h-3" /> 初始刀
                  </label>
                  <input
                    type="text"
                    value={initialSword}
                    onChange={(e) => setInitialSword(e.target.value)}
                    className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-sm font-medium text-[#4A4A4A] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors"
                    placeholder="请输入初始刀"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 就任日期
                     </label>
                     <input
                       type="date"
                       value={date}
                       onChange={(e) => setDate(e.target.value)}
                       className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-2 py-2 text-xs font-mono font-medium text-[#4A4A4A] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Gift className="w-3 h-3" /> 出生登记
                     </label>
                     <input
                       type="text"
                       value={birthday}
                       onChange={(e) => setBirthday(e.target.value)}
                       placeholder="MM-DD"
                       className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-xs font-mono font-medium text-[#4A4A4A] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors"
                     />
                  </div>
               </div>
            </div>
          </div>

          {/* SECTION III: NOTES */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 pb-2 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)] h-[240px] flex flex-col">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               第三节：备注
            </div>
            
            <div className="flex-1 mt-2 relative">
               {/* Lined paper effect */}
               <div className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                       backgroundImage: 'linear-gradient(#000 1px, transparent 1px)',
                       backgroundSize: '100% 2rem',
                       marginTop: '1.9rem'
                    }}
               />
               <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-full bg-transparent border-none text-sm text-[#4A4A4A] focus:outline-none resize-none leading-[2rem]"
                  placeholder="输入详细的服务记录或背景信息..."
                  style={{ lineHeight: '2rem' }}
               />
            </div>
            <div className="text-right border-t border-[#E5E5E5] pt-2 mt-2">
               <span className="text-[10px] font-mono text-[#8C8C89]">
                  字数: {description.length}
               </span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#F2F0EB]/90 backdrop-blur-md border-t border-[#D6D3CC] z-40">
        <div className="max-w-[420px] mx-auto flex gap-4 items-center justify-between">
           <div className="text-[10px] font-mono text-[#8C8C89] max-w-[150px]">
              在此签署即证明所提供的信息真实准确。
           </div>
           
           <button
             onClick={handleSave}
             className="bg-[#2C2C2C] text-[#F2F0EB] px-8 py-3 rounded-[2px] font-bold text-sm tracking-wider uppercase active:bg-black hover:bg-black transition-colors shadow-lg flex items-center gap-2"
           >
             <Save className="w-4 h-4" />
             更新档案
           </button>
        </div>
      </div>

      {/* Success Stamp/Toast */}
      <AnimatePresence>
        {showSaveSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: -5 }}
              exit={{ opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
            >
              <div className="w-40 h-40 rounded-full border-[6px] border-[#34C759] flex flex-col items-center justify-center text-[#34C759] opacity-90 mix-blend-multiply bg-white/50 backdrop-blur-sm">
                <Check className="w-12 h-12 mb-1" strokeWidth={4} />
                <span className="text-xl font-black uppercase tracking-tight">已保存</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{new Date().toLocaleDateString()}</span>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
