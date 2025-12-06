import { ChevronLeft, Trash2, Check, AlertCircle, Save, Globe, MapPin, Layers, AlignLeft, X, FileSignature, BookOpen, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { db, STORES } from "../utils/db";
import { motion, AnimatePresence } from "motion/react";

interface WorldBook {
  id: string;
  name: string;
  scope: 'global' | 'local';
  position: 'before' | 'after';
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface WorldBookEditorProps {
  onBack: () => void;
  worldBook: WorldBook | null;
}

export default function WorldBookEditor({ onBack, worldBook }: WorldBookEditorProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'global' | 'local'>('local');
  const [position, setPosition] = useState<'before' | 'after'>('before');
  const [content, setContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [nameError, setNameError] = useState(false);

  const isNewBook = worldBook === null;

  useEffect(() => {
    if (worldBook) {
      setName(worldBook.name);
      setScope(worldBook.scope);
      setPosition(worldBook.position);
      setContent(worldBook.content);
    }
  }, [worldBook]);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);

    try {
      const savedBooks = await db.get<WorldBook[]>(STORES.WORLD_BOOKS, 'world_books');
      let books: WorldBook[] = savedBooks || [];
      const now = new Date().toISOString();

      if (isNewBook) {
        const newBook: WorldBook = {
          id: `wb_${Date.now()}`,
          name: name.trim(),
          scope,
          position,
          content: content.trim(),
          createdAt: now,
          updatedAt: now,
        };
        books.push(newBook);
      } else {
        books = books.map(book => 
          book.id === worldBook!.id
            ? {
                ...book,
                name: name.trim(),
                scope,
                position,
                content: content.trim(),
                updatedAt: now,
              }
            : book
        );
      }

      await db.set(STORES.WORLD_BOOKS, 'world_books', books);
      
      // 发送事件通知其他组件
      window.dispatchEvent(new Event('chat-settings-updated'));

      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Failed to save world book:', error);
    }
  };

  const handleDelete = async () => {
    if (!worldBook) return;
    try {
      const savedBooks = await db.get<WorldBook[]>(STORES.WORLD_BOOKS, 'world_books');
      if (savedBooks) {
        const filteredBooks = savedBooks.filter(book => book.id !== worldBook.id);
        await db.set(STORES.WORLD_BOOKS, 'world_books', filteredBooks);
      }
      
      // 发送事件通知其他组件
      window.dispatchEvent(new Event('chat-settings-updated'));

      setShowDeleteConfirm(false);
      setTimeout(() => onBack(), 300);
    } catch (error) {
      console.error('Failed to delete world book:', error);
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
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-10 bg-[#F2F0EB]/95 backdrop-blur-sm border-b border-[#D6D3CC]">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-[#EAE8E3] border border-[#D6D3CC] rounded-md flex items-center justify-center text-[#5A5A55] transition-colors active:bg-white active:text-[#B93636] hover:bg-white hover:text-[#B93636]"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        
        <div className="flex flex-col items-center">
           <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-[#8C8C89]" />
              <span className="text-[10px] font-bold text-[#8C8C89] tracking-[0.2em] uppercase">
                {isNewBook ? '新规卷宗' : '卷宗编辑'}
              </span>
           </div>
          <h1 className="text-base font-bold text-[#2C2C2C] tracking-wide">
             {isNewBook ? '新规作成' : '编辑模式'}
          </h1>
        </div>
        
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto">
        
        <div className="mt-6 mb-8 text-center">
           <div className="inline-block border-b-2 border-[#2C2C2C] pb-1 mb-2">
              <h2 className="text-xl font-black text-[#2C2C2C] uppercase tracking-tighter flex items-center gap-2">
                 <FileSignature className="w-5 h-5" />
                 档案录入
              </h2>
           </div>
           <p className="text-[10px] font-mono text-[#8C8C89] uppercase tracking-widest">
              设定及背景资料
           </p>
        </div>

        <div className="space-y-6 max-w-[420px] mx-auto">
          
          {/* SECTION I: HEADER */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               第一节：标题与范围
            </div>

            <div className="space-y-4 mt-2">
               <div>
                  <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1">
                     卷宗标题
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError(false);
                    }}
                    className={`w-full bg-[#EAE8E3] border-b-2 px-3 py-2 text-lg font-bold text-[#2C2C2C] focus:outline-none focus:bg-white transition-colors placeholder:text-[#CCC] ${
                       nameError ? 'border-[#B93636] bg-[#FFF5F5]' : 'border-[#D6D3CC] focus:border-[#2C2C2C]'
                    }`}
                    placeholder="输入标题"
                  />
                  {nameError && (
                     <p className="text-[10px] text-[#B93636] font-bold mt-1 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> 必填项
                     </p>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> 作用域
                     </label>
                     <div className="flex flex-col gap-1">
                        {[
                           { id: 'global', label: '世界 (全局)' },
                           { id: 'local', label: '本地（局部）' }
                        ].map((item) => (
                           <button
                              key={item.id}
                              onClick={() => setScope(item.id as any)}
                              className={`w-full py-2 px-3 text-xs font-bold text-left transition-all border ${
                                 scope === item.id 
                                 ? 'bg-[#2C2C2C] text-[#F2F0EB] border-[#2C2C2C]' 
                                 : 'bg-white border-[#D6D3CC] text-[#8C8C89] active:border-[#8C8C89] hover:border-[#8C8C89]'
                              }`}
                           >
                              {scope === item.id && <Check className="w-3 h-3 inline mr-1" />}
                              {item.label}
                           </button>
                        ))}
                     </div>
                  </div>
                  
                  <div>
                     <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> 注入位置
                     </label>
                     <div className="flex flex-col gap-1">
                        {[
                           { id: 'before', label: '前置 (Prepend)' },
                           { id: 'after', label: '后置 (Append)' }
                        ].map((item) => (
                           <button
                              key={item.id}
                              onClick={() => setPosition(item.id as any)}
                              className={`w-full py-2 px-3 text-xs font-bold text-left transition-all border ${
                                 position === item.id 
                                 ? 'bg-[#2C2C2C] text-[#F2F0EB] border-[#2C2C2C]' 
                                 : 'bg-white border-[#D6D3CC] text-[#8C8C89] active:border-[#8C8C89] hover:border-[#8C8C89]'
                              }`}
                           >
                              {position === item.id && <Check className="w-3 h-3 inline mr-1" />}
                              {item.label}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* SECTION II: CONTENT */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 pb-2 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)] h-[360px] flex flex-col">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               第二节：档案内容
            </div>
            
            <div className="flex-1 mt-2 relative">
               <div className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                       backgroundImage: 'linear-gradient(#000 1px, transparent 1px)',
                       backgroundSize: '100% 2rem',
                       marginTop: '1.9rem'
                    }}
               />
               <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full bg-transparent border-none text-sm text-[#4A4A4A] focus:outline-none resize-none leading-[2rem] font-mono"
                  placeholder="在此输入世界观设定..."
                  style={{ lineHeight: '2rem' }}
               />
            </div>
            <div className="text-right border-t border-[#E5E5E5] pt-2 mt-2">
               <span className="text-[10px] font-mono text-[#8C8C89]">
                  字数: {content.length}
               </span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#F2F0EB]/90 backdrop-blur-md border-t border-[#D6D3CC] z-40 flex gap-3 justify-center">
          {!isNewBook && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-12 h-12 border-2 border-[#FF3B30] text-[#FF3B30] flex items-center justify-center active:bg-[#FF3B30] active:text-white hover:bg-[#FF3B30] hover:text-white transition-colors rounded-[2px]"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          <button
             onClick={handleSave}
             className="flex-1 max-w-[300px] bg-[#2C2C2C] text-[#F2F0EB] h-12 rounded-[2px] font-bold text-sm tracking-wider uppercase active:bg-black hover:bg-black transition-colors shadow-lg flex items-center justify-center gap-2"
          >
             <Save className="w-4 h-4" />
             {isNewBook ? '归档' : '更新记录'}
          </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] px-4">
           <div
             className="bg-[#F2F0EB] border-2 border-[#FF3B30] p-6 max-w-xs w-full text-center shadow-2xl"
           >
                <div className="w-12 h-12 bg-[#FF3B30] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                   <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-[#2C2C2C] uppercase mb-2">确认销毁</h3>
                <p className="text-xs font-mono text-[#5A5A55] mb-6">
                   此操作将永久销毁该档案。是否继续？
                </p>
                <div className="flex gap-3">
                   <button 
                     onClick={() => setShowDeleteConfirm(false)}
                     className="flex-1 py-3 border border-[#D6D3CC] font-bold text-xs active:bg-white hover:bg-white"
                   >
                      取消
                   </button>
                   <button 
                     onClick={handleDelete}
                     className="flex-1 py-3 bg-[#FF3B30] text-white font-bold text-xs active:bg-[#D32F2F] hover:bg-[#D32F2F]"
                   >
                      销毁
                   </button>
                </div>
           </div>
        </div>
      )}

      {/* Success Stamp */}
      <AnimatePresence>
        {showSaveSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: -5 }}
              exit={{ opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] pointer-events-none"
            >
              <div className="w-40 h-40 rounded-full border-[6px] border-[#34C759] flex flex-col items-center justify-center text-[#34C759] opacity-90 mix-blend-multiply bg-white/50 backdrop-blur-sm">
                <Check className="w-12 h-12 mb-1" strokeWidth={4} />
                <span className="text-xl font-black uppercase tracking-tight">已归档</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{new Date().toLocaleDateString()}</span>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
