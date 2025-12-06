import { useEffect } from 'react';
import iconImage from 'figma:asset/5f8732ee23725e4e0895553baa1c8e03e361ca7a.png';

export default function PWAIconGenerator() {
  useEffect(() => {
    const generateIcons = async () => {
      try {
        // 加载图片
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = iconImage;
        });

        // 生成不同尺寸的图标
        const sizes = [192, 512];
        const iconData: { [key: number]: string } = {};
        
        for (const size of sizes) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // 绘制白色背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            
            // 计算图片绘制位置以保持居中和正确的缩放
            const scale = Math.min(size / img.width, size / img.height) * 0.9; // 稍微缩小一点留边距
            const x = (size - img.width * scale) / 2;
            const y = (size - img.height * scale) / 2;
            
            // 绘制图片
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            
            // 转换为base64
            const dataUrl = canvas.toDataURL('image/png');
            iconData[size] = dataUrl;
            
            // 更新favicon和apple-touch-icon
            if (size === 192) {
              // 更新favicon
              let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
              if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
              }
              favicon.href = dataUrl;
              
              // 更新apple-touch-icon
              let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
              if (!appleTouchIcon) {
                appleTouchIcon = document.createElement('link');
                appleTouchIcon.rel = 'apple-touch-icon';
                document.head.appendChild(appleTouchIcon);
              }
              appleTouchIcon.href = dataUrl;
            }
          }
        }
        
        // 动态更新manifest
        updateManifest(iconData);
        
      } catch (error) {
        console.error('生成PWA图标失败:', error);
      }
    };
    
    generateIcons();
  }, []);
  
  return null;
}

function updateManifest(iconData: { [key: number]: string }) {
  // 创建动态manifest
  const manifest = {
    name: 'Touken OS',
    short_name: 'Touken OS',
    description: '刀剑乱舞模拟手机桌面系统',
    start_url: window.location.origin + '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: iconData[192] || '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: iconData[192] || '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: iconData[512] || '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: iconData[512] || '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    categories: ['entertainment', 'lifestyle'],
    lang: 'zh-CN',
    dir: 'ltr'
  };
  
  // 将manifest转换为blob URL
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const manifestURL = URL.createObjectURL(manifestBlob);
  
  // 更新manifest link
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestURL;
}