import { ChevronLeft, Plus, Book, Globe, MapPin, Search, FileText, Layers, Archive, Library, Bookmark, X, LayoutGrid, List as ListIcon, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { db, STORES } from "../utils/db";

interface WorldBook {
  id: string;
  name: string;
  scope: 'global' | 'local';
  position: 'before' | 'after';
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface WorldBookListProps {
  onBack: () => void;
  onEdit: (worldBook: WorldBook | null) => void;
}

export default function WorldBookList({ onBack, onEdit }: WorldBookListProps) {
  const [worldBooks, setWorldBooks] = useState<WorldBook[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewScope, setViewScope] = useState<'all' | 'global' | 'local'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadWorldBooks();
  }, []);

  const loadWorldBooks = async () => {
    try {
      const books = await db.get<WorldBook[]>(STORES.WORLD_BOOKS, 'world_books');
      if (books) {
        setWorldBooks(books);
      }
    } catch (error) {
      console.error('Failed to load world books:', error);
    }
  };

  const handleCreate = () => {
    onEdit(null);
  };

  const handleEditBook = (book: WorldBook) => {
    onEdit(book);
  };

  const filteredBooks = worldBooks
    .filter(book => viewScope === 'all' || book.scope === viewScope)
    .filter(book => 
      book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div 
      className="fixed inset-0 bg-[#F5F2EB] z-50 overflow-hidden flex flex-col font-['Source_Han_Sans_CN_VF',sans-serif]"
    >
      {/* Background Texture - Subtle paper texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
           }} 
      />

      {/* Top Navigation - "The Bookshelf Header" */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 z-20 bg-[#F5F2EB]/95 backdrop-blur-xl border-b border-[#D6D3CC] shadow-sm">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/50 border border-[#D6D3CC] rounded-lg flex items-center justify-center text-[#5A5A55] transition-colors hover:bg-white hover:text-[#2C2C2C] shadow-[0_2px_0_#E5E5E5]"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Library className="w-3 h-3 text-[#8C8C89]" />
            <span className="text-[10px] font-bold text-[#8C8C89] tracking-[0.2em] uppercase">
              中央档案室
            </span>
          </div>
          <h1 className="text-lg font-serif font-bold text-[#2C2C2C] tracking-tight flex items-center gap-2">
             世界书资料室
          </h1>
        </div>
        
        <button
          onClick={handleCreate}
          className="w-10 h-10 bg-[#2C2C2C] text-[#F2F0EB] rounded-lg flex items-center justify-center transition-colors shadow-lg hover:bg-black"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Filter & Search Bar - "Catalog Index" */}
      <div className="px-6 py-4 z-10 bg-[#F5F2EB]">
         <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8C89]" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="检索档案..."
                    className="w-full bg-white border border-[#D6D3CC] rounded-full px-4 py-2.5 pl-10 text-xs font-medium text-[#2C2C2C] placeholder:text-[#AAA] focus:outline-none focus:border-[#2C2C2C] focus:ring-1 focus:ring-[#2C2C2C] transition-colors shadow-sm"
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BBB] hover:text-[#2C2C2C]"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="flex bg-white border border-[#D6D3CC] rounded-lg p-1 shrink-0 shadow-sm">
                <button 
                   onClick={() => setViewMode('grid')}
                   className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#F5F2EB] text-[#2C2C2C]' : 'text-[#8C8C89]'}`}
                >
                   <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                   onClick={() => setViewMode('list')}
                   className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#F5F2EB] text-[#2C2C2C]' : 'text-[#8C8C89]'}`}
                >
                   <ListIcon className="w-4 h-4" />
                </button>
            </div>
         </div>

         {/* Tabs */}
         <div className="flex gap-6 border-b border-[#D6D3CC] px-2">
             {[
                { id: 'all', label: '全部' },
                { id: 'global', label: '世界' },
                { id: 'local', label: '本地（局部）' }
             ].map((tab) => (
                 <button
                     key={tab.id}
                     onClick={() => setViewScope(tab.id as any)}
                     className={`pb-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${
                         viewScope === tab.id 
                         ? 'text-[#2C2C2C]' 
                         : 'text-[#8C8C89] active:text-[#5A5A55] hover:text-[#5A5A55]'
                     }`}
                 >
                     {tab.label}
                     {viewScope === tab.id && (
                        <div 
                           className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C2C2C]" 
                        />
                     )}
                 </button>
             ))}
         </div>
      </div>

      {/* Main Bookshelf Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
         {filteredBooks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[#8C8C89] opacity-60">
               <Library className="w-16 h-16 mb-4 stroke-1" />
               <p className="text-xs font-serif italic">该分类下暂无卷宗</p>
            </div>
         ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4 pt-2" : "flex flex-col gap-3 pt-2"}>
               {filteredBooks.map((book, index) => (
                  <div
                     key={book.id}
                     onClick={() => handleEditBook(book)}
                     className={`group cursor-pointer relative ${
                        viewMode === 'grid' ? 'aspect-[3/4]' : 'h-24'
                     }`}
                  >
                     {/* Book Spine / Cover Design */}
                     {viewMode === 'grid' ? (
                        // GRID VIEW: Vertical Book Cover
                        <div className="absolute inset-0 bg-white border border-[#E5E5E5] rounded-r-md rounded-l-sm shadow-[4px_4px_10px_rgba(0,0,0,0.05)] active:shadow-[6px_6px_15px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_15px_rgba(0,0,0,0.1)] transition-all overflow-hidden flex flex-col">
                           {/* Spine decoration */}
                           <div className={`absolute left-0 top-0 bottom-0 w-3 ${book.scope === 'global' ? 'bg-[#2C2C2C]' : 'bg-[#8C8C89]'} opacity-10 border-r border-black/5`} />
                           
                           {/* Top Label */}
                           <div className="mt-4 mx-4 flex justify-between items-start">
                              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                 book.scope === 'global' ? 'bg-[#F0F0F0] text-[#2C2C2C]' : 'bg-[#F5F5F5] text-[#8C8C89]'
                              }`}>
                                 {book.scope === 'global' ? '卷 I' : '卷 II'}
                              </span>
                              {book.scope === 'global' ? <Globe className="w-3 h-3 text-[#2C2C2C]" /> : <Bookmark className="w-3 h-3 text-[#8C8C89]" />}
                           </div>

                           {/* Title Area */}
                           <div className="flex-1 px-4 flex flex-col justify-center">
                              <h3 className="font-serif text-lg leading-tight font-bold text-[#2C2C2C] line-clamp-3">
                                 {book.name || '无题'}
                              </h3>
                              <div className="w-8 h-0.5 bg-[#D6D3CC] mt-3" />
                           </div>

                           {/* Bottom Metadata */}
                           <div className="px-4 pb-4 pt-2 bg-[#F9F9F7] border-t border-[#F0F0F0]">
                              <p className="text-[9px] text-[#8C8C89] font-mono line-clamp-2 mb-2">
                                 {book.content || '暂无内容...'}
                              </p>
                              <div className="flex items-center gap-2 text-[8px] font-bold text-[#AAA] uppercase">
                                 <Calendar className="w-2.5 h-2.5" />
                                 {new Date(book.updatedAt).toLocaleDateString()}
                              </div>
                           </div>
                        </div>
                     ) : (
                        // LIST VIEW: Horizontal Book Spine/Card
                        <div className="w-full h-full bg-white border border-[#E5E5E5] rounded-md shadow-sm active:shadow-md hover:shadow-md transition-all flex overflow-hidden">
                           <div className={`w-2 h-full ${book.scope === 'global' ? 'bg-[#2C2C2C]' : 'bg-[#D6D3CC]'}`} />
                           <div className="flex-1 p-3 flex flex-col justify-center">
                              <div className="flex justify-between items-start mb-1">
                                 <h3 className="font-serif text-base font-bold text-[#2C2C2C]">
                                    {book.name || '无题卷宗'}
                                 </h3>
                                 <span className="text-[9px] px-2 py-0.5 bg-[#F5F5F5] rounded text-[#8C8C89] font-bold uppercase">
                                    {book.scope === 'global' ? '世界' : '本地（局部）'}
                                 </span>
                              </div>
                              <p className="text-[10px] text-[#666] line-clamp-2 pr-8">
                                 {book.content}
                              </p>
                           </div>
                           <div className="w-12 border-l border-[#F0F0F0] flex flex-col items-center justify-center gap-1 text-[#AAA]">
                              <FileText className="w-4 h-4" />
                              <span className="text-[9px] font-mono">{book.content.length}</span>
                           </div>
                        </div>
                     )}
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Library Footer Status */}
      <div className="bg-[#EAE8E3] border-t border-[#D6D3CC] px-6 py-3 flex justify-between items-center text-[9px] font-mono text-[#8C8C89] uppercase tracking-wider">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#34C759]" />
            <span>档案系统在线</span>
         </div>
         <span>总卷数: {worldBooks.length}</span>
      </div>

    </div>
  );
}
