import React, { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, Info, ArrowRight, X } from 'lucide-react';

interface AnnouncementBannerProps {
  banner?: {
    enabled: boolean;
    text: string;
    link?: string;
    tone?: 'info' | 'warning' | 'success' | 'brand';
  };
}

export default function AnnouncementBanner({ banner }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!banner || !banner.enabled || !banner.text?.trim() || dismissed) {
    return null;
  }

  const tone = banner.tone || 'brand';

  const toneClasses = {
    brand: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white',
    info: 'bg-info-fill text-white',
    warning: 'bg-amber-600 text-white',
    success: 'bg-emerald-700 text-white',
  }[tone];

  const Icon = {
    brand: Sparkles,
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle2,
  }[tone];

  return (
    <div
      role="region"
      aria-label="Şirket Duyurusu"
      className={`relative z-50 text-xs font-semibold px-3 sm:px-4 py-2 flex items-center justify-between shadow-xs transition-all ${toneClasses}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-1 text-center truncate pr-6">
        <Icon className="w-3.5 h-3.5 shrink-0 opacity-90 animate-pulse" aria-hidden="true" />
        <span className="truncate tracking-tight">{banner.text}</span>
        {banner.link && (
          <a
            href={banner.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity ml-1 shrink-0"
          >
            Detaylar <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Duyuruyu kapat"
        className="shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer text-white/90 hover:text-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
