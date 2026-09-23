import React, { useState, useEffect, useRef } from 'react';
import { CATEGORY_TOKENS } from '../../theme/tokens';
import { Flashlight, Keyboard, History, X, ArrowRight } from 'lucide-react';

export interface FloatingScannerButtonProps {
  onClick: (originRect?: DOMRect) => void;
  onManualInput?: () => void;
  onToggleTorch?: () => void;
  onOpenHistory?: () => void;
  wmsScannedCount?: number;
  isWmsMode?: boolean;
  torchActive?: boolean;
  recentScans?: Array<{ barcode: string; name?: string; timestamp: Date | string }>;
  className?: string;
  ariaLabel?: string;
}

/**
 * Custom Viewfinder + Thin Barcode Motif SVG Icon
 * Replaces plain camera icon with corner brackets and barcode lines
 * to convey instant, tactile barcode/QR scanning meaning.
 */
export function BarcodeViewfinderIcon({ className = 'w-6 h-6', ariaHidden = true }: { className?: string; ariaHidden?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 4 Corner Viewfinder Brackets */}
      {/* Top-Left Bracket */}
      <path d="M3 8V5a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2.2" />
      {/* Top-Right Bracket */}
      <path d="M16 3h3a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="2.2" />
      {/* Bottom-Left Bracket */}
      <path d="M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="2.2" />
      {/* Bottom-Right Bracket */}
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2.2" />

      {/* Center Thin Barcode Stripes */}
      <path d="M7 8.5v7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 8.5v7" stroke="currentColor" strokeWidth="2.2" />
      <path d="M13 8.5v7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M15.5 8.5v7" stroke="currentColor" strokeWidth="2" />
      <path d="M17.5 8.5v7" stroke="currentColor" strokeWidth="1.2" />

      {/* Subtle Laser / Scan Beam indicator across barcode center */}
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeDasharray="1.5 2"
        opacity="0.9"
      />
    </svg>
  );
}

export default function FloatingScannerButton({
  onClick,
  onManualInput,
  onToggleTorch,
  onOpenHistory,
  wmsScannedCount = 0,
  isWmsMode = false,
  torchActive = false,
  recentScans = [],
  className = '',
  ariaLabel = 'Barkod ve QR Tarayıcıyı Aç',
}: FloatingScannerButtonProps) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  // Detect virtual keyboard on mobile/tablet to avoid overlapping or jumping
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        setIsKeyboardVisible(true);
      }
    };

    const handleBlur = () => {
      setIsKeyboardVisible(false);
    };

    // Also monitor visualViewport height changes (reliable on modern mobile browsers)
    const viewport = window.visualViewport;
    const handleResize = () => {
      if (viewport) {
        // If viewport height dropped by more than 150px from window.innerHeight, keyboard is active
        const isShrunk = window.innerHeight - viewport.height > 150;
        setIsKeyboardVisible(isShrunk);
      }
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    if (viewport) {
      viewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
      if (viewport) {
        viewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Handle ripple effect on press
  const createRipple = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev.slice(-2), { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  // Long press detection for quick actions menu (torch, manual input, recent scans)
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    createRipple(e);
    isLongPressActive.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setShowQuickMenu(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }
    }, 480);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    isLongPressActive.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setShowQuickMenu(true);
    }, 480);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    onClick(rect);
  };

  // Close quick menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showQuickMenu &&
        buttonRef.current &&
        !buttonRef.current.parentElement?.contains(e.target as Node)
      ) {
        setShowQuickMenu(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [showQuickMenu]);

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ease-out select-none ${
        isKeyboardVisible ? 'opacity-0 pointer-events-none translate-y-6 scale-90' : 'opacity-100'
      } ${className}`}
      style={{
        // Responsive thumb zone: sits safely above mobile bottom bar (~72px + safe-area)
        bottom: 'max(calc(var(--shell-nav-space, 72px) + 16px), 24px)',
        right: 'max(16px, env(safe-area-inset-right, 16px))',
      }}
    >
      {/* Quick Actions Contextual Menu (Long Press) */}
      {showQuickMenu && (
        <div
          role="dialog"
          aria-label="Hızlı Tarayıcı Menüsü"
          className="absolute bottom-16 right-0 mb-2 w-64 p-2.5 rounded-2xl bg-base-surface border border-border-strong shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 origin-bottom-right space-y-1.5"
        >
          <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-text-muted border-b border-border">
            <span className="flex items-center space-x-1.5 text-text-primary">
              <BarcodeViewfinderIcon className="w-4 h-4 text-category-inventory" />
              <span>Hızlı Tarama Araçları</span>
            </span>
            <button
              onClick={() => setShowQuickMenu(false)}
              className="p-1 rounded-md hover:bg-base-surface-2 text-text-secondary cursor-pointer"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 1: Torch Toggle */}
          {onToggleTorch && (
            <button
              type="button"
              onClick={() => {
                onToggleTorch();
                setShowQuickMenu(false);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-base-surface-2 active:bg-category-inventory-bg transition-colors cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <Flashlight className={`w-4 h-4 ${torchActive ? 'text-warning-text animate-pulse' : 'text-text-secondary'}`} />
                <span>{torchActive ? 'Feneri Kapat' : 'Feneri / Flaşı Aç'}</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${torchActive ? 'bg-bg-warning text-warning-text' : 'bg-base-surface-2 text-text-muted'}`}>
                {torchActive ? 'AÇIK' : 'KAPALI'}
              </span>
            </button>
          )}

          {/* Action 2: Manual Barcode / SKU Input */}
          {onManualInput && (
            <button
              type="button"
              onClick={() => {
                onManualInput();
                setShowQuickMenu(false);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-base-surface-2 active:bg-category-inventory-bg transition-colors cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <Keyboard className="w-4 h-4 text-category-inventory" />
                <span>Manuel Barkod Girişi</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
            </button>
          )}

          {/* Action 3: Recent Scans History */}
          {onOpenHistory && (
            <button
              type="button"
              onClick={() => {
                onOpenHistory();
                setShowQuickMenu(false);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-base-surface-2 active:bg-category-inventory-bg transition-colors cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <History className="w-4 h-4 text-info-text" />
                <span>Son Taramalar Geçmişi</span>
              </span>
              {recentScans.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-info text-info-text font-mono font-bold">
                  {recentScans.length}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Main Floating Action Button (FAB) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        aria-label={ariaLabel}
        title="Barkod ve QR Tarayıcı (Uzun basış: Hızlı Menü)"
        className={`relative group flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 rounded-full text-white cursor-pointer overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-[#2D7B31]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base transition-transform active:scale-[0.95] duration-150 motion-reduce:transition-none motion-reduce:animate-none ${
          // Idle breathing pulse animation: 3.5s duration, disabled under prefers-reduced-motion
          'fab-idle-breathing'
        }`}
        style={{
          // Token-consistent categoryInventory Alpha Green (#2D7B31) with high-end multi-stop gradient & depth
          background: 'linear-gradient(145deg, #38933D 0%, #2D7B31 52%, #226126 100%)',
          boxShadow: `
            inset 0 1px 1.5px rgba(255, 255, 255, 0.42),
            inset 0 -2px 4px rgba(0, 0, 0, 0.28),
            0 8px 24px -4px rgba(45, 123, 49, 0.52),
            0 4px 10px -2px rgba(0, 0, 0, 0.28)
          `,
        }}
      >
        {/* Subtle radial sheen layer */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full pointer-events-none opacity-40 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.45)_0%,transparent_60%)]"
        />

        {/* Bounded ink ripple feedback inside circular boundary */}
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none bg-white/35 animate-fab-ripple"
            style={{
              left: r.x,
              top: r.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {/* Custom Viewfinder & Barcode Motif Icon */}
        <div className="relative z-10 flex items-center justify-center transform transition-transform duration-200 group-hover:scale-110">
          <BarcodeViewfinderIcon className="w-7 h-7 sm:w-7.5 sm:h-7.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Contextual Badge (e.g. WMS Picking Scanned Count) */}
        {(isWmsMode || wmsScannedCount > 0) && (
          <span
            aria-label={`WMS taranan ürün: ${wmsScannedCount}`}
            className="absolute -top-1 -right-1 z-20 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-warning-fill text-white font-mono text-[11px] font-black border-2 border-base shadow-md animate-in zoom-in-50 duration-200"
            title={`Bu oturumda taranan: ${wmsScannedCount} ürün`}
          >
            {wmsScannedCount > 99 ? '99+' : wmsScannedCount}
          </span>
        )}
      </button>

      {/* Embedded CSS for 3.5s Idle Breathing & Ripple */}
      <style>{`
        @keyframes fabBreathing {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 0px rgba(45, 123, 49, 0));
          }
          50% {
            transform: scale(1.038);
            filter: drop-shadow(0 0 10px rgba(45, 123, 49, 0.55));
          }
        }

        @keyframes fabRipple {
          0% {
            width: 0px;
            height: 0px;
            opacity: 0.6;
          }
          100% {
            width: 140px;
            height: 140px;
            opacity: 0;
          }
        }

        .fab-idle-breathing {
          animation: fabBreathing 3.5s ease-in-out infinite;
        }

        .animate-fab-ripple {
          animation: fabRipple 0.55s ease-out forwards;
        }

        /* prefers-reduced-motion support to disable idle breathing */
        @media (prefers-reduced-motion: reduce) {
          .fab-idle-breathing {
            animation: none !important;
            transform: none !important;
            filter: none !important;
          }
          .animate-fab-ripple {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
