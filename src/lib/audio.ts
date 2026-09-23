/**
 * Web Audio API synthesized notification chimes & Web Push manager
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a custom synthesized audio chime
 */
export function playNotificationSound(type: 'order' | 'quote' | 'status' | 'success' | 'alert' = 'order') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    if (type === 'order' || type === 'success') {
      // Harmonic pleasant double chime (C6 -> G6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(1046.5, now); // C6
      osc1.frequency.setValueAtTime(1567.98, now + 0.12); // G6

      osc2.frequency.setValueAtTime(1318.51, now + 0.05); // E6
      osc2.frequency.setValueAtTime(2093.0, now + 0.15); // C7

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);

    } else if (type === 'quote') {
      // Triplet ascending chime (E5 -> A5 -> E6)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880.0, now + 0.08);
      osc.frequency.setValueAtTime(1318.51, now + 0.16);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.45);

    } else if (type === 'status') {
      // Smooth modern ping
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880.0, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.35);

    } else if (type === 'alert') {
      // Warning double blip
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440.0, now);
      osc.frequency.setValueAtTime(349.23, now + 0.1);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.debug('Audio play failed or not permitted yet', err);
  }
}

/**
 * Trigger a native Web Push Browser Notification if permission is granted
 */
export async function triggerBrowserNotification(
  title: string, 
  body: string, 
  data?: { type?: string; referenceId?: string; referenceType?: string }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data?.referenceId || 'order-system-notification',
        data,
      });

      notif.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('app_notification_click', { detail: data }));
        try {
          notif.close();
        } catch {}
      };

      return true;
    } catch (e) {
      console.warn('Native notification spawn failed:', e);
    }
  }
  return false;
}

export const showBrowserNotification = triggerBrowserNotification;

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }

    // Support both modern Promise API and older callback API
    if (typeof Notification.requestPermission === 'function') {
      const promise = Notification.requestPermission();
      if (promise && typeof promise.then === 'function') {
        const result = await promise;
        return result || Notification.permission;
      }
      // Fallback callback style
      return new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((result) => {
          resolve(result || Notification.permission);
        });
      });
    }
    return Notification.permission;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return Notification.permission || 'denied';
  }
}
