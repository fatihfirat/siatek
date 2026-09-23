import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare, Check } from 'lucide-react';
import { Haptics } from '../../utils/haptics';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone PWA window
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Capture Chromium/Brave/Android install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Auto-show banner after 4 seconds if not dismissed previously
      const dismissed = localStorage.getItem('siatek_pwa_dismissed');
      if (!dismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 4000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowPrompt(false);
      setInstalled(true);
      Haptics.notification('success');
    };

    // Custom trigger from Header or Settings
    const handleManualTrigger = () => {
      if (isAppleDevice) {
        setShowIOSGuide(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('siatek:trigger-install-prompt', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('siatek:trigger-install-prompt', handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    Haptics.impact();
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      } else {
        alert("Brave veya tarayıcınızın adres çubuğundaki (URL) 'Uygulamayı Yükle' simgesine tıklayarak doğrudan cihazınıza kurabilirsiniz.");
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA prompt error:', err);
    }
  };

  const handleDismiss = () => {
    Haptics.tap();
    setShowPrompt(false);
    localStorage.setItem('siatek_pwa_dismissed', 'true');
  };

  if (isStandalone || installed) return null;

  return (
    <>
      {/* Floating Bottom PWA Banner */}
      {showPrompt && (
        <aside 
          aria-label="Uygulama yükleme bildirimi"
          className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-[#101726]/95 backdrop-blur-md border border-blue-500/30 text-white p-3.5 rounded-2xl shadow-2xl shadow-blue-950/50 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-white tracking-wide">
                  Siatek'i Uygulama Olarak İndirin
                </h4>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                  aria-label="Kapat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Brave, Chrome veya Safari tarayıcınızda adres çubuğu olmadan tam ekran yerel uygulama konforunda çalışın.
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Uygulamayı Yükle
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Daha Sonra
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Safari Guided Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#151E2E] border border-slate-700 text-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span>iPhone / iPad'e Yükle</span>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apple Safari veya Brave tarayıcınızda Siatek'i ana ekranınıza eklemek için şu adımları izleyin:
            </p>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <span>1. Tarayıcınızın altındaki <strong>Paylaş</strong> simgesine dokunun.</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <span>2. Menüden <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
};
