import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Command, 
  ArrowRight, 
  Package, 
  FileText, 
  ShoppingBag, 
  Users, 
  Receipt, 
  BarChart3, 
  Activity, 
  Bug, 
  Sparkles, 
  Camera, 
  Moon, 
  Sun, 
  Bell, 
  ShieldCheck, 
  Plus, 
  RotateCcw,
  CornerDownLeft,
  X,
  Keyboard,
  Barcode,
  Tag
} from 'lucide-react';
import { Product, UserRole } from '../types';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { Haptics } from '../utils/haptics';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigateTab: (role: UserRole, tab: string) => void;
  onOpenNewQuote: () => void;
  onOpenBarcodeScanner: () => void;
  onOpenAI: () => void;
  onOpenNotifications: () => void;
  onOpenSecurity: () => void;
  onToggleTheme: () => void;
  onOpenShortcutsHelp: () => void;
  initialQuery?: string;
}

interface PaletteAction {
  id: string;
  category: 'Navigasyon' | 'İşlemler' | 'Görünüm & Sistem' | 'Ürünler';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  handler: () => void;
  badge?: string;
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  products,
  currentRole,
  onRoleChange,
  onNavigateTab,
  onOpenNewQuote,
  onOpenBarcodeScanner,
  onOpenAI,
  onOpenNotifications,
  onOpenSecurity,
  onToggleTheme,
  onOpenShortcutsHelp,
  initialQuery = ''
}: CommandPaletteModalProps) {
  useModalBehavior(isOpen, onClose);
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Built-in Global Action List
  const baseActions: PaletteAction[] = [
    // Fast Navigation Actions
    {
      id: 'switch_role',
      category: 'Navigasyon',
      title: currentRole === 'customer' ? "Yönetici Modu'na Geç" : "Müşteri Portalı'na Geç",
      subtitle: currentRole === 'customer' ? 'Yönetici sipariş & teklif masasına geçiş yap' : 'Müşteri katalog & teklif ekranına geçiş yap',
      icon: <CornerDownLeft className="w-4 h-4 text-accent-text" />,
      shortcut: 'Ctrl+P',
      handler: () => {
        onRoleChange(currentRole === 'customer' ? 'admin' : 'customer');
        onClose();
      }
    },
    {
      id: 'tab_products',
      category: 'Navigasyon',
      title: 'Stok & Fiyat Yönetim Masası (stok.pdf)',
      subtitle: 'Tüm ürünler, fiyat güncelleme, barkod basımı',
      icon: <Package className="w-4 h-4 text-success-text" />,
      shortcut: 'Ctrl+3',
      handler: () => {
        onNavigateTab('admin', 'products');
        onClose();
      }
    },
    {
      id: 'tab_orders',
      category: 'Navigasyon',
      title: 'Siparişler Masası',
      subtitle: 'Gelen siparişler, onaylama ve sevkiyat referans numarası girişi',
      icon: <ShoppingBag className="w-4 h-4 text-info-text" />,
      shortcut: 'Ctrl+1',
      handler: () => {
        onNavigateTab(currentRole, 'orders');
        onClose();
      }
    },
    {
      id: 'tab_quotes',
      category: 'Navigasyon',
      title: 'Teklifler Masası',
      subtitle: 'Gelen teklif talepleri, özel iskonto verme & PDF oluşturma',
      icon: <FileText className="w-4 h-4 text-warning-text" />,
      shortcut: 'Ctrl+2',
      handler: () => {
        onNavigateTab(currentRole, 'quotes');
        onClose();
      }
    },
    {
      id: 'tab_cariler',
      category: 'Navigasyon',
      title: 'Cari Hesaplar & Bakiye Takibi',
      subtitle: 'Müşteri hesap ekstreleri, borç/alacak ve ödeme kayıtları',
      icon: <Users className="w-4 h-4 text-accent-text" />,
      shortcut: 'Ctrl+4',
      handler: () => {
        onNavigateTab('admin', 'cariler');
        onClose();
      }
    },
    {
      id: 'tab_invoices',
      category: 'Navigasyon',
      title: 'E-Fatura & Maliye Masası',
      subtitle: 'GİB uyumlu e-Fatura / e-Arşiv listesi ve XML/UBL aktarımı',
      icon: <Receipt className="w-4 h-4 text-success-text" />,
      shortcut: 'Ctrl+5',
      handler: () => {
        onNavigateTab('admin', 'invoices');
        onClose();
      }
    },
    {
      id: 'tab_analytics',
      category: 'Navigasyon',
      title: 'Satış Analitiği & Raporlar',
      subtitle: 'Haftalık/aylık ciro, çok satanlar ve sipariş trend grafikleri',
      icon: <BarChart3 className="w-4 h-4 text-info-text" />,
      shortcut: 'Ctrl+6',
      handler: () => {
        onNavigateTab('admin', 'analytics');
        onClose();
      }
    },
    {
      id: 'tab_diagnostics',
      category: 'Navigasyon',
      title: 'Sistem & Canlı Hata Tanı Masası',
      subtitle: 'Websocket/SSE push durumu, veritabanı latency ve otomatik self-healing',
      icon: <Activity className="w-4 h-4 text-danger-text" />,
      shortcut: 'Ctrl+7',
      handler: () => {
        onNavigateTab('admin', 'diagnostics');
        onClose();
      }
    },

    // Fast Operational Actions
    {
      id: 'action_new_quote',
      category: 'İşlemler',
      title: 'Yeni Teklif Talebi / Teklif Masası Aç',
      subtitle: 'Hızlı sepet veya toptan teklif taslağı başlat',
      icon: <Plus className="w-4 h-4 text-success-text" />,
      shortcut: 'Ctrl+N',
      handler: () => {
        onOpenNewQuote();
        onClose();
      }
    },
    {
      id: 'action_camera_scanner',
      category: 'İşlemler',
      title: 'Kamera ile Canlı Barkod Oku',
      subtitle: 'Cihaz kamerasıyla Code-128 / EAN-13 / QR barkod tara ve işlem yap',
      icon: <Camera className="w-4 h-4 text-info-text" />,
      shortcut: 'Ctrl+B',
      handler: () => {
        onOpenBarcodeScanner();
        onClose();
      }
    },
    {
      id: 'action_notifications',
      category: 'İşlemler',
      title: 'Canlı Bildirimler Paneli',
      subtitle: 'Gerçek zamanlı SSE bildirim geçmişi ve alarmlar',
      icon: <Bell className="w-4 h-4 text-warning-text" />,
      shortcut: 'Ctrl+I',
      handler: () => {
        onOpenNotifications();
        onClose();
      }
    },

    // Appearance & System
    {
      id: 'system_theme',
      category: 'Görünüm & Sistem',
      title: 'Koyu / Açık Tema Değiştir',
      subtitle: 'Arayüz temasını anında gece/gündüz moduna geçir',
      icon: <Moon className="w-4 h-4 text-text-primary" />,
      shortcut: 'Ctrl+D',
      handler: () => {
        onToggleTheme();
        onClose();
      }
    },
    {
      id: 'system_security',
      category: 'Görünüm & Sistem',
      title: 'E2EE Kriptografi & Güvenlik Raporu',
      subtitle: 'AES-256-GCM / WebCrypto ve SHA-256 şifreleme parametrelerini incele',
      icon: <ShieldCheck className="w-4 h-4 text-success-text" />,
      handler: () => {
        onOpenSecurity();
        onClose();
      }
    },
    {
      id: 'system_shortcuts_help',
      category: 'Görünüm & Sistem',
      title: 'Klavye Kısayolları Rehberi (Cheat Sheet)',
      subtitle: 'Tüm sistem kısayollarını ve fonksiyon tuşlarını görüntüle',
      icon: <Keyboard className="w-4 h-4 text-accent-text" />,
      shortcut: '?',
      handler: () => {
        onOpenShortcutsHelp();
        onClose();
      }
    }
  ];

  // Dynamic Product Search Results
  const productActions: PaletteAction[] = (query.trim().length > 0)
    ? products
        .filter(p => {
          const q = query.toLowerCase().trim();
          return (
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            p.category.toLowerCase().includes(q) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(q))
          );
        })
        .slice(0, 8)
        .map(p => ({
          id: `product_${p.id}`,
          category: 'Ürünler',
          title: p.name,
          subtitle: `${p.sku} | Barkod: ${p.barcode || 'Yok'} | Stok: ${p.stock} ${p.unit} | Liste: ₺${p.price.toFixed(2)}`,
          icon: <Package className="w-4 h-4 text-success-text" />,
          badge: `₺${p.price.toFixed(2)}`,
          handler: () => {
            if (currentRole === 'admin') {
              onNavigateTab('admin', 'products');
            } else {
              onNavigateTab('customer', 'catalog');
            }
            onClose();
          }
        }))
    : [];

  // Filtered Actions
  const filteredActions = [
    ...baseActions.filter(a => {
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        (a.shortcut && a.shortcut.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      );
    }),
    ...productActions
  ];

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        Haptics.tap();
        filteredActions[selectedIndex].handler();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group actions by category for rendering
  const groupedActions: Record<string, PaletteAction[]> = {};
  filteredActions.forEach(action => {
    if (!groupedActions[action.category]) {
      groupedActions[action.category] = [];
    }
    groupedActions[action.category].push(action);
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="w-full max-w-2xl bg-base-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-border bg-base-surface">
          <Command className="w-5 h-5 text-accent-text mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Bir eylem, sekme veya ürün adı / ST kodu / barkod yazın... (Örn: 'Teklif', 'Çekvalf', 'Stok', 'Cari')"
            className="w-full bg-transparent text-sm sm:text-[16px] text-text-primary placeholder:text-text-muted"
          />
          {query && (
            <button 
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-text-muted hover:text-text-primary rounded-lg ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block ml-3 px-2 py-0.5 rounded bg-base-surface-2 border border-border text-[11px] font-mono text-text-muted">
            ESC ile Kapat
          </span>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[60vh] custom-scrollbar"
        >
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-3">
              <Package className="w-8 h-8 mx-auto opacity-40 text-text-muted" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Sonuç bulunamadı</p>
                <p className="text-xs text-text-muted mt-0.5">Farklı bir anahtar kelime veya ST kodu deneyin.</p>
              </div>
              {query && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Aramayı Temizle
                  </button>
                </div>
              )}
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  {category}
                </div>
                <div className="space-y-0.5">
                  {items.map((action) => {
                    const globalIdx = filteredActions.findIndex(a => a.id === action.id);
                    const isSelected = globalIdx === selectedIndex;

                    return (
                      <div
                        key={action.id}
                        onClick={() => {
                          Haptics.tap();
                          action.handler();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-base-surface-2 border border-border-strong text-text-primary shadow-xs' 
                            : 'hover:bg-base-surface-2/60 text-text-secondary border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-base-surface border border-border' : 'bg-base-surface-2'
                          }`}>
                            {action.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs sm:text-sm text-text-primary truncate flex items-center space-x-2">
                              <span>{action.title}</span>
                              {action.badge && (
                                <span className="px-1.5 py-0.5 rounded bg-success-fill/15 text-success-text border border-success-border font-mono text-[11px] font-bold">
                                  {action.badge}
                                </span>
                              )}
                            </div>
                            {action.subtitle && (
                              <div className="text-[11px] text-text-muted truncate">
                                {action.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {action.shortcut ? (
                          <span className="shrink-0 ml-3 px-2 py-1 rounded bg-base-surface border border-border font-mono text-[11px] text-text-muted font-bold">
                            {action.shortcut}
                          </span>
                        ) : (
                          <ArrowRight className={`w-4 h-4 ml-2 transition-transform shrink-0 ${isSelected ? 'translate-x-1 text-accent-text' : 'opacity-0'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Navigation Hints */}
        <div className="px-4 py-2.5 border-t border-border bg-base-surface-2 flex flex-wrap items-center justify-between text-[11px] text-text-muted gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px] text-text-secondary font-bold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px] text-text-secondary font-bold">↓</kbd>
              <span>Gezin</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px] text-text-secondary font-bold">Enter</kbd>
              <span>Seç</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px] text-text-secondary font-bold">ESC</kbd>
              <span>Kapat</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span>Tüm Kısayollar için:</span>
            <button
              onClick={() => {
                onClose();
                onOpenShortcutsHelp();
              }}
              className="text-accent-text font-bold hover:underline flex items-center space-x-1"
            >
              <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px]">?</kbd>
              <span>Kılavuz</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
