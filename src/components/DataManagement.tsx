import { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, FileText, Archive, Image as ImageIcon, Check, HardDrive, PieChart, Save, RefreshCw, Server, User, MessageSquare, Eraser, Sticker, Calendar } from 'lucide-react';
import { db, STORES } from '../utils/db';
import { exportAllImagesWithCategory, importAllImages, clearAllImages, getImageCategoryStats, IMAGE_CATEGORIES, listAllImages, deleteImage } from '../utils/imageDB';
import { clearCache } from '../utils/chatCache';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'motion/react';
import SettingsLayout from './SettingsLayout';

interface DataManagementProps {
  onBack: () => void;
}

export default function DataManagement({ onBack }: DataManagementProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearChatImagesConfirm, setShowClearChatImagesConfirm] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const [stats, setStats] = useState({
    totalSize: 0,
    userDataSize: 0,
    chatMessagesSize: 0,
    characterDataSize: 0,
    chatSettingsSize: 0,
    worldBooksSize: 0,
    otherDataSize: 0,
    chatImagesSize: 0,
    otherImagesSize: 0,
    stickersSize: 0,
    healthScheduleSize: 0,
    imageStats: {
      totalImages: 0,
      totalSize: 0,
      categories: {} as Record<string, { count: number, size: string }>,
    },
  });

  useEffect(() => {
    loadStats();
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const loadStats = async () => {
    try {
      const userDataSize = await db.getStoreSize(STORES.USER_DATA);
      const chatMessagesSize = await db.getStoreSize(STORES.CHAT_MESSAGES);
      const characterDataSize = await db.getStoreSize(STORES.CHARACTERS);
      const chatSettingsSize = await db.getStoreSize(STORES.CHAT_SETTINGS);
      const worldBooksSize = await db.getStoreSize(STORES.WORLD_BOOKS);
      const apiSettingsSize = await db.getStoreSize(STORES.API_SETTINGS);
      const appearanceSize = await db.getStoreSize(STORES.APPEARANCE);
      const miscSize = await db.getStoreSize(STORES.MISC);
      const chatsSize = await db.getStoreSize(STORES.CHATS);
      const healthSize = await db.getStoreSize(STORES.HEALTH);
      const scheduleSize = await db.getStoreSize(STORES.SCHEDULE);
      const stickersSize = await db.getStoreSize(STORES.STICKERS);
      const bubblePresetsSize = await db.getStoreSize(STORES.BUBBLE_PRESETS);
      const aiTasksSize = await db.getStoreSize(STORES.AI_TASKS);

      const systemDataSize = apiSettingsSize + appearanceSize + miscSize + chatsSize + userDataSize + chatSettingsSize + bubblePresetsSize + aiTasksSize;
      
      const healthScheduleSize = healthSize + scheduleSize;
      
      const imageStats = await getImageCategoryStats();
      const totalImages = Object.values(imageStats).reduce((sum, { count }) => sum + count, 0);
      const totalImageSizeKB = Object.values(imageStats).reduce((sum, { size }) => sum + parseFloat(size), 0);
      const totalImageSizeBytes = totalImageSizeKB * 1024;

      const chatImagesSizeKB = parseFloat(imageStats[IMAGE_CATEGORIES.CHAT_IMAGES]?.size || '0.00');
      const chatImagesSizeBytes = chatImagesSizeKB * 1024;
      
      const otherImagesSizeBytes = totalImageSizeBytes - chatImagesSizeBytes;

      const totalSizeBytes = chatMessagesSize + characterDataSize + worldBooksSize + systemDataSize + totalImageSizeBytes + stickersSize + healthScheduleSize;

      setStats({
        totalSize: totalSizeBytes,
        userDataSize: userDataSize,
        chatMessagesSize: chatMessagesSize,
        characterDataSize: characterDataSize,
        chatSettingsSize: chatSettingsSize,
        worldBooksSize: worldBooksSize,
        otherDataSize: systemDataSize,
        chatImagesSize: chatImagesSizeBytes,
        otherImagesSize: otherImagesSizeBytes,
        stickersSize: stickersSize,
        healthScheduleSize: healthScheduleSize,
        imageStats: {
          totalImages,
          totalSize: totalImageSizeBytes,
          categories: imageStats,
        },
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const allData = await db.exportAll();
      const exportData = { ...allData, exportTime: new Date().toISOString(), version: 2 };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `touken-os-data-${new Date().getTime()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export JSON failed:', error);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const allData = await db.exportAll();
      const exportData = { ...allData, exportTime: new Date().toISOString(), version: 2 };
      
      zip.file('data.json', JSON.stringify(exportData, null, 2));
      
      const imageData = await exportAllImagesWithCategory();
      const imagesFolder = zip.folder('images');
      
      for (const [key, { blob, category }] of Object.entries(imageData)) {
        const ext = blob.type.split('/')[1] || 'png';
        imagesFolder?.folder(category)?.file(`${key}.${ext}`, blob);
      }
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `touken-os-backup-${new Date().getTime()}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export Data failed:', error);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json,application/zip,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsImporting(true);
        try {
          const isJSON = file.name.endsWith('.json');
          
          if (isJSON) {
            const text = await file.text();
            const { exportTime, version, ...storeData } = JSON.parse(text);
            await db.importAll(storeData);
          } else {
            const zip = await JSZip.loadAsync(file);
            const dataFile = zip.file('data.json');
            if (!dataFile) throw new Error('Invalid backup file: missing data.json');
            
            const dataStr = await dataFile.async('text');
            const { exportTime, version, ...storeData } = JSON.parse(dataStr);
            await db.importAll(storeData);
            
            const imagesFolder = zip.folder('images');
            if (imagesFolder) {
              const imageFiles: Record<string, Blob> = {};
              const imagePromises: Promise<void>[] = [];
              imagesFolder.forEach((relativePath, file) => {
                if (!file.dir) {
                  imagePromises.push(
                    file.async('blob').then((blob) => {
                      const pathParts = relativePath.split('/');
                      const filename = pathParts[pathParts.length - 1];
                      const key = filename.replace(/\.[^/.]+$/, '');
                      imageFiles[key] = blob;
                    })
                  );
                }
              });
              await Promise.all(imagePromises);
              if (Object.keys(imageFiles).length > 0) await importAllImages(imageFiles);
            }
          }
          
          setShowImportSuccess(true);
          setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
          console.error('Import failed:', error);
          alert('导入失败，请检查文件格式');
        } finally {
          setIsImporting(false);
        }
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await db.clearAll();
      await clearAllImages();
      clearCache(true);
      setClearSuccess(true);
      setShowClearConfirm(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Clear failed:', error);
      alert('清除失败');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearChatImages = async () => {
    setIsClearing(true);
    try {
      const allImages = await listAllImages();
      const chatImages = allImages.filter(img => img.category === IMAGE_CATEGORIES.CHAT_IMAGES);
      
      console.log(`Deleting ${chatImages.length} chat images...`);

      for (const img of chatImages) {
        await deleteImage(img.originalKey);
      }

      setClearSuccess(true);
      setShowClearChatImagesConfirm(false);
      await loadStats();
      setTimeout(() => setClearSuccess(false), 2000);
    } catch (error) {
      console.error('Clear chat images failed:', error);
      alert('清除失败');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <SettingsLayout title="数据档案管理" onBack={onBack}>
        <div className="space-y-6 text-slate-800">
          
          {/* Toast Notification */}
          <AnimatePresence>
            {(showExportSuccess || showImportSuccess || clearSuccess) && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-24 left-0 right-0 flex justify-center z-[60] pointer-events-none px-4"
              >
                <div className="bg-slate-800 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 backdrop-blur-md">
                  <Check className="w-4 h-4 text-green-400" strokeWidth={3} />
                  <span className="text-xs font-bold tracking-wider uppercase">
                    {showExportSuccess && 'ARCHIVE_EXPORT_COMPLETE'}
                    {showImportSuccess && 'DATA_RESTORED_REBOOTING'}
                    {clearSuccess && 'OPERATION_COMPLETE'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Storage Stats Panel - Flat Tech Style */}
          <div className="bg-white p-5 border border-slate-300 relative overflow-hidden">
             {/* Decorative Corner */}
             <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-slate-800" />
             
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <HardDrive className="w-5 h-5 text-slate-600" />
                   <div>
                      <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">本地存储空间</h3>
                      <p className="text-[10px] text-slate-400 font-mono">STATUS: MOUNTED</p>
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-xl font-black text-slate-800 tracking-tighter">{formatBytes(stats.totalSize).split(' ')[0]}</span>
                   <span className="text-xs text-slate-400 font-bold ml-1">{formatBytes(stats.totalSize).split(' ')[1]}</span>
                </div>
             </div>
             
             {/* Storage Bar - Sharp */}
             <div className="h-3 w-full bg-slate-100 border border-slate-200 flex mb-6">
                {/* Chat Messages - Blue */}
                <div 
                   className="bg-blue-600 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.chatMessagesSize / stats.totalSize) * 100)}%` }} 
                />
                {/* Character Data - Purple */}
                <div 
                   className="bg-purple-500 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.characterDataSize / stats.totalSize) * 100)}%` }} 
                />
                {/* Chat Images - Green */}
                <div 
                   className="bg-emerald-500 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.chatImagesSize / stats.totalSize) * 100)}%` }} 
                />
                 {/* Other Images - Teal */}
                 <div 
                   className="bg-teal-500 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.otherImagesSize / stats.totalSize) * 100)}%` }} 
                />
                 {/* World Books - Orange */}
                 <div 
                   className="bg-orange-500 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.worldBooksSize / stats.totalSize) * 100)}%` }} 
                />
                 {/* Stickers - Pink */}
                 <div 
                   className="bg-pink-500 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.stickersSize / stats.totalSize) * 100)}%` }} 
                />
                 {/* Health & Schedule - Cyan */}
                 <div 
                   className="bg-cyan-500 h-full border-r border-white" 
                   style={{ width: `${Math.min(100, (stats.healthScheduleSize / stats.totalSize) * 100)}%` }} 
                />
                 {/* System Data - Slate */}
                 <div 
                   className="bg-slate-500 h-full" 
                   style={{ width: `${Math.min(100, (stats.otherDataSize / stats.totalSize) * 100)}%` }} 
                />
             </div>

             {/* Legend Grid - Tech Table */}
             <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '聊天记录', value: stats.chatMessagesSize, icon: MessageSquare, color: 'text-blue-600' },
                  { label: '人物档案', value: stats.characterDataSize, icon: User, color: 'text-purple-600' },
                  { label: '聊天图片', value: stats.chatImagesSize, icon: ImageIcon, color: 'text-emerald-600' },
                  { label: '表情包', value: stats.stickersSize, icon: Sticker, color: 'text-pink-600' },
                  { label: '其他媒体', value: stats.otherImagesSize, icon: ImageIcon, color: 'text-teal-600' },
                  { label: '世界书', value: stats.worldBooksSize, icon: Database, color: 'text-orange-600' },
                  { label: '系统配置', value: stats.otherDataSize, icon: Archive, color: 'text-slate-600' },
                  { label: '日程与健康', value: stats.healthScheduleSize, icon: Calendar, color: 'text-cyan-600' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border border-slate-100 bg-slate-50/50">
                     <div className="flex items-center gap-2">
                       <item.icon className={`w-3 h-3 ${item.color}`} />
                       <span className={`text-[10px] font-bold ${item.color}`}>{item.label}</span>
                     </div>
                     <span className="text-[10px] font-mono text-slate-500">{formatBytes(item.value)}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Actions Grid */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
               <Server className="w-3 h-3" /> 备份与恢复协议
            </h3>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {/* Export JSON */}
                    <button
                      onClick={handleExportJSON}
                      disabled={isExporting}
                      className="p-4 bg-white border border-slate-300 active:border-slate-800 hover:border-slate-800 active:bg-slate-50 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                         <FileText className="w-5 h-5 text-slate-400 group-active:text-slate-800 group-hover:text-slate-800 transition-colors" />
                         <span className="text-[9px] font-mono text-slate-300 group-active:text-slate-500 group-hover:text-slate-500">JSON</span>
                      </div>
                      <div className="text-left">
                          <h3 className="text-sm font-bold text-slate-800">导出文本</h3>
                          <p className="text-[10px] text-slate-400">仅文本数据</p>
                      </div>
                    </button>

                    {/* Export Full */}
                    <button
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="p-4 bg-white border border-slate-300 active:border-slate-800 hover:border-slate-800 active:bg-slate-50 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                         <Archive className="w-5 h-5 text-slate-400 group-active:text-slate-800 group-hover:text-slate-800 transition-colors" />
                         <span className="text-[9px] font-mono text-slate-300 group-active:text-slate-500 group-hover:text-slate-500">ZIP</span>
                      </div>
                      <div className="text-left">
                          <h3 className="text-sm font-bold text-slate-800">完整备份</h3>
                          <p className="text-[10px] text-slate-400">包含图片资源</p>
                      </div>
                    </button>
                </div>
                
                {/* Import */}
                <button
                  onClick={handleImportData}
                  disabled={isImporting}
                  className="w-full p-4 bg-white border border-slate-300 active:border-slate-800 hover:border-slate-800 active:bg-slate-50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 group-active:bg-slate-800 group-active:text-white group-hover:bg-slate-800 group-hover:text-white transition-colors">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                          <h3 className="text-sm font-bold text-slate-800">导入数据恢复</h3>
                          <p className="text-[10px] text-slate-400">RESTORE FROM ARCHIVE</p>
                      </div>
                  </div>
                  <div className="border border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase active:bg-slate-800 active:text-white hover:bg-slate-800 hover:text-white transition-colors">
                      选择文件
                  </div>
                </button>

                {/* Clear Chat Images Button */}
                <button
                  onClick={() => setShowClearChatImagesConfirm(true)}
                  className="w-full p-4 border border-slate-200 bg-slate-50/50 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 active:bg-slate-100 active:border-slate-300 hover:bg-slate-100 hover:border-slate-300 transition-all group"
                >
                  <Eraser className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  清除缓存图片 (CLEAR CACHE IMAGES)
                </button>

                {/* Clear Data */}
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full mt-6 p-4 border border-red-200 bg-red-50/30 text-red-600 font-bold text-sm flex items-center justify-center gap-2 active:bg-red-50 active:border-red-300 hover:bg-red-50 hover:border-red-300 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  执行系统重置 (ERASE ALL DATA)
                </button>
            </div>
          </div>

          {/* Confirmation Modal - Flat */}
          <AnimatePresence>
            {showClearConfirm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] px-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border-2 border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_rgba(0,0,0,0.2)] relative"
                >
                   {/* Warning Header */}
                   <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">危险操作警告</h3>
                   </div>
                   
                   <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
                      检测到清除指令。此操作将<span className="text-red-600 font-bold bg-red-50 px-1">永久删除</span>所有本地存储的数据、图片缓存及系统配置。
                      <br/><br/>
                      <span className="text-xs text-slate-400">SYSTEM ID: LOCAL_USER</span>
                   </p>

                   <div className="flex gap-3">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 py-3 border border-slate-300 text-slate-600 font-bold text-sm active:bg-slate-50 hover:bg-slate-50 transition-colors uppercase tracking-wider"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleClearData}
                        className="flex-1 py-3 bg-red-600 text-white font-bold text-sm active:bg-red-700 hover:bg-red-700 transition-colors shadow-lg shadow-red-200 uppercase tracking-wider"
                      >
                        确认清除
                      </button>
                   </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Clear Chat Images Confirmation Modal */}
          <AnimatePresence>
            {showClearChatImagesConfirm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] px-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border-2 border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_rgba(0,0,0,0.2)] relative"
                >
                   {/* Warning Header */}
                   <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                      <ImageIcon className="w-6 h-6 text-orange-500" />
                      <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">清理媒体缓存</h3>
                   </div>
                   
                   <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
                      是否确认清除所有聊天图片？
                      <br/>
                      <span className="text-orange-500 font-bold">此操作不可撤销。</span>
                      <br/><br/>
                      <span className="text-xs text-slate-400">TARGET: {formatBytes(stats.chatImagesSize)} / {stats.imageStats.categories[IMAGE_CATEGORIES.CHAT_IMAGES]?.count || 0} FILES</span>
                   </p>

                   <div className="flex gap-3">
                      <button
                        onClick={() => setShowClearChatImagesConfirm(false)}
                        className="flex-1 py-3 border border-slate-300 text-slate-600 font-bold text-sm active:bg-slate-50 hover:bg-slate-50 transition-colors uppercase tracking-wider"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleClearChatImages}
                        disabled={isClearing}
                        className="flex-1 py-3 bg-slate-800 text-white font-bold text-sm active:bg-slate-900 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 uppercase tracking-wider"
                      >
                        {isClearing ? '处理中...' : '确认清理'}
                      </button>
                   </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
    </SettingsLayout>
  );
}
