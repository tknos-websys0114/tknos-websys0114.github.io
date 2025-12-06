import { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, Settings } from 'lucide-react';
import { getAllStickers, getStickerImageURL, addSticker, deleteSticker, Sticker, batchImportStickersFromURL } from '../utils/stickerManager';

interface StickerPickerProps {
  onClose: () => void;
  onSelect: (stickerId: string) => void;
}

export default function StickerPicker({ onClose, onSelect }: StickerPickerProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [stickerUrls, setStickerUrls] = useState<Record<string, string>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [meaning, setMeaning] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorToast, setErrorToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [batchImportText, setBatchImportText] = useState('');
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isManageMode, setIsManageMode] = useState(false); // 管理模式
  
  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    try {
      const allStickers = await getAllStickers();
      setStickers(allStickers);
      
      // 加载所有表情的URL
      const urls: Record<string, string> = {};
      for (const sticker of allStickers) {
        // 如果是图床URL，直接使用
        if (sticker.imageUrl) {
          urls[sticker.id] = sticker.imageUrl;
        } 
        // 如果是本地上传的图片，从imageDB获取
        else if (sticker.imageKey) {
          const url = await getStickerImageURL(sticker.imageKey);
          if (url) {
            urls[sticker.id] = url;
          }
        }
      }
      setStickerUrls(urls);
    } catch (error) {
      console.error('Failed to load stickers:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setShowUploadModal(true);
    }
    // 重置input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !meaning.trim()) {
      setErrorToast({ show: true, message: '请选择文件并填写表情含义' });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    setIsUploading(true);
    try {
      await addSticker(selectedFile, meaning.trim());
      await loadStickers();
      handleCancelUpload();
      // 成功时不弹窗
    } catch (error: any) {
      console.error('Failed to upload sticker:', error);
      setErrorToast({ show: true, message: error.message || '表情包上传失败' });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
    setUploadPreview(null);
    setMeaning('');
    setSelectedFile(null);
  };

  const handleStickerClick = (stickerId: string) => {
    onSelect(stickerId);
    onClose();
  };

  const handleDeleteSticker = async (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个表情包吗？')) {
      try {
        await deleteSticker(stickerId);
        await loadStickers();
      } catch (error: any) {
        console.error('Failed to delete sticker:', error);
        setErrorToast({ show: true, message: error.message || '删除表情包失败' });
        setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
      }
    }
  };

  const handleBatchImport = async () => {
    if (!batchImportText.trim()) {
      setErrorToast({ show: true, message: '请输入URL列表' });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    setIsBatchImporting(true);
    setBatchImportResult(null); // 清空之前的结果
    try {
      const result = await batchImportStickersFromURL(batchImportText.trim());
      setBatchImportResult(result);
      await loadStickers();
      
      // 如果全部失败，显示错误提示
      if (result.success === 0 && result.failed > 0) {
        setErrorToast({ show: true, message: '所有表情包导入失败，请检查格式和URL' });
        setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
      }
      // 否则保持弹窗打开，显示导入结果
    } catch (error: any) {
      console.error('Failed to batch import stickers:', error);
      setErrorToast({ show: true, message: error.message || '批量导入表情包失败' });
      setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
    } finally {
      setIsBatchImporting(false);
    }
  };

  const handleCancelBatchImport = () => {
    setShowBatchImportModal(false);
    setBatchImportText('');
    setBatchImportResult(null);
  };

  return (
    <>
      {/* 表情选择器主体 */}
      <div
        className="fixed inset-0 bg-transparent z-[1050]"
        onClick={onClose}
      >
        <div
          className="absolute bottom-[70px] right-3 w-[320px] h-[300px] bg-white rounded-xl shadow-lg flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部工具栏 */}
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[16px] text-[#333]">
              {isManageMode ? '管理表情包' : '选择表情'}
            </h3>
            <button
              onClick={() => setIsManageMode(!isManageMode)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isManageMode
                  ? 'bg-[#88A588] text-white'
                  : 'bg-[#f0f0f0] text-[#666] hover:bg-[#e8e8e8]'
              }`}
            >
              <span className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[13px]">
                {isManageMode ? '完成' : '管理'}
              </span>
            </button>
          </div>
          
          {/* 表情网格 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-[repeat(auto-fill,80px)] gap-2.5 justify-center">
              {/* 非管理模式下显示添加按钮 */}
              {!isManageMode && (
                <>
                  {/* 添加按钮 */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 bg-[#e8e8e8] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#d8d8d8] active:bg-[#c8c8c8] transition-colors"
                  >
                    <Plus className="w-8 h-8 text-[#999]" strokeWidth={2} />
                  </button>

                  {/* 批量导入按钮 */}
                  <button
                    onClick={() => setShowBatchImportModal(true)}
                    className="w-20 h-20 bg-[#e8e8e8] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#d8d8d8] active:bg-[#c8c8c8] transition-colors"
                  >
                    <Upload className="w-8 h-8 text-[#999]" strokeWidth={2} />
                  </button>
                </>
              )}

              {/* 表情列表 */}
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className="relative w-20 h-20 group"
                >
                  <button
                    onClick={() => !isManageMode && handleStickerClick(sticker.id)}
                    className={`w-full h-full bg-[#f9f9f9] rounded-lg p-1 transition-colors ${
                      isManageMode 
                        ? 'cursor-default' 
                        : 'cursor-pointer hover:bg-[#f0f0f0] active:bg-[#e8e8e8]'
                    }`}
                  >
                    {stickerUrls[sticker.id] && (
                      <img
                        src={stickerUrls[sticker.id]}
                        alt={sticker.meaning}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </button>
                  
                  {/* 删除按钮 - 管理模式下始终显示，非管理模式下悬停显示 */}
                  <button
                    onClick={(e) => handleDeleteSticker(e, sticker.id)}
                    className={`absolute -top-1 -right-1 w-5 h-5 bg-[#ff3b30] rounded-full flex items-center justify-center transition-opacity ${
                      isManageMode 
                        ? 'opacity-100' 
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X className="w-3 h-3 text-white" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 上传弹窗 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] shadow-xl">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-4">
              上传表情
            </h3>

            {/* 预览图片 */}
            {uploadPreview && (
              <img
                src={uploadPreview}
                alt="preview"
                className="w-[100px] h-[100px] object-cover rounded-lg mx-auto mb-4 bg-[#f0f0f0]"
              />
            )}

            {/* 含义输入框 */}
            <input
              type="text"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="为AI添加表情的解释(必填,如:开心)"
              className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none outline-none font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333] mb-6"
            />

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelUpload}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl bg-[#88A588] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isUploading ? '上传中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 */}
      {showBatchImportModal && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[18px] text-center mb-3">
              批量导入图床表情
            </h3>

            {/* 格式说明 */}
            <div className="bg-[#f5f5f5] rounded-xl p-3 mb-4">
              <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[13px] text-[#666] mb-2">
                格式说明：
              </p>
              <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[12px] text-[#999] leading-relaxed">
                每行一个表情包，格式为：<br />
                <span className="text-[#88A588]">含义-图床URL</span><br />
                <br />
                示例：<br />
                开心-https://example.com/happy.jpg<br />
                难过-https://example.com/sad.png<br />
                生气-https://example.com/angry.gif
              </p>
            </div>

            {/* URL输入框 */}
            <textarea
              value={batchImportText}
              onChange={(e) => setBatchImportText(e.target.value)}
              placeholder="开心-https://example.com/happy.jpg&#10;难过-https://example.com/sad.png"
              className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none outline-none font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[14px] text-[#333] mb-4 h-[150px] resize-y"
            />

            {/* 导入结果 */}
            {batchImportResult && (
              <div className="bg-[#f9f9f9] rounded-xl p-4 mb-4">
                <div className="flex gap-4 mb-2">
                  <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#88A588]">
                    成功: {batchImportResult.success}
                  </p>
                  <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#ff3b30]">
                    失败: {batchImportResult.failed}
                  </p>
                </div>
                {batchImportResult.errors.length > 0 && (
                  <div className="max-h-[120px] overflow-y-auto">
                    <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[13px] text-[#666] mb-1">
                      错误详情：
                    </p>
                    <ul className="space-y-1">
                      {batchImportResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[12px] text-[#ff3b30] leading-relaxed">
                          • {error}
                        </li>
                      ))}
                      {batchImportResult.errors.length > 5 && (
                        <li className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[12px] text-[#999]">
                          ... 还有 {batchImportResult.errors.length - 5} 个错误
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelBatchImport}
                disabled={isBatchImporting}
                className="flex-1 py-2.5 rounded-xl bg-[#f0f0f0] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-[#666] hover:bg-[#e8e8e8] active:bg-[#e0e0e0] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleBatchImport}
                disabled={isBatchImporting}
                className="flex-1 py-2.5 rounded-xl bg-[#88A588] font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] text-white hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isBatchImporting ? '导入中...' : '开始导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {errorToast.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1300] px-4 w-full max-w-[90vw]">
          <div className="bg-[#ff3b30] rounded-[12px] px-5 py-4 shadow-lg max-w-md mx-auto max-h-[60vh] overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-white mb-1">
                  操作失败
                </p>
                <p className="font-['Source_Han_Sans_CN_VF:Regular',sans-serif] text-[13px] text-white/90 leading-relaxed break-words whitespace-pre-wrap">
                  {errorToast.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}