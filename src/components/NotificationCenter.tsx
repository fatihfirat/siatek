import { useState } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { PushNotification, UserRole } from '../types';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Sparkles, 
  ShoppingBag, 
  FileText, 
  ShieldAlert, 
  X, 
  AlertTriangle,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import { requestNotificationPermission, playNotificationSound } from '../lib/audio';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotification[];
  currentRole: UserRole;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onNavigate?: (notif: PushNotification) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  currentRole,
  onMarkAllRead,
  onMarkRead,
  onNavigate,
}: NotificationCenterProps) {
  useModalBehavior(isOpen, onClose);
  const [filterCategory, setFilterCategory] = useState<'all' | 'orders' | 'quotes' | 'stock' | 'security'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [permState, setPermState] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [permNotice, setPermNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const handleRequestPermission = async () => {
    try {
      const result = await requestNotificationPermission();
      setPermState(result);
      if (result === 'granted') {
        playNotificationSound('success');
        setPermNotice('Masaüstü push bildirimleri başarıyla aktifleştirildi.');
      } else if (result === 'denied') {
        setPermNotice('Tarayıcı ayarlarından bildirimlere izin vermeniz gerekebilir.');
      }
    } catch (err: any) {
      setPermNotice('Tarayıcı koruması nedeniyle izin penceresi açılamadı.');
    }
  };

  const handleNotificationClick = (notif: PushNotification) => {
    onMarkRead(notif.id);
    if (onNavigate) {
      onNavigate(notif);
    }
    onClose();
  };

  // Role filter first
  const roleFiltered = safeNotifications.filter(
    n => n && (n.targetRole === 'all' || n.targetRole === currentRole)
  );

  // Category filter
  const categoryFiltered = roleFiltered.filter(n => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'orders') return n.referenceType === 'order' || (n.type && n.type.startsWith('order_'));
    if (filterCategory === 'quotes') return n.referenceType === 'quote' || (n.type && n.type.startsWith('quote_'));
    if (filterCategory === 'stock') return n.type === 'low_stock' || n.referenceType === 'product';
    if (filterCategory === 'security') return n.type === 'security_alert';
    return true;
  });

  // Search filter
  const filteredNotifications = categoryFiltered.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
  });

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const getIcon = (type: PushNotification['type']) => {
    switch (type) {
      case 'order_created':
      case 'order_updated':
        return <ShoppingBag className="w-4 h-4 text-success-text" />;
      case 'quote_requested':
      case 'quote_offered':
      case 'quote_accepted':
        return <FileText className="w-4 h-4 text-warning-text" />;
      case 'security_alert':
        return <ShieldAlert className="w-4 h-4 text-danger-text" />;
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-danger-text animate-pulse" />;
      default:
        return <Sparkles className="w-4 h-4 text-info-text" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          id="notification-center-portal-modal"
          className="w-full max-w-4xl bg-base-surface border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-text-primary animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-base-surface-2 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-base-surface border border-border flex items-center justify-center text-text-primary shadow-xs">
              <Bell className="w-5 h-5 text-warning-text" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary">Bildirim Yönetim Masası</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-base-surface text-text-secondary border border-border font-mono font-bold">
                  {roleFiltered.length} Kayıt
                </span>
                {unreadCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-danger text-danger-text border border-danger-border font-bold">
                    {unreadCount} Okunmamış
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">Canlı SSE olayları, sipariş & teklif bildirimleri ve kritik stok alarmları</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {roleFiltered.length > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-success-text hover:opacity-90 flex items-center space-x-1.5 px-3 py-1.5 bg-bg-success rounded-xl border border-success-border transition-colors cursor-pointer font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tümünü Okundu Say</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-base-surface transition-colors cursor-pointer border border-border"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-3 sm:p-4 bg-base-surface border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs with Gradient Fade Edge & Scroll Cue */}
          <div className="relative flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar text-xs scroll-smooth pr-6">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  filterCategory === 'all'
                    ? 'bg-base-surface-2 text-text-primary border border-border-strong shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                }`}
              >
                Tümü ({roleFiltered.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('orders')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  filterCategory === 'orders'
                    ? 'bg-bg-success text-success-text border border-success-border shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                }`}
              >
                Siparişler
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('quotes')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  filterCategory === 'quotes'
                    ? 'bg-bg-warning text-warning-text border border-warning-border shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                }`}
              >
                Teklifler
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('stock')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  filterCategory === 'stock'
                    ? 'bg-bg-danger text-danger-text border border-danger-border shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                }`}
              >
                Kritik Stok
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('security')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  filterCategory === 'security'
                    ? 'bg-bg-info text-info-text border border-info-border shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                }`}
              >
                Güvenlik & Sistem
              </button>
            </div>
            {/* Subtle Right Fade Gradient Indicator */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 sm:bottom-0 w-8 bg-gradient-to-l from-base-surface to-transparent" />
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Bildirim ara..."
              className="w-full pl-8.5 pr-8 py-1.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-border-strong transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Push Notification Permission Info Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-base-surface-2/60 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          {permState !== 'granted' ? (
            <div className="flex items-center justify-between w-full bg-bg-warning p-2.5 rounded-xl border border-warning-border">
              <span className="text-warning-text text-[11px] font-medium flex items-center space-x-1.5">
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>Masaüstü anlık web push bildirimlerini aktifleştirin.</span>
              </span>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1 bg-warning-fill text-base hover:opacity-90 rounded-lg text-[11px] font-bold transition-all ml-2 cursor-pointer shadow-xs whitespace-nowrap"
              >
                İzin Ver
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-success-text text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-success-fill animate-pulse" />
              <span>Tarayıcı Web Push Bildirim Servisi Aktif ve Canlı</span>
            </div>
          )}

          {permNotice && (
            <div className="w-full text-[11px] text-text-secondary bg-base-surface p-2 rounded-lg border border-border">
              {permNotice}
            </div>
          )}
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-border space-y-1 custom-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-xs space-y-3">
              <Bell className="w-12 h-12 mx-auto opacity-30 text-text-muted" />
              <div>
                <p className="font-semibold text-text-primary text-sm">Görüntülenecek bildirim bulunamadı.</p>
                <span className="text-[11px] text-text-muted mt-1 block">
                  Yeni siparişler, teklif yanıtları ve stok alarmları gerçek zamanlı olarak bu masada listelenir.
                </span>
              </div>
              {(filterCategory !== 'all' || searchQuery) ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCategory('all');
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Pencereyi Kapat
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer flex items-start space-x-3.5 my-1.5 border ${
                  notif.read
                    ? 'bg-base-surface hover:bg-base-surface-2 border-border opacity-85'
                    : notif.type === 'low_stock'
                    ? 'bg-bg-danger/40 hover:bg-bg-danger/70 border-danger-border'
                    : 'bg-base-surface-2 hover:bg-base-surface border-border-strong shadow-xs'
                }`}
                title="Detaylara gitmek için tıklayın"
              >
                <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                  notif.type === 'low_stock' 
                    ? 'bg-bg-danger border-danger-border text-danger-text' 
                    : notif.type?.startsWith('order_')
                    ? 'bg-bg-success border-success-border text-success-text'
                    : notif.type?.startsWith('quote_')
                    ? 'bg-bg-warning border-warning-border text-warning-text'
                    : 'bg-base-surface border-border text-text-secondary'
                }`}>
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 truncate">
                      <h4 className={`text-xs sm:text-sm font-bold truncate ${
                        notif.read ? 'text-text-secondary' : notif.type === 'low_stock' ? 'text-danger-text' : 'text-text-primary'
                      }`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="px-2 py-0.5 rounded-full bg-info-fill text-base text-[9px] font-bold font-mono">
                          YENİ
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted font-mono shrink-0">
                      {new Date(notif.timestamp).toLocaleString('tr-TR', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    {notif.message}
                  </p>

                  {/* Action Link Hint */}
                  <div className="mt-2.5 flex items-center space-x-1 text-[11px] font-semibold text-info-text hover:underline">
                    <span>Detayları İncele & Masaya Git</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {!notif.read && (
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 animate-ping ${
                    notif.type === 'low_stock' ? 'bg-danger-fill' : 'bg-info-fill'
                  }`} />
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-base-surface-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <div>
            Toplam <strong>{roleFiltered.length}</strong> bildirim kaydı
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
