import React from 'react';
import { 
  Keyboard, 
  X, 
  CornerDownLeft, 
  Plus, 
  Search, 
  Camera, 
  Sparkles, 
  Bell, 
  Moon, 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  FileText, 
  Users, 
  Receipt, 
  BarChart3, 
  Activity,
  Command,
  HelpCircle
} from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteShortcut?: (shortcutName: string) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: '⚡ Hızlı Navigasyon' | '🛠️ İşlemler & Teklif' | '⚙️ Sistem & Görünüm';
  icon: React.ReactNode;
  actionKey?: string;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  onExecuteShortcut
}: KeyboardShortcutsModalProps) {
  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    // ⚡ Fast Navigation
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', 'P'],
      description: 'Yönetici Modu ⟷ Müşteri Modu hızlı geçişi yap',
      icon: <CornerDownLeft className="w-4 h-4 text-accent-text" />,
      actionKey: 'switch_role'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', 'K'],
      description: 'Hızlı Komut Paleti & Global Arama kutusunu aç',
      icon: <Command className="w-4 h-4 text-info-text" />,
      actionKey: 'open_command_palette'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', 'S'],
      description: 'Stok & Ürün Hızlı Arama Masası odağı',
      icon: <Search className="w-4 h-4 text-success-text" />,
      actionKey: 'open_search'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '1'],
      description: 'Siparişler Masası sekmesine git',
      icon: <ShoppingBag className="w-4 h-4 text-info-text" />,
      actionKey: 'tab_orders'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '2'],
      description: 'Teklifler Masası sekmesine git',
      icon: <FileText className="w-4 h-4 text-warning-text" />,
      actionKey: 'tab_quotes'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '3'],
      description: 'Stok & Fiyat Yönetim Masası (stok.pdf)',
      icon: <Package className="w-4 h-4 text-success-text" />,
      actionKey: 'tab_products'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '4'],
      description: 'Cari Hesaplar & Bakiye Takip Masası',
      icon: <Users className="w-4 h-4 text-accent-text" />,
      actionKey: 'tab_cariler'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '5'],
      description: 'E-Fatura & Maliye Masası',
      icon: <Receipt className="w-4 h-4 text-success-text" />,
      actionKey: 'tab_invoices'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '6'],
      description: 'Satış Analitiği & Ciro Grafikleri',
      icon: <BarChart3 className="w-4 h-4 text-info-text" />,
      actionKey: 'tab_analytics'
    },
    {
      category: '⚡ Hızlı Navigasyon',
      keys: ['Ctrl', '7'],
      description: 'Sistem & Canlı Hata Tanı Masası',
      icon: <Activity className="w-4 h-4 text-danger-text" />,
      actionKey: 'tab_diagnostics'
    },

    // 🛠️ Operations & Quotes
    {
      category: '🛠️ İşlemler & Teklif',
      keys: ['Ctrl', 'N'],
      description: 'Yeni Teklif Talebi / Teklif Masası Başlat',
      icon: <Plus className="w-4 h-4 text-success-text" />,
      actionKey: 'new_quote'
    },
    {
      category: '🛠️ İşlemler & Teklif',
      keys: ['Ctrl', 'B'],
      description: 'Kamera ile Canlı Barkod / QR Kod Okuyucuyu Aç',
      icon: <Camera className="w-4 h-4 text-info-text" />,
      actionKey: 'open_scanner'
    },
    {
      category: '🛠️ İşlemler & Teklif',
      keys: ['Ctrl', 'M'],
      description: 'AI Asistanı Aç',
      icon: <Sparkles className="w-4 h-4 text-accent-text" />,
      actionKey: 'open_ai'
    },
    {
      category: '🛠️ İşlemler & Teklif',
      keys: ['Ctrl', 'I'],
      description: 'Gerçek Zamanlı Push Bildirimler Çekmecesini Aç',
      icon: <Bell className="w-4 h-4 text-warning-text" />,
      actionKey: 'open_notifications'
    },

    // ⚙️ System & Appearance
    {
      category: '⚙️ Sistem & Görünüm',
      keys: ['Ctrl', 'D'],
      description: 'Koyu / Açık Tema (Gece / Gündüz) Değiştir',
      icon: <Moon className="w-4 h-4 text-text-primary" />,
      actionKey: 'toggle_theme'
    },
    {
      category: '⚙️ Sistem & Görünüm',
      keys: ['?'],
      description: 'Bu Klavye Kısayolları Kılavuzunu Göster',
      icon: <HelpCircle className="w-4 h-4 text-accent-text" />,
      actionKey: 'open_help'
    },
    {
      category: '⚙️ Sistem & Görünüm',
      keys: ['ESC'],
      description: 'Açık modal, çekmece veya arama kutusunu kapat',
      icon: <X className="w-4 h-4 text-text-muted" />,
      actionKey: 'close_modals'
    }
  ];

  // Group shortcuts
  const grouped: Record<string, ShortcutItem[]> = {};
  shortcuts.forEach(s => {
    if (!grouped[s.category]) {
      grouped[s.category] = [];
    }
    grouped[s.category].push(s);
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="w-full max-w-3xl bg-base-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-base-surface">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent-fill/15 border border-accent-border flex items-center justify-center text-accent-text">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Sistem Klavye Kısayolları
              </h3>
              <p className="text-xs text-text-muted">
                Klavye kısayollarını kullanarak sistemde fare kullanmadan saniyeler içinde işlem yapabilirsiniz
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-xl bg-base-surface-2 border border-border transition-colors cursor-pointer"
            title="Kapat (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-xs font-black text-text-muted uppercase tracking-wider flex items-center space-x-2">
                <span>{category}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onExecuteShortcut && item.actionKey) {
                        onExecuteShortcut(item.actionKey);
                        onClose();
                      }
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-base-surface-2/60 hover:bg-base-surface-2 border border-border transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                      <div className="p-1.5 rounded-lg bg-base-surface border border-border shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-xs text-text-primary font-medium leading-snug">
                        {item.description}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-1 bg-base-surface border border-border rounded-lg font-mono text-[11px] font-extrabold text-text-primary shadow-2xs group-hover:border-border-strong transition-colors">
                            {k}
                          </kbd>
                          {kIdx < item.keys.length - 1 && (
                            <span className="text-text-muted text-xs font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info banner */}
        <div className="p-4 bg-base-surface-2 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
          <div className="flex items-center space-x-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-success-fill animate-ping"></span>
            <span>İpucu: Mac kullanıyorsanız <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px]">Cmd ⌘</kbd> tuşu <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded font-mono text-[10px]">Ctrl</kbd> yerine geçer.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-base-surface border border-border text-text-primary font-bold rounded-xl text-xs hover:bg-base-surface-2 transition-colors cursor-pointer"
          >
            Anladım (ESC)
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
