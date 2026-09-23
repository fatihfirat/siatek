import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="bg-emerald-600/95 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top">
        <Wifi className="w-4 h-4 text-emerald-200 animate-pulse" />
        <span>İnternet bağlantısı sağlandı. Çevrimdışı veriler eşitleniyor...</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-600/95 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between gap-2 shadow-lg border-b border-amber-500/30">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-200 animate-bounce" />
        <span>
          <strong>Saha Çevrimdışı Modu:</strong> Bağlantı kesildi. İşlemleriniz yerel önbellekte saklanır, bağlantı geldiğinde sunucuya aktarılır.
        </span>
      </div>
      <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-black/20 text-[10px] tracking-wider uppercase font-semibold">
        Offline-First
      </span>
    </div>
  );
};
