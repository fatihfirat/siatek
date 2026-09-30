import { getStoredToken } from './auth';

// Render'daki API sunucusunun adresi (build zamanında belirlenir).
// Geliştirmede boş → göreceli yol (/api/...) → aynı sunucu.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

// Apply session token to existing REST callers without changing their request bodies.
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const urlStr = input instanceof Request ? input.url : String(input);
      const isRelativeApi = urlStr.startsWith('/api/');
      const isApi = isRelativeApi ||
        urlStr.startsWith(`${window.location.origin}/api/`) ||
        urlStr.includes('/api/');

      if (!isApi) return nativeFetch(input, init);

      // Göreceli /api/... → Render'daki tam URL'e çevir
      const resolvedUrl = isRelativeApi && API_BASE
        ? `${API_BASE}${urlStr}`
        : urlStr;

      const token = getStoredToken();
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      }
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return nativeFetch(resolvedUrl, { ...init, headers });
    } catch {
      return nativeFetch(input, init);
    }
  };
}
