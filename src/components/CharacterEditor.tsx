import { ChevronLeft, Trash2, Check, Camera, User, Plus, X, FileSignature, Book, Calendar, Image as ImageIcon, FileText, Save, Tag } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db, STORES } from "../utils/db";
import { saveImage, getImage, deleteImage } from "../utils/imageDB";
import { motion, AnimatePresence } from "motion/react";

interface Character {
  id: string;
  name: string;
  avatar: string | null;
  description: string;
  serialNumber?: string;
  manifestDate?: string;
  worldBooks?: string[];
  createdAt: string;
  updatedAt: string;
}

interface WorldBook {
  id: string;
  name: string;
  scope: 'global' | 'local';
  position: 'before' | 'after';
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CharacterEditorProps {
  onBack: () => void;
  character: Character | null;
}

export default function CharacterEditor({ onBack, character }: CharacterEditorProps) {
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [manifestDate, setManifestDate] = useState('');
  const [worldBooks, setWorldBooks] = useState<string[]>([]);
  const [tempWorldBooks, setTempWorldBooks] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showWorldBookSelector, setShowWorldBookSelector] = useState(false);
  const [allLocalWorldBooks, setAllLocalWorldBooks] = useState<WorldBook[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNewCharacter = character === null;

  useEffect(() => {
    if (character) {
      setName(character.name);
      setSerialNumber(character.serialNumber || '');
      setDescription(character.description);
      setManifestDate(character.manifestDate || '');
      setWorldBooks(character.worldBooks || []);
      
      const loadAvatar = async () => {
        if (character.avatar) {
          if (character.avatar.startsWith('data:')) {
            setAvatarUrl(character.avatar);
            setAvatarKey(null);
          } else {
            const url = await getImage(character.avatar);
            setAvatarUrl(url);
            setAvatarKey(character.avatar);
          }
        }
      };
      loadAvatar();
    }
  }, [character]);

  useEffect(() => {
    const loadLocalWorldBooks = async () => {
      const worldBooks = await db.get<WorldBook[]>(STORES.WORLD_BOOKS, 'world_books');
      if (worldBooks) {
        setAllLocalWorldBooks(worldBooks.filter(book => book.scope === 'local'));
      }
    };
    loadLocalWorldBooks();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const timestamp = Date.now();
      const key = `character-${character?.id || timestamp}-avatar`;
      const url = await saveImage(key, file);
      setAvatarUrl(url);
      setAvatarKey(key);
    }
  };

  const handleSave = async () => {
    try {
      const savedChars = await db.get<Character[]>(STORES.CHARACTERS, 'characters');
      let characters: Character[] = savedChars || [];
      const now = new Date().toISOString();

      if (isNewCharacter) {
        const newCharacter: Character = {
          id: `char_${Date.now()}`,
          name: name.trim() || '未命名',
          serialNumber: serialNumber.trim(),
          avatar: avatarKey,
          description: description.trim(),
          manifestDate: manifestDate.trim() || undefined,
          worldBooks: worldBooks,
          createdAt: now,
          updatedAt: now,
        };
        characters.push(newCharacter);
      } else {
        characters = characters.map((char) =>
          char.id === character!.id
            ? {
                ...char,
                name: name.trim() || '未命名',
                serialNumber: serialNumber.trim(),
                avatar: avatarKey,
                description: description.trim(),
                manifestDate: manifestDate.trim() || undefined,
                worldBooks: worldBooks,
                updatedAt: now,
              }
            : char
        );
      }

      await db.set(STORES.CHARACTERS, 'characters', characters);
      window.dispatchEvent(new Event('chat-settings-updated'));

      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Failed to save character:', error);
    }
  };

  const handleDelete = async () => {
    if (!character) return;
    try {
      const savedChars = await db.get<Character[]>(STORES.CHARACTERS, 'characters');
      if (savedChars) {
        const filteredCharacters = savedChars.filter((char) => char.id !== character.id);
        await db.set(STORES.CHARACTERS, 'characters', filteredCharacters);
      }
      window.dispatchEvent(new Event('chat-settings-updated'));
      if (character.avatar) await deleteImage(character.avatar);
      setShowDeleteConfirm(false);
      setTimeout(() => onBack(), 300);
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  const handleWorldBookRemove = (worldBookId: string) => {
    setWorldBooks(worldBooks.filter(id => id !== worldBookId));
  };

  const handleOpenWorldBookSelector = () => {
    setTempWorldBooks([...worldBooks]);
    setShowWorldBookSelector(true);
  };

  const handleToggleWorldBook = (worldBookId: string) => {
    if (tempWorldBooks.includes(worldBookId)) {
      setTempWorldBooks(tempWorldBooks.filter(id => id !== worldBookId));
    } else {
      setTempWorldBooks([...tempWorldBooks, worldBookId]);
    }
  };

  const handleSaveWorldBookSelection = () => {
    setWorldBooks([...tempWorldBooks]);
    setShowWorldBookSelector(false);
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
          <span className="text-[10px] font-bold text-[#8C8C89] tracking-[0.2em] uppercase">
            {isNewCharacter ? '新规登录' : '档案编纂'}
          </span>
          <h1 className="text-base font-bold text-[#2C2C2C] tracking-wide">
             {isNewCharacter ? '刀剑男士登录' : '刀剑男士编辑'}
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
                 详细情报
              </h2>
           </div>
           <p className="text-[10px] font-mono text-[#8C8C89] uppercase tracking-widest">
              机密人事档案
           </p>
        </div>

        <div className="space-y-6 max-w-[420px] mx-auto">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               onChange={handleFileChange}
               className="hidden"
            />
            <div 
               onClick={handleAvatarClick}
               className="relative w-32 h-40 bg-[#E5E5E5] border-2 border-[#D6D3CC] p-2 cursor-pointer group transition-colors active:border-[#2C2C2C] hover:border-[#2C2C2C]"
            >
               <div className="w-full h-full bg-[#F0F0F0] overflow-hidden relative">
                 {avatarUrl ? (
                   <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale-[0.2] group-active:grayscale-0 group-hover:grayscale-0 transition-all" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-[#999]">
                     <ImageIcon className="w-8 h-8 mb-1" strokeWidth={1.5} />
                     <span className="text-[9px] uppercase tracking-widest">暂无画像</span>
                   </div>
                 )}
                 
                 {/* Hover Overlay */}
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                 </div>
               </div>
               {/* "Photo Corner" Decorations */}
               <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#2C2C2C]" />
               <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#2C2C2C]" />
               <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#2C2C2C]" />
               <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#2C2C2C]" />
            </div>
            <p className="mt-2 text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider">
               图1. 识别照
            </p>
          </div>

          {/* SECTION I: BASIC INFO */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               壹 : 基本情报
            </div>

            <div className="space-y-4 mt-2">
               <div className="grid grid-cols-[1fr_80px] gap-4">
                 <div>
                    <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1">
                       代号 / 姓名
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-lg font-bold text-[#2C2C2C] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors placeholder:text-[#CCC]"
                      placeholder="请输入姓名"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                       <Tag className="w-3 h-3" /> 刀帐番号
                    </label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-lg font-bold text-[#2C2C2C] font-mono text-center focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors placeholder:text-[#CCC]"
                      placeholder="NO."
                    />
                 </div>
               </div>
               <div>
                  <label className="block text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider mb-1 flex items-center gap-1">
                     <Calendar className="w-3 h-3" /> 显现日
                  </label>
                  <input
                    type="text"
                    value={manifestDate}
                    onChange={(e) => setManifestDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full bg-[#EAE8E3] border-b-2 border-[#D6D3CC] px-3 py-2 text-sm font-mono font-medium text-[#4A4A4A] focus:outline-none focus:border-[#2C2C2C] focus:bg-white transition-colors"
                  />
               </div>
            </div>
          </div>

          {/* SECTION II: WORLD BOOK LINKS */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               贰 : 关联档案
            </div>
            
            <div className="mt-2">
               <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-mono text-[#8C8C89] uppercase tracking-wider flex items-center gap-1">
                     <Book className="w-3 h-3" /> 关联世界书条目
                  </label>
                  <button
                    onClick={handleOpenWorldBookSelector}
                    className="text-[10px] font-bold text-[#2C2C2C] border border-[#2C2C2C] px-2 py-0.5 active:bg-[#2C2C2C] active:text-white hover:bg-[#2C2C2C] hover:text-white transition-colors uppercase"
                  >
                    + 关联条目
                  </button>
               </div>

               <div className="space-y-2">
                  {worldBooks.length === 0 ? (
                     <div className="py-4 text-center border border-dashed border-[#D6D3CC] bg-[#F0F0F0]">
                        <span className="text-[10px] text-[#999] font-mono uppercase">暂无关联记录</span>
                     </div>
                  ) : (
                     worldBooks.map(id => {
                        const worldBook = allLocalWorldBooks.find(book => book.id === id);
                        return worldBook ? (
                           <div key={id} className="bg-white border border-[#E5E5E5] px-3 py-2 flex items-center justify-between group">
                              <div className="flex items-center gap-2">
                                 <Tag className="w-3 h-3 text-[#8C8C89]" />
                                 <span className="text-sm font-bold text-[#4A4A4A]">{worldBook.name}</span>
                              </div>
                              <button
                                 onClick={() => handleWorldBookRemove(id)}
                                 className="text-[#D6D3CC] active:text-[#FF3B30] hover:text-[#FF3B30] transition-colors"
                              >
                                 <X className="w-4 h-4" />
                              </button>
                           </div>
                        ) : null;
                     })
                  )}
               </div>
            </div>
          </div>

          {/* SECTION III: DESCRIPTION */}
          <div className="bg-[#F9F9F7] border border-[#D6D3CC] p-5 pb-2 relative shadow-[2px_2px_0px_rgba(0,0,0,0.05)] h-[300px] flex flex-col">
             <div className="absolute -top-2.5 left-4 bg-[#2C2C2C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
               叁 : 角色详请
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-full bg-transparent border-none text-sm text-[#4A4A4A] focus:outline-none resize-none leading-[2rem]"
                  placeholder="在此输入性格、经历及特征..."
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
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#F2F0EB]/90 backdrop-blur-md border-t border-[#D6D3CC] z-40 flex gap-3 justify-center">
          {!isNewCharacter && (
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
             {isNewCharacter ? '作成' : '更新'}
          </button>
      </div>

      {/* World Book Selector Modal */}
      {showWorldBookSelector && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] px-4">
            <div 
               className="bg-[#F2F0EB] w-full max-w-[340px] border border-[#D6D3CC] shadow-2xl"
            >
              <div className="bg-[#2C2C2C] text-[#F2F0EB] px-4 py-3 flex justify-between items-center">
                 <span className="text-xs font-bold uppercase tracking-wider">选择档案</span>
                 <button onClick={() => setShowWorldBookSelector(false)}><X className="w-4 h-4" /></button>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto p-2">
                 {allLocalWorldBooks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8C8C89] font-mono">未找到本地档案</div>
                 ) : (
                    <div className="space-y-1">
                       {allLocalWorldBooks.map(book => (
                          <button
                            key={book.id}
                            onClick={() => handleToggleWorldBook(book.id)}
                            className={`w-full px-4 py-3 text-left text-sm font-bold border transition-all flex justify-between items-center ${
                               tempWorldBooks.includes(book.id) 
                               ? 'bg-white border-[#2C2C2C] text-[#2C2C2C]' 
                               : 'bg-[#F9F9F7] border-transparent text-[#8C8C89] active:border-[#D6D3CC] hover:border-[#D6D3CC]'
                            }`}
                          >
                             {book.name}
                             {tempWorldBooks.includes(book.id) && <Check className="w-4 h-4" />}
                          </button>
                       ))}
                    </div>
                 )}
              </div>
              
              <div className="p-3 border-t border-[#D6D3CC] flex gap-2">
                 <button 
                   onClick={() => setShowWorldBookSelector(false)}
                   className="flex-1 py-2 text-xs font-bold text-[#5A5A55] active:bg-[#E5E5E5] hover:bg-[#E5E5E5]"
                 >
                   取消
                 </button>
                 <button 
                   onClick={handleSaveWorldBookSelection}
                   className="flex-1 py-2 bg-[#2C2C2C] text-[#F2F0EB] text-xs font-bold active:bg-black hover:bg-black"
                 >
                   确认
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
                <span className="text-xl font-black uppercase tracking-tight">归档</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{new Date().toLocaleDateString()}</span>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] px-4">
             <div
               className="bg-[#F2F0EB] border-2 border-[#FF3B30] p-6 max-w-xs w-full text-center shadow-2xl"
             >
                <div className="w-12 h-12 bg-[#FF3B30] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                   <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-[#2C2C2C] uppercase mb-2">确认删除</h3>
                <p className="text-xs font-mono text-[#5A5A55] mb-6">
                   此操作将永久删除该人事记录。是否继续？
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
                      删除
                   </button>
                </div>
             </div>
          </div>
      )}

    </div>
  );
}
