/**
 * ImagePicker 组件 - 图片选择和压缩
 */

import { useRef } from 'react';
import { compressImage } from '../utils/imageCompression';
import { saveImage } from '../utils/imageDB';

interface ImagePickerProps {
  onImageSelect: (imageKey: string) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
}

export default function ImagePicker({ onImageSelect, onError, children }: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      onError('请选择图片文件');
      return;
    }

    // 检查文件大小 (限制10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('图片大小不能超过10MB');
      return;
    }

    try {
      // 压缩图片
      const compressedBlob = await compressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85
      });

      // 转换为File对象
      const compressedFile = new File([compressedBlob], file.name, { type: compressedBlob.type });
      
      // 生成唯一的图片key
      const imageKey = `chat-image-${Date.now()}`;
      
      // 保存到ImageDB（会自动分类到chat_images）
      await saveImage(imageKey, compressedFile);

      onImageSelect(imageKey);
    } catch (error: any) {
      console.error('Failed to compress image:', error);
      onError(error.message || '图片处理失败');
    } finally {
      // 重置input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}