import { ChevronLeft, Plus, ChevronRight, User, Shield, Swords, FileText, Hash, Stamp, Archive } from "lucide-react";
import { useState, useEffect } from "react";
import { db, STORES } from "../utils/db";
import { getUserAvatar, setUserAvatarCache } from "../utils/chatCache";
import { getImage } from "../utils/imageDB";
import { motion } from "motion/react";

interface Character {
  id: string;
  name: string;
  avatar: string | null;
  avatarUrl?: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface CharacterListProps {
  onClose: () => void;
  onEditUser: () => void;
  onEditCharacter: (character: Character | null) => void;
}

export default function CharacterList({ onClose, onEditUser, onEditCharacter }: CharacterListProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userData, setUserData] = useState({
    name: '',
    country: '',
    fortress: '',
    date: '',
    attendant: ''
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    const cached = getUserAvatar();
    return cached !== undefined ? cached : null;
  });

  useEffect(() => {
    loadCharacters();
    loadUserData();

    const handleAvatarChange = () => {
      loadUserData();
    };

    window.addEventListener('avatarChanged', handleAvatarChange);
    window.addEventListener('userDataChanged', handleAvatarChange);
    
    return () => {
      window.removeEventListener('avatarChanged', handleAvatarChange);
      window.removeEventListener('userDataChanged', handleAvatarChange);
    };
  }, []);

  const loadCharacters = async () => {
    try {
      const chars = await db.get<Character[]>(STORES.CHARACTERS, 'characters');
      if (chars) {
        const charsWithUrls = await Promise.all(
          chars.map(async (char) => {
            if (char.avatar) {
              if (char.avatar.startsWith('data:')) {
                return { ...char, avatarUrl: char.avatar };
              } else {
                const url = await getImage(char.avatar);
                return { ...char, avatarUrl: url };
              }
            }
            return { ...char, avatarUrl: null };
          })
        );
        setCharacters(charsWithUrls);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const data = await db.get<any>(STORES.USER_DATA, 'userData');
      if (data) {
        setUserData(data);
      }

      const avatarUrl = await getImage('avatar');
      setUserAvatar(avatarUrl);
      setUserAvatarCache(avatarUrl);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleCreateCharacter = () => {
    onEditCharacter(null);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#F2F0EB] z-50 overflow-hidden flex flex-col font-['Source_Han_Sans_CN_VF',sans-serif]"
    >
      {/* Background Texture/Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      {/* Top Navigation Bar */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-10 bg-[#F2F0EB]/95 backdrop-blur-sm border-b border-stone-200">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-[#EAE8E3] border border-[#D6D3CC] rounded-md flex items-center justify-center text-[#5A5A55] transition-colors hover:bg-white hover:text-black hover:border-[#999]"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-[#8C8C89] tracking-[0.2em] uppercase">人事档案</span>
          <h1 className="text-base font-bold text-[#2C2C2C] tracking-wide">组织图表</h1>
        </div>
        
        <button
          onClick={handleCreateCharacter}
          className="w-10 h-10 bg-[#2C2C2C] text-[#F2F0EB] rounded-md flex items-center justify-center transition-colors hover:bg-black shadow-sm"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        
        {/* Date Stamp */}
        <div className="flex justify-end mt-6 mb-2">
           <div className="border border-[#8C8C89] text-[#8C8C89] px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 opacity-60">
              <Archive className="w-3 h-3" />
              记录-{new Date().getFullYear()}-A
           </div>
        </div>

        {/* SANIWA ID CARD */}
        <div className="relative mb-8 group cursor-pointer" onClick={onEditUser}>
          {/* Card "Clip" Effect */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#D6D3CC] rounded-sm z-0" />
          
          <div 
             className="relative bg-[#F9F9F7] border border-[#D6D3CC] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] z-10 transition-all active:border-[#B93636] active:shadow-md hover:border-[#B93636] hover:shadow-md"
          >
            {/* Corner Decorations */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#B93636] opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#B93636] opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#B93636] opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#B93636] opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity" />

            <div className="flex gap-5">
               {/* Photo Box */}
               <div className="w-24 h-32 bg-[#E5E5E5] border border-[#D6D3CC] p-1 flex-shrink-0 relative overflow-hidden">
                  {userAvatar ? (
                     <img src={userAvatar} alt="Saniwa" className="w-full h-full object-cover grayscale-[0.2] group-active:grayscale-0 group-hover:grayscale-0 transition-all" />
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-[#999] bg-[#F0F0F0]">
                        <User className="w-8 h-8 mb-1" strokeWidth={1.5} />
                        <span className="text-[9px] uppercase">暂无照片</span>
                     </div>
                  )}
                  {/* Watermark */}
                  <div className="absolute inset-0 border border-black/5 pointer-events-none" />
               </div>

               {/* Info Section */}
               <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-[#2C2C2C] text-white px-1.5 py-0.5">审神者</span>
                        <span className="text-[10px] font-bold text-[#B93636] border border-[#B93636] px-1.5 py-0.5">已认证</span>
                     </div>
                     <h2 className="text-xl font-bold text-[#2C2C2C] leading-tight mb-0.5 border-b border-[#D6D3CC] pb-2 inline-block min-w-[120px]">
                       {userData.name || '未登记'}
                     </h2>
                  </div>

                  <div className="space-y-2 mt-2">
                     <div className="grid grid-cols-[60px_1fr] text-xs">
                        <span className="text-[#8C8C89] font-bold uppercase text-[10px] tracking-wider mt-0.5">本丸名</span>
                        <span className="font-medium text-[#4A4A4A] font-mono">{userData.fortress || '---'}</span>
                     </div>
                     <div className="grid grid-cols-[60px_1fr] text-xs">
                        <span className="text-[#8C8C89] font-bold uppercase text-[10px] tracking-wider mt-0.5">所属国</span>
                        <span className="font-medium text-[#4A4A4A] font-mono">{userData.country || '---'}</span>
                     </div>
                     {userData.attendant && (
                       <div className="grid grid-cols-[60px_1fr] text-xs">
                          <span className="text-[#8C8C89] font-bold uppercase text-[10px] tracking-wider mt-0.5">近侍</span>
                          <span className="font-medium text-[#4A4A4A] flex items-center gap-1">
                            {userData.attendant}
                          </span>
                       </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Background Stamp Effect (Visual Only) */}
            <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none rotate-[-15deg]">
               <div className="w-20 h-20 rounded-full border-4 border-[#2C2C2C] flex items-center justify-center">
                  <span className="text-[10px] font-black uppercase text-[#2C2C2C]">已核准</span>
               </div>
            </div>
          </div>
        </div>

        {/* PERSONNEL LIST HEADER */}
        <div className="flex items-end justify-between mb-4 border-b-2 border-[#2C2C2C] pb-1">
           <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-[#2C2C2C]" />
              <h3 className="text-base font-black text-[#2C2C2C] uppercase tracking-tight">
                 刀剑男士
              </h3>
           </div>
           <span className="text-xs font-mono font-bold text-[#2C2C2C]">
              数量: {characters.length.toString().padStart(2, '0')}
           </span>
        </div>

        {/* CHARACTER LIST */}
        <div className="space-y-2">
           {characters.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#BBB] bg-[#F9F9F7]">
                 <Stamp className="w-12 h-12 text-[#D6D3CC] mx-auto mb-3" strokeWidth={1} />
                 <p className="text-[#8C8C89] text-sm font-medium uppercase tracking-wider">暂无记录</p>
                 <button 
                   onClick={handleCreateCharacter}
                   className="mt-4 text-xs font-bold text-[#2C2C2C] underline hover:text-[#B93636]"
                 >
                   + 登记新刀剑
                 </button>
              </div>
           ) : (
              characters.map((char, index) => (
                 <div
                    key={char.id}
                    onClick={() => onEditCharacter(char)}
                    className="group relative bg-[#F9F9F7] border-l-[3px] border-l-[#D6D3CC] border-y border-r border-[#E5E5E5] p-3 pl-4 active:bg-[#EAE8E3] active:border-l-[#2C2C2C] transition-colors hover:border-l-[#2C2C2C] cursor-pointer"
                 >
                    <div className="flex items-center gap-4">
                       {/* ID Number */}
                       <span className="text-[10px] font-mono text-[#8C8C89] w-6 text-right group-active:text-[#B93636] group-hover:text-[#B93636] transition-colors">
                          {(index + 1).toString().padStart(3, '0')}
                       </span>

                       {/* Avatar Thumb */}
                       <div className="w-10 h-10 bg-[#E5E5E5] border border-[#D6D3CC] flex-shrink-0 overflow-hidden grayscale group-active:grayscale-0 group-hover:grayscale-0 transition-all">
                          {char.avatarUrl ? (
                             <img src={char.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center">
                                <User className="w-4 h-4 text-[#999]" />
                             </div>
                          )}
                       </div>

                       {/* Text Info */}
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                             <h4 className="text-sm font-bold text-[#2C2C2C] tracking-wide group-active:text-black group-hover:text-black">
                                {char.name}
                             </h4>
                             {/* Optional Decorative Status Tag */}
                             <span className="text-[9px] font-bold uppercase text-[#B93636] opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity border border-[#B93636] px-1">
                                显现中
                             </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-[#8C8C89] font-mono uppercase tracking-wider">简介</span>
                             <p className="text-xs text-[#5A5A55] truncate font-medium">
                                {char.description || '---'}
                             </p>
                          </div>
                       </div>

                       <ChevronRight className="w-4 h-4 text-[#D6D3CC] group-active:text-[#2C2C2C] group-hover:text-[#2C2C2C] transition-colors" />
                    </div>
                 </div>
              ))
           )}
        </div>

      </div>
    </div>
  );
}
