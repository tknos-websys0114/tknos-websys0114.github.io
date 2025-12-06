import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检测是否是 iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 检测是否已经是独立模式（已安装）
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // 监听 beforeinstallprompt 事件（Android Chrome）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 检查用户是否已经关闭过提示
      const hasClosedPrompt = localStorage.getItem('pwa-install-prompt-closed');
      if (!hasClosedPrompt && !standalone) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS 设备显示安装提示（如果未安装）
    if (iOS && !standalone) {
      const hasClosedIOSPrompt = localStorage.getItem('pwa-install-ios-prompt-closed');
      if (!hasClosedIOSPrompt) {
        setShowInstallPrompt(true);
      }
    }

    // 监听 appinstalled 事件
    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-prompt-closed');
      localStorage.removeItem('pwa-install-ios-prompt-closed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('用户接受了安装');
    } else {
      console.log('用户拒绝了安装');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleClose = () => {
    setShowInstallPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa-install-ios-prompt-closed', 'true');
    } else {
      localStorage.setItem('pwa-install-prompt-closed', 'true');
    }
  };

  // 如果已经是独立模式，不显示任何提示
  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  // iOS 安装提示
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50 animate-slide-up">
        <div className="max-w-[420px] mx-auto p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-black mb-2">
                安装 Touken OS 到主屏幕
              </h3>
              <div className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-[#666] space-y-1">
                <p className="flex items-center gap-1">
                  点击 <Share className="w-4 h-4 inline" /> 分享按钮
                </p>
                <p>然后选择"添加到主屏幕"</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/桌面 安装提示
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50 animate-slide-up">
      <div className="max-w-[420px] mx-auto p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[15px] text-black mb-1">
              安装 Touken OS
            </h3>
            <p className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[13px] text-[#666]">
              添加到主屏幕以获得完整体验
            </p>
          </div>
          <button
            onClick={handleInstallClick}
            className="bg-black text-white px-4 py-2 rounded-lg font-['Source_Han_Sans_CN_VF:Medium',sans-serif] text-[14px] flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            安装
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
