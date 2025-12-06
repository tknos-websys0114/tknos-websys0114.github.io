import { ChevronLeft, Terminal } from "lucide-react";
import { ReactNode } from "react";

interface SettingsLayoutProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
  className?: string;
}

export default function SettingsLayout({ title, onBack, children, className = "" }: SettingsLayoutProps) {
  return (
    <div 
      className="fixed inset-0 bg-[#F0F2F5] z-50 overflow-hidden flex flex-col font-['Source_Han_Sans_CN_VF',sans-serif] text-slate-800"
    >
      {/* Tech Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
           style={{ 
             backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
           }} 
      />
      
      {/* Navigation Bar - Flat Tech Style */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-300 sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-md mx-auto px-4 h-[60px] flex items-center justify-between relative">
          <button
            onClick={onBack}
            className="absolute left-4 p-2 -ml-2 flex items-center gap-1 text-slate-600 active:text-black active:bg-slate-100 hover:text-black hover:bg-slate-100 rounded-none border border-transparent active:border-slate-300 hover:border-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            <span className="text-xs font-bold tracking-wider">返回</span>
          </button>
          
          <div className="w-full text-center flex flex-col items-center justify-center pointer-events-none">
            <h1 className="text-sm font-bold tracking-[0.1em] text-slate-800 uppercase">
              {title}
            </h1>
            <div className="h-[2px] w-8 bg-slate-800 mt-1" />
          </div>
          
          {/* Status Icon */}
          <div className="absolute right-4 opacity-30">
             <Terminal className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto overscroll-contain ${className}`}>
        <div className="max-w-md mx-auto min-h-full pb-10 pt-6 px-5">
          {children}
        </div>
      </div>
    </div>
  );
}
