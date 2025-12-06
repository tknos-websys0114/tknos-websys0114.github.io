import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import imgLogo from "figma:asset/5f8732ee23725e4e0895553baa1c8e03e361ca7a.png";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogAction } from "./ui/alert-dialog";
import { db, STORES } from "../utils/db";
import { User, MapPin, Home, Calendar, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (data: { name: string; country: string; fortress: string; date: string }) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    fortress: "",
    date: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const handleLogin = () => {
    if (!formData.name || !formData.country || !formData.fortress || !formData.date) {
      setShowAlert(true);
      return;
    }

    setIsLoading(true);

    setTimeout(async () => {
      await db.set(STORES.USER_DATA, 'userData', formData);
      onLoginSuccess(formData);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F0EB] flex flex-col items-center justify-center p-6 font-['Source_Han_Sans_CN_VF',sans-serif] relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ 
             backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />
      
      {/* Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-200/50 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-32 h-32 mb-6 drop-shadow-2xl"
          >
             <img alt="Touken OS Logo" className="w-full h-full object-contain" src={imgLogo} />
          </motion.div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[#2C2C2C] tracking-tight">时之政府终端登录</h1>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#8C8C89] uppercase tracking-widest bg-white/50 py-1 px-3 rounded-full border border-[#D6D3CC]">
               <ShieldCheck className="w-3 h-3" />
               Secure Connection
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden border border-white">
           <div className="h-1.5 w-full bg-[#2C2C2C]" />
           
           <div className="p-8 space-y-6">
              <div className="space-y-4">
                 {/* Name Input */}
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#8C8C89] uppercase tracking-wider flex items-center gap-1.5">
                       <User className="w-3 h-3" /> 审神者代号
                    </label>
                    <input
                       type="text"
                       value={formData.name}
                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       placeholder="请输入名称"
                       className="w-full bg-[#F9F9F7] border-b-2 border-[#E5E5E5] px-3 py-2.5 text-sm font-medium text-[#2C2C2C] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-all rounded-t-md placeholder:text-[#BBB]"
                    />
                 </div>

                 {/* Country Input */}
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#8C8C89] uppercase tracking-wider flex items-center gap-1.5">
                       <MapPin className="w-3 h-3" /> 所属国
                    </label>
                    <input
                       type="text"
                       value={formData.country}
                       onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                       placeholder="请输入属国 (如: 相模国)"
                       className="w-full bg-[#F9F9F7] border-b-2 border-[#E5E5E5] px-3 py-2.5 text-sm font-medium text-[#2C2C2C] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-all rounded-t-md placeholder:text-[#BBB]"
                    />
                 </div>

                 {/* Fortress Input */}
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#8C8C89] uppercase tracking-wider flex items-center gap-1.5">
                       <Home className="w-3 h-3" /> 本丸代号
                    </label>
                    <input
                       type="text"
                       value={formData.fortress}
                       onChange={(e) => setFormData({ ...formData, fortress: e.target.value })}
                       placeholder="请输入本丸名"
                       className="w-full bg-[#F9F9F7] border-b-2 border-[#E5E5E5] px-3 py-2.5 text-sm font-medium text-[#2C2C2C] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-all rounded-t-md placeholder:text-[#BBB]"
                    />
                 </div>

                 {/* Date Input */}
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#8C8C89] uppercase tracking-wider flex items-center gap-1.5">
                       <Calendar className="w-3 h-3" /> 就任日期
                    </label>
                    <input
                       type="date"
                       value={formData.date}
                       onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                       className="w-full bg-[#F9F9F7] border-b-2 border-[#E5E5E5] px-3 py-2.5 text-sm font-medium text-[#2C2C2C] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-all rounded-t-md placeholder:text-[#BBB] font-mono"
                    />
                 </div>
              </div>

              <button
                 onClick={handleLogin}
                 disabled={isLoading}
                 className="w-full h-12 bg-[#2C2C2C] active:bg-black hover:bg-black text-white rounded-lg font-bold text-sm tracking-widest uppercase transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                 {isLoading ? (
                    <>
                       <Loader2 className="w-4 h-4 animate-spin" />
                       Connecting...
                    </>
                 ) : (
                    <>
                       确认就任
                       <ArrowRight className="w-4 h-4 group-active:translate-x-1 group-hover:translate-x-1 transition-transform" />
                    </>
                 )}
              </button>
           </div>
           
           <div className="px-8 py-4 bg-[#F9F9F7] border-t border-[#E5E5E5] flex justify-between items-center text-[10px] text-[#8C8C89] font-mono">
              <span>SYSTEM: ONLINE</span>
              <span>VER: 1.0</span>
           </div>
        </div>
      </motion.div>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="bg-[#F9F9F7] border border-[#D6D3CC] max-w-[320px] rounded-lg">
          <AlertDialogTitle className="text-[#2C2C2C] font-bold flex items-center gap-2">
             <ShieldCheck className="w-5 h-5 text-[#B93636]" />
             验证失败
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#5A5A55] text-xs">
            请完整填写所有审神者认证信息以继续。
          </AlertDialogDescription>
          <div className="flex justify-end mt-4">
            <AlertDialogAction onClick={() => setShowAlert(false)} className="bg-[#2C2C2C] text-white active:bg-black hover:bg-black text-xs font-bold px-4 h-8 rounded-md">
              确认
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}