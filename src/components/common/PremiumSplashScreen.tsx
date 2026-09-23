import React from 'react';

interface PremiumSplashScreenProps {
  message?: string;
  subMessage?: string;
}

export const PremiumSplashScreen: React.FC<PremiumSplashScreenProps> = ({
  message = 'GÜVENLİ OTURUM DOĞRULANIYOR',
  subMessage = 'ALPHA TEKNİK • B2B & SAHA OPERASYON PORTALI',
}) => {
  return (
    <main
      className="fixed inset-0 z-[9999] bg-[#0A101D] text-slate-100 flex flex-col items-center justify-between p-8 overflow-hidden select-none"
      role="status"
      aria-busy="true"
      aria-label="Oturum doğrulanıyor"
    >
      {/* Arka plan Lüks Işık Efektleri (Ambient Glow) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-sky-600/15 via-emerald-600/10 to-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Üst Marka Başlık Bilgisi */}
      <div className="relative z-10 pt-4 flex items-center gap-2 text-xs tracking-widest text-slate-400 font-semibold uppercase">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>SIATEK ENTERPRISE SUITE</span>
      </div>

      {/* Orta Logo ve Yükleme Kartı */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full mx-auto my-auto text-center space-y-8">
        {/* Logo Kutusu ve Cam Efekti (Glassmorphism) */}
        <div className="relative group">
          {/* Logo arkası yumuşak halo */}
          <div className="absolute -inset-4 bg-gradient-to-r from-sky-500/20 via-emerald-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-80 group-hover:opacity-100 transition duration-1000 animate-pulse" />

          <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center min-w-[260px]">
            <img
              src="/branding/siatek-logo-horizontal.png"
              alt="Siatek by Alpha Teknik"
              className="h-16 w-auto object-contain drop-shadow-md animate-fade-in"
            />
          </div>
        </div>

        {/* Yükleme ve Durum Göstergesi */}
        <div className="w-full space-y-3">
          {/* Minimalist Akıcı İlerleme Çubuğu */}
          <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden p-0.5 border border-slate-700/50">
            <div className="bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 h-full rounded-full animate-[shimmer_1.5s_infinite_linear] bg-[length:200%_100%]" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              {message}
            </p>
            <p className="text-[11px] text-slate-400 tracking-normal font-medium">
              {subMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Alt Telif ve Sürüm Detayı */}
      <div className="relative z-10 pb-2 text-center text-[10px] text-slate-500 tracking-wider uppercase font-mono">
        © 2026 ALPHA TEKNİK DOĞALGAZ & TESİSAT • v1.0.0
      </div>
    </main>
  );
};

export default PremiumSplashScreen;
