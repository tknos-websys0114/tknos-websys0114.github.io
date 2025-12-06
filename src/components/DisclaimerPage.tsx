import { ChevronLeft, Shield, Copyright, ExternalLink, FileText, Github, AlertCircle, Terminal } from "lucide-react";
import { motion } from "motion/react";
import SettingsLayout from './SettingsLayout';

interface DisclaimerPageProps {
  onBack: () => void;
}

export default function DisclaimerPage({ onBack }: DisclaimerPageProps) {
  return (
    <SettingsLayout title="关于系统" onBack={onBack}>
      <div className="space-y-8 text-slate-800">
        
        {/* Header Card */}
        <div className="bg-white border border-slate-200 p-6 relative overflow-hidden shadow-sm group">
           <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 -mr-8 -mt-8 rotate-45 transform transition-transform group-hover:scale-150 duration-700 ease-out" />
           <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-800 text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-200">
                 <Terminal className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black tracking-tight uppercase">Touken OS</h2>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-1">
                 Government Terminal
              </p>
              <div className="mt-4 inline-flex items-center px-3 py-1 bg-slate-100 border border-slate-200 rounded-none text-xs font-mono text-slate-600">
                 v1.0 (Beta)
              </div>
           </div>
        </div>

        {/* Section: Disclaimer Content */}
        <section className="bg-slate-50 border border-slate-200 p-5 relative">
           <div className="absolute top-0 left-0 w-2 h-2 bg-slate-300" />
           <div className="absolute top-0 right-0 w-2 h-2 bg-slate-300" />
           <div className="absolute bottom-0 left-0 w-2 h-2 bg-slate-300" />
           <div className="absolute bottom-0 right-0 w-2 h-2 bg-slate-300" />
           
           <div className="flex items-center gap-2 text-slate-800 mb-4">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">免责声明与使用协议</h3>
           </div>
           
           <div className="text-xs text-slate-600 leading-relaxed space-y-4 text-justify h-64 overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">1. 版权声明</h4>
                <p>
                   本网页（以下简称“本站”）为《刀剑乱舞-ONLINE-》（以下简称“原游戏”）的非官方同人衍生作品。
                   原游戏中的所有人物形象、名称、世界观设定等的知识产权均归 <span className="font-bold">Nitroplus</span> 及 <span className="font-bold">DMM GAMES (EXNOA LLC)</span> 所有。
                   本站内部分带有原作元素的美术素材均为我纯手绘的二次创作，未直接使用原游戏内的美术与音频资源。若原版权方认为本站侵犯了其权益，请联系开发者，我将立即采取措施。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">2. 非商业性质</h4>
                <p>
                   本站仅供同好交流、学习与个人娱乐使用，<span className="font-bold text-red-500">严禁用于任何形式的商业用途</span>（包括但不限于销售、付费会员、广告盈利等）。
                   本站为免费网页，禁止任何人将其用于非法牟利。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">3. 免责条款</h4>
                <p>
                   本站按“现状”提供，不包含任何形式的明示或暗示保证。
                   用户使用本站产生的风险由用户自行承担。开发者不对因使用本站而导致的任何直接、间接、附带、特殊或后果性的损害（包括但不限于设备故障、数据丢失、业务中断）承担责任。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">4. 数据与隐私</h4>
                <p>
                   本站采用本地化数据存储策略。除 AI 对话功能需调用第三方接口外，用户的个人数据（如审神者信息、自定义设定等）均存储于用户设备的浏览器 IndexedDB 中，不会上传至开发者服务器。
                   用户需自行负责数据的备份与安全。因清除浏览器缓存或设备故障导致的数据丢失，开发者不承担恢复责任。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">5. AI 服务声明</h4>
                <p>
                   本站的聊天功能基于第三方大语言模型（LLM）技术实现。AI 输出的内容具有随机性，不代表官方设定，也不代表开发者的观点。
                   在使用 AI 聊天功能时，请勿输入真实姓名、住址、密码等敏感个人信息。
                </p>
              </div>
           </div>
        </section>

        {/* Footer */}
        <div className="text-center py-4 opacity-50">
           <p className="text-[9px] text-slate-400 font-mono tracking-widest">
              MADE WITH ❤ FOR TOUKEN RANBU
           </p>
        </div>

      </div>
    </SettingsLayout>
  );
}
