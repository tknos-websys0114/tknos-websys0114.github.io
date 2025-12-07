import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import imgLogo from "figma:asset/5f8732ee23725e4e0895553baa1c8e03e361ca7a.png";

export default function LoadingScreen({ onAnimationComplete }: { onAnimationComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    // 模拟进度条
    const duration = 2000; // 2秒
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(100, (currentStep / steps) * 100);
      setProgress(newProgress);

      // 模拟日志
      if (newProgress > 10 && logs.length === 0) setLogs(prev => [...prev, ">> 初始化时之政府安全协议..."]);
      if (newProgress > 30 && logs.length === 1) setLogs(prev => [...prev, ">> 验证审神者灵力纹章..."]);
      if (newProgress > 50 && logs.length === 2) setLogs(prev => [...prev, ">> 同步本丸时空坐标数据..."]);
      if (newProgress > 70 && logs.length === 3) setLogs(prev => [...prev, ">> 加载刀剑男士显现记录..."]);
      if (newProgress > 90 && logs.length === 4) setLogs(prev => [...prev, ">> Touken OS 系统就绪"]);

      if (currentStep >= steps) {
        clearInterval(timer);
        if (onAnimationComplete) {
            // 稍微延迟一点点，让用户看到100%的状态
            setTimeout(onAnimationComplete, 200);
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [logs.length]);

  return (
    <div className="fixed inset-0 bg-[#F5F5F5] flex flex-col items-center justify-center font-['Source_Han_Sans_CN_VF',sans-serif] z-50">
        {/* 背景装饰：网格线 */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} 
        />
        
        {/* 顶部状态栏装饰 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2C2C2C]" />
        
        <div className="w-full max-w-[320px] flex flex-col items-center relative z-10">
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-32 h-32 mb-12 relative"
            >
                <div className="absolute inset-0 bg-white rounded-full shadow-2xl opacity-50 blur-xl scale-90" />
                <img src={imgLogo} alt="Touken OS Logo" className="w-full h-full object-contain relative z-10 drop-shadow-lg" />
            </motion.div>

            {/* 进度条容器 */}
            <div className="w-full h-1 bg-[#D6D3CC] mb-6 relative overflow-hidden rounded-full">
                <motion.div 
                    className="absolute top-0 left-0 bottom-0 bg-[#2C2C2C]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                />
            </div>

            {/* 终端日志 */}
            <div className="w-full h-24 font-mono text-[10px] text-[#5A5A55] space-y-1.5 overflow-hidden flex flex-col justify-end">
                <AnimatePresence mode='popLayout'>
                    {logs.map((log, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                        >
                            <span className="w-1 h-1 bg-[#34C759] rounded-full shrink-0 animate-pulse" />
                            <span className="truncate tracking-tight">{log}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* 底部版本号 */}
            <div className="absolute -bottom-24 text-[9px] text-[#8C8C89] font-mono tracking-widest opacity-60">
                CHRONOS GOVERNMENT TERMINAL V1.0
            </div>
        </div>
    </div>
  );
}