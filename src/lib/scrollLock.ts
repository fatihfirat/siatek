/**
 * Tek otoriteli sayfa kaydırma kilidi.
 *
 * NEDEN position:fixed, neden body.overflow DEĞİL?
 * `src/index.css` içindeki `html { overflow-x: hidden }` kuralı kök elemanın
 * hesaplanan overflow'unu `visible` olmaktan çıkarıyordu. CSS Overflow L3'e göre
 * bu durumda `body`'nin overflow'u viewport'a AKTARILMAZ; scroller `html` olur.
 * Sonuç: `document.body.style.overflow = 'hidden'` hiçbir şeyi kilitlemiyordu.
 * (18.09.2026 canlı ölçüm: modal açıkken arka plan 0 → 400px kaydı.)
 * O kural kaldırıldı; ayrıca iOS Safari'de body overflow dokunmatik kaydırmayı
 * zaten güvenilir biçimde durdurmaz. Bu yüzden kilit `position: fixed` +
 * scroll pozisyonu saklama/geri yükleme ile yapılıyor.
 *
 * KURAL: Bu modülün DIŞINDA hiçbir yerde kaydırma amacıyla
 * document.body.style'a dokunulmaz.
 */

let lockCount = 0;
let savedScrollY = 0;

let saved: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
  paddingRight: string;
  overscrollBehavior: string;
} | null = null;

const isBrowser = typeof document !== 'undefined';

function applyLock() {
  const body = document.body;
  savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;

  saved = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
    overscrollBehavior: body.style.overscrollBehavior,
  };

  // Masaüstünde scrollbar kaybından doğan yatay sıçramayı telafi et.
  // Mobilde overlay scrollbar olduğu için bu 0'dır, zararsız.
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  body.dataset.scrollLocked = 'true';
}

function releaseLock() {
  const body = document.body;
  if (!saved) return;

  body.style.position = saved.position;
  body.style.top = saved.top;
  body.style.left = saved.left;
  body.style.right = saved.right;
  body.style.width = saved.width;
  body.style.overflow = saved.overflow;
  body.style.paddingRight = saved.paddingRight;
  body.style.overscrollBehavior = saved.overscrollBehavior;

  delete body.dataset.scrollLocked;
  saved = null;

  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
}

/**
 * Kilidi bir referans artırır. Dönen bırakma fonksiyonu idempotenttir:
 * iki kez çağrılsa bile sayaç bozulmaz (React StrictMode çift-invoke güvenli).
 */
export function acquireScrollLock(): () => void {
  if (!isBrowser) return () => {};

  let released = false;
  lockCount++;
  if (lockCount === 1) applyLock();

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) releaseLock();
  };
}

/** Teşhis amaçlı. */
export function getScrollLockCount(): number {
  return lockCount;
}

/**
 * Acil kurtarma vanası. Beklenmedik bir hata temizliği atlarsa sayfanın
 * kalıcı donmasını engeller. Hata sınırından veya rota değişiminde çağrılabilir.
 */
export function forceReleaseScrollLock(): void {
  if (!isBrowser) return;
  lockCount = 0;
  releaseLock();
}
