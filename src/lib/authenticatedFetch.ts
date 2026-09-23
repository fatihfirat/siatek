import { getStoredToken } from './auth';

// Apply session token to existing REST callers without changing their request bodies.
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const urlStr = input instanceof Request ? input.url : String(input);
      const isApi = urlStr.startsWith('/api/') || 
        urlStr.startsWith(`${window.location.origin}/api/`) ||
        urlStr.includes('/api/');

      if (!isApi) return nativeFetch(input, init);
      const token = getStoredToken();
      if (!token) return nativeFetch(input, init);

      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      }
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return nativeFetch(input, { ...init, headers });
    } catch {
      return nativeFetch(input, init);
    }
  };
}

