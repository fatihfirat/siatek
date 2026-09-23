import { Capacitor } from '@capacitor/core';

/**
 * Android ve mobil tarayıcılar için dokunsal geri bildirim (Haptics/Vibration)
 */
export const Haptics = {
  /**
   * Kısa tıklama geri bildirimi (Butonlar, sepet eklemeleri)
   */
  tap: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // Sessizce yut
    }
  },

  /**
   * Başarılı işlem bildirimi (Barkod okundu, sipariş onaylandı, teklif kabul edildi)
   */
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 50, 40]);
      }
    } catch {
      // Sessizce yut
    }
  },

  /**
   * Hata veya uyarı geri bildirimi (Stok yetersiz, geçersiz barkod)
   */
  error: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    } catch {
      // Sessizce yut
    }
  },

  /**
   * Cihazın native Android/iOS olup olmadığını bildirir
   */
  isNative: () => {
    return Capacitor.isNativePlatform();
  },

  /**
   * Darbe / impact geri bildirimi (tap ile eşdeğer)
   */
  impact: (_style?: string) => {
    Haptics.tap();
  },

  /**
   * Bildirim geri bildirimi
   */
  notification: (type: 'success' | 'error' | 'warning' = 'success') => {
    if (type === 'error' || type === 'warning') {
      Haptics.error();
    } else {
      Haptics.success();
    }
  }
};
