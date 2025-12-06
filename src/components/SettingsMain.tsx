import { ChevronLeft, Palette, Database, Info, Sparkles, ChevronRight, Battery, Wifi, Activity, Server, ShieldCheck, Zap } from "lucide-react";
import { useState, useEffect } from "react";

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery: () => Promise<BatteryManager>;
}

interface SettingsMainProps {
  onNavigate: (page: 'api' | 'beautify' | 'data' | 'disclaimer') => void;
  onClose: () => void;
}

export default function SettingsMain({ onNavigate, onClose }: SettingsMainProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initBattery = async () => {
      try {
        const nav = navigator as unknown as NavigatorWithBattery;
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          
          const updateBattery = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };

          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);

          return () => {
            battery.removeEventListener('levelchange', updateBattery);
            battery.removeEventListener('chargingchange', updateBattery);
          };
        }
      } catch (error) {
        console.log('Battery Status API not supported');
      }
    };

    initBattery();
  }, []);

  const menuItems = [
    { 
      id: 'beautify' as const, 
      label: '界面美化', 
      sub: 'INTERFACE MOD',
      desc: '壁纸 · 图标 · 主题',
      icon: Palette,
    },
    { 
      id: 'api' as const, 
      label: '智能连接', 
      sub: 'NEURAL LINK',
      desc: 'AI 模型 · 接口配置',
      icon: Sparkles,
    },
    { 
      id: 'data' as const, 
      label: '数据档案', 
      sub: 'DATA ARCHIVE',
      desc: '备份 · 恢复 · 清理',
      icon: Database,
    },
    { 
      id: 'disclaimer' as const, 
      label: '关于系统', 
      sub: 'SYSTEM INFO',
      desc: '版本 · 说明 · 版权',
      icon: Info,
    },
  ];

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

      {/* Top Status Bar - Requested Design */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-300 px-6 py-2 flex justify-between items-center text-[10px] font-bold tracking-widest text-slate-500 z-20 sticky top-0">
         <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3" strokeWidth={2.5} />
            <span>政府网专线</span>
         </div>
         <div className="flex items-center gap-2">
            <span>{batteryLevel}%</span>
            <div className="relative">
               <Battery className={`w-4 h-4 ${isCharging ? 'text-green-600' : 'text-slate-500'}`} strokeWidth={2.5} />
               {isCharging && (
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Zap className="w-2 h-2 text-green-600 fill-current" />
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-4 z-20">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center text-slate-700 active:bg-slate-800 active:text-white active:border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
             终端设置 <span className="text-[10px] px-1.5 py-0.5 border border-slate-800 text-slate-800 font-mono font-medium rounded-sm">CONFIG</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 tracking-wider mt-1">
             <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
             <span>终端运行中 · {currentTime.toLocaleTimeString('zh-CN', { hour12: false })}</span>
          </div>
        </div>
      </div>

      {/* Decorative Line */}
      <div className="mx-6 h-[1px] bg-slate-300 mb-6 flex justify-between items-center overflow-hidden">
         <div className="w-1/3 h-full bg-slate-800" />
         <div className="flex gap-1">
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        
        <div className="space-y-3">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full bg-white border border-slate-300 p-0 flex items-stretch justify-between group active:border-slate-800 hover:border-slate-800 transition-colors relative overflow-hidden"
            >
              {/* Index Number Background */}
              <div className="absolute right-0 top-0 text-[60px] font-black text-slate-100 leading-none -translate-y-2 translate-x-4 pointer-events-none opacity-50 group-active:opacity-20 group-hover:opacity-20 transition-opacity">
                 0{index + 1}
              </div>

              <div className="flex items-center gap-5 p-5 z-10">
                {/* Icon Box */}
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-active:bg-slate-800 group-active:text-white group-active:border-slate-800 group-hover:bg-slate-800 group-hover:text-white group-hover:border-slate-800 transition-colors duration-200">
                  <item.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                
                {/* Text */}
                <div className="text-left">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-bold text-slate-800 group-active:text-blue-600 group-hover:text-blue-600 transition-colors">
                      {item.label}
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                      {item.sub}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Arrow Area */}
              <div className="w-10 border-l border-slate-100 flex items-center justify-center bg-slate-50 group-active:bg-slate-100 group-hover:bg-slate-100 transition-colors">
                 <ChevronRight className="w-5 h-5 text-slate-400 group-active:text-slate-800 group-hover:text-slate-800 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info Card - Requested Design */}
        <div className="mt-10 border-t border-slate-300 pt-6">
           <div className="flex justify-between items-end opacity-60">
              <div className="text-[10px] font-bold tracking-widest space-y-1">
                 <div className="flex items-center gap-2"><Server className="w-3 h-3" /> <span>服务器连接: 正常</span></div>
                 <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> <span>安全协议: 启用</span></div>
                 <div className="flex items-center gap-2"><Activity className="w-3 h-3" /> <span>延迟: 12ms</span></div>
              </div>
              <div className="text-right">
                 <div className="w-12 h-12 border-2 border-slate-800 rounded-full flex items-center justify-center opacity-20">
                    <span className="text-[10px] font-black">OS</span>
                 </div>
              </div>
           </div>
           
           <div className="mt-6 text-center">
              <div className="inline-flex items-center justify-center px-3 py-1 border border-slate-800 bg-slate-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase">
                 政府管辖终端 OS
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono tracking-widest">
                 TOUKEN RANBU ONLINE // CHIFU SYSTEM
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}
