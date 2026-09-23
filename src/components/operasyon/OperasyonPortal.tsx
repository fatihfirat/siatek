import { useState, useMemo, useEffect, useRef } from 'react';
import {
  RefreshCw,
  LogOut,
  UserRound,
  Settings,
} from 'lucide-react';
import { Order, Product, User as UserType } from '../../types';
import DriverDispatchRouteModal from '../admin/DriverDispatchRouteModal';
import { updateOrderStatusInFirestore } from '../../lib/firestoreService';
import { logoutUser } from '../../lib/auth';

interface OperasyonPortalProps {
  orders: Order[];
  products: Product[];
  currentUser: UserType | null;
  ordersLoading?: boolean;
  onRefresh: () => void;
  onToggleTheme?: () => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Beklemede',      color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved:         { label: 'Onaylandı',       color: 'text-blue-600 bg-blue-50 border-blue-200' },
  preparing:        { label: 'Hazırlanıyor',    color: 'text-orange-600 bg-orange-50 border-orange-200' },
  ready:            { label: 'Hazır',           color: 'text-teal-600 bg-teal-50 border-teal-200' },
  shipped:          { label: 'Sevk Edildi',     color: 'text-purple-600 bg-purple-50 border-purple-200' },
  out_for_delivery: { label: 'Teslimatta',      color: 'text-green-600 bg-green-50 border-green-200' },
  delivered:        { label: 'Teslim Edildi',   color: 'text-gray-500 bg-gray-50 border-gray-200' },
  cancelled:        { label: 'İptal',           color: 'text-red-600 bg-red-50 border-red-200' },
};

export default function OperasyonPortal({
  orders,
  products,
  currentUser,
  ordersLoading,
  onRefresh,
  onToggleTheme,
}: OperasyonPortalProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [profileOpen]);

  const safeOrders = Array.isArray(orders) ? orders : [];

  // Aktif görevler: teslim edilmemiş ve iptal edilmemiş siparişler
  const activeOrders = useMemo(
    () => safeOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'),
    [safeOrders]
  );

  const handleMarkOrdersShipped = async (orderIds: string[], trackingPrefix?: string) => {
    await Promise.all(orderIds.map((orderId, index) => updateOrderStatusInFirestore(
      orderId,
      'shipped',
      undefined,
      {
        trackingNumber: `${trackingPrefix || 'SEVK'}-${String(index + 1).padStart(2, '0')}`,
        deliveryPersonnel: currentUser?.name || 'Operasyon',
        deliveryStatus: 'out_for_delivery',
      },
    )));
    onRefresh();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-base font-semibold text-[var(--text-color)]">Operasyon Merkezi</h1>
            {currentUser && (
              <p className="text-xs text-[var(--text-secondary-color)] mt-0.5">{currentUser.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg)] transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            </button>
            {currentUser && <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(open => !open)}
                className="min-w-11 min-h-11 px-2 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs active:scale-[0.98] transition-transform"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label={`${currentUser.name} operasyon profili`}
              >
                {currentUser.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}
              </button>
              {profileOpen && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                  <b className="block truncate text-sm text-slate-900 dark:text-white">{currentUser.name}</b>
                  <small className="block truncate text-xs text-slate-500">Operasyon profili</small>
                </div>
                <button type="button" role="menuitem" onClick={() => setProfileOpen(false)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-slate-800"><UserRound className="h-4 w-4" /> Profilim</button>
                {onToggleTheme && <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); onToggleTheme(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-slate-800"><Settings className="h-4 w-4" /> Tema ve görünüm</button>}
                <button type="button" role="menuitem" onClick={() => logoutUser()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-red-600 hover:bg-red-50 active:scale-[0.98] dark:hover:bg-red-950/40"><LogOut className="h-4 w-4" /> Oturumu kapat</button>
              </div>}
            </div>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 py-5">
        <DriverDispatchRouteModal
          isOpen
          displayMode="page"
          onClose={() => {}}
          orders={activeOrders}
          products={products}
          initialTab="preparation"
          onMarkOrdersShipped={handleMarkOrdersShipped}
        />
      </main>
    </div>
  );
}
