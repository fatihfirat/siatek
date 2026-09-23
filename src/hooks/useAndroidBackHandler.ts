import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface BackHandlerOptions {
  activeModalCount?: number;
  closeActiveModal?: () => boolean | void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  onExitApp?: () => void;
}

/**
 * Android Donanım Geri Tuşu Yönetim Hook'u.
 * Modal açıksa modalı kapatır, değilse sekmeler arası geri gider, en son çıkış yapar.
 */
export function useAndroidBackHandler(options: BackHandlerOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastBackPressTime = useRef(0);

  useEffect(() => {
    // Sadece Android veya Capacitor ortamında dinle
    if (!Capacitor.isNativePlatform() && !navigator.userAgent.includes('Android')) {
      return;
    }

    let removeListener: (() => void) | null = null;

    // Capacitor App eklentisini dinamik olarak dinlemeye çalış
    const setupCapacitorListener = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cap = (window as any).Capacitor;
        if (cap && cap.Plugins && cap.Plugins.App) {
          const handler = await cap.Plugins.App.addListener('backButton', (data: { canGoBack: boolean }) => {
            handleBack(data.canGoBack);
          });
          removeListener = () => handler.remove();
        }
      } catch {
        // Plugin bulunamadıysa web popstate dinleyicisi çalışacaktır
      }
    };

    const handleBack = (systemCanGoBack?: boolean) => {
      const current = optionsRef.current;

      // 1. Öncelik: Açık bir modal varsa kapat
      if (current.activeModalCount && current.activeModalCount > 0) {
        if (current.closeActiveModal) {
          current.closeActiveModal();
          return;
        }
      }

      // 2. Öncelik: Sekmeler veya ekranlar arasında geri gidebiliyorsa geri git
      if (current.canGoBack && current.onGoBack) {
        current.onGoBack();
        return;
      }

      // 3. Öncelik: Ana ekrandaysa çift basışla çıkış bildirimi
      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        if (current.onExitApp) {
          current.onExitApp();
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cap = (window as any).Capacitor;
          if (cap?.Plugins?.App?.exitApp) {
            cap.Plugins.App.exitApp();
          }
        }
      } else {
        lastBackPressTime.current = now;
        // Kullanıcıya küçük bir toast bildirimi gösterilebilir
        console.info('[Android] Çıkmak için tekrar basın');
      }
    };

    // Web / Tarayıcı popstate yedek dinleyicisi
    const onPopState = () => {
      handleBack();
    };

    window.addEventListener('popstate', onPopState);
    setupCapacitorListener();

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (removeListener) {
        removeListener();
      }
    };
  }, []);
}
