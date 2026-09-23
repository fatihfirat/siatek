import { useEffect, useRef } from 'react';
import { acquireScrollLock } from '../lib/scrollLock';

interface UseModalBehaviorOptions {
  lockScroll?: boolean;
  closeOnEsc?: boolean;
}

/**
 * Modal diyaloglar için standart davranış:
 * - Sayfa kaydırmasını kilitler (iç içe modallar için sayaçlı, tek otoriteli)
 * - Escape ile kapanır
 *
 * ÖNEMLİ DEĞİŞİKLİK (18.09.2026):
 * Kilit artık `document.body.style.overflow` ile değil, `src/lib/scrollLock.ts`
 * üzerinden yapılıyor. Eski yöntem ölçüldü ve HİÇ ÇALIŞMIYORDU:
 * `html { overflow-x: hidden }` yüzünden body'nin overflow'u viewport'a
 * aktarılmıyordu (bkz. scrollLock.ts açıklaması).
 *
 * Ayrıca `onClose` artık effect bağımlılığı DEĞİL. Çağrı yerlerinin çoğu
 * inline arrow fonksiyon veriyor (`onClose={() => setX(false)}`); bu her
 * render'da yeni referans üretip effect'i söküp taktığı için kilit bir kare
 * boyunca açılıp kapanıyordu. Artık ref üzerinden okunuyor.
 */
export function useModalBehavior(
  isOpen: boolean,
  onClose: () => void,
  options: UseModalBehaviorOptions = {}
) {
  const { lockScroll = true, closeOnEsc = true } = options;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const releaseScroll = lockScroll ? acquireScrollLock() : null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseScroll?.();
    };
    // onClose KASITLI olarak bağımlılık değil; ref üzerinden okunuyor.
  }, [isOpen, lockScroll, closeOnEsc]);
}

export default useModalBehavior;
