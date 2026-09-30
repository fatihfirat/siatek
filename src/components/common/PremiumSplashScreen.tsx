import React, { useEffect, useState } from 'react';

interface PremiumSplashScreenProps {
  message?: string;
  subMessage?: string;
}

export const PremiumSplashScreen: React.FC<PremiumSplashScreenProps> = ({
  message = 'GÜVENLİ OTURUM DOĞRULANIYOR',
  subMessage = 'ALPHA TEKNİK • B2B & SAHA OPERASYON PORTALI',
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = [
      { target: 30, delay: 200 },
      { target: 60, delay: 600 },
      { target: 85, delay: 400 },
      { target: 95, delay: 800 },
    ];

    let timeout: ReturnType<typeof setTimeout>;
    let current = 0;

    const run = () => {
      if (current >= steps.length) return;
      const { target, delay } = steps[current];
      timeout = setTimeout(() => {
        setProgress(target);
        current++;
        run();
      }, delay);
    };

    run();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <main
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between select-none overflow-hidden"
      style={{ background: '#070D18' }}
      role="status"
      aria-busy="true"
      aria-label="Oturum doğrulanıyor"
    >
      {/* ── Arka plan: tek, derin emerald ambient ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -58%)',
          width: 640,
          height: 640,
          background:
            'radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 45%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* ── İnce yatay çizgi deseni ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #94a3b8 0px, #94a3b8 1px, transparent 1px, transparent 48px)',
        }}
      />

      {/* ── Üst etiket ── */}
      <div className="relative z-10 pt-10 flex items-center gap-2.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
          style={{ boxShadow: '0 0 6px 2px rgba(16,185,129,0.6)', animation: 'pulse 2s infinite' }}
        />
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: '#64748b',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        >
          SIATEK ENTERPRISE SUITE
        </span>
      </div>

      {/* ── Merkez ── */}
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-xs px-6">

        {/* Logo kartı */}
        <div className="relative">
          {/* Halo: sadece emerald */}
          <div
            className="absolute -inset-6 rounded-[28px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(16,185,129,0.18) 0%, transparent 70%)',
              filter: 'blur(16px)',
            }}
          />

          {/* Kart */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(148,163,184,0.10)',
              borderRadius: 20,
              padding: '28px 40px',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
              minWidth: 240,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            {/* Logo — beyaz zemin üstünde orijinal marka renkleri */}
            <div
              style={{
                background: 'rgba(255,255,255,0.96)',
                borderRadius: 12,
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/branding/siatek-logo-horizontal.png"
                alt="Siatek by Alpha Teknik"
                style={{ height: 48, width: 'auto', objectFit: 'contain' }}
              />
            </div>

            {/* İnce ayraç */}
            <div
              style={{
                width: '100%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.15), transparent)',
                marginTop: 20,
                marginBottom: 16,
              }}
            />

            {/* Mini durum satırı */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px rgba(16,185,129,0.8)',
                  flexShrink: 0,
                  animation: 'pulse 1.8s infinite',
                }}
              />
              <span
                style={{
                  fontSize: 9.5,
                  color: '#10b981',
                  letterSpacing: '0.18em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}
              >
                BAĞLANTI GÜVENLİ
              </span>
            </div>
          </div>
        </div>

        {/* Progress + metin */}
        <div className="w-full space-y-3">
          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 2,
              background: 'rgba(30,41,59,0.9)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #059669, #10b981)',
                borderRadius: 99,
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 8px rgba(16,185,129,0.5)',
              }}
            />
          </div>

          <div className="text-center space-y-1">
            <p
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: '#e2e8f0',
                textTransform: 'uppercase',
              }}
            >
              {message}
            </p>
            <p
              style={{
                fontSize: 10,
                color: '#475569',
                letterSpacing: '0.06em',
                fontWeight: 500,
              }}
            >
              {subMessage}
            </p>
          </div>
        </div>
      </div>

      {/* ── Alt copyright ── */}
      <div
        className="relative z-10 pb-8 text-center"
        style={{
          fontSize: 9,
          color: '#334155',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontFamily: 'monospace',
        }}
      >
        © 2026 ALPHA TEKNİK DOĞALGAZ & TESİSAT • v1.0.0
      </div>
    </main>
  );
};

export default PremiumSplashScreen;
