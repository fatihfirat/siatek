import React, { useState } from 'react';
import type { Order, User } from '../../types';
import { Button, FeedbackState, Modal, OrderRow, Section, Select, Skeleton, StatusBadge, TextInput } from '../ui';
import { customerOrders, orderDate, trackingStatus } from '../../utils/orderTracking';
import { ORDER_STATUS_CONFIG } from '../../utils/statusConfig';
import OrderPagination from '../common/OrderPagination';
import { Search, Clock, Package, Truck, CheckCircle2, X, FileText, Upload, ChevronRight, Filter } from 'lucide-react';
import './order-tracking.css';

const formatCurrency = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
    : 'Belirtilmemiş';

type Props = {
  orders: Order[];
  user: User | null;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onLogin: () => void;
  onReceipt?: (order: Order) => void;
  onPrint?: (order: Order) => void;
  onNavigateToCatalog?: () => void;
};

function Badge({ status }: { status: string }) {
  return (
    <StatusBadge
      tone={
        status === 'cancelled'
          ? 'error'
          : status === 'delivered'
          ? 'success'
          : status === 'pending'
          ? 'warning'
          : 'info'
      }
    >
      {trackingStatus(status)?.label || 'Durum doğrulanamadı'}
    </StatusBadge>
  );
}

export default function OrderTracking({
  orders,
  user,
  loading,
  error,
  onRetry,
  onLogin,
  onReceipt,
  onPrint,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const own = customerOrders(orders, user);

  // Multi-field smart filtering
  const visible = own.filter((o) => {
    // Status Filter
    if (filter !== 'all') {
      if (filter === 'out_for_delivery' && (o.status as string) !== 'shipped') return false;
      if (filter !== 'out_for_delivery' && o.status !== filter) return false;
    }

    // Search Query (Multi-field)
    if (query.trim()) {
      const q = query.trim().toLocaleLowerCase('tr-TR');
      const matchNum = o.orderNumber.toLocaleLowerCase('tr-TR').includes(q);
      const matchAddr = (o.customerAddress || '').toLocaleLowerCase('tr-TR').includes(q);
      const matchSite = (o.constructionSiteName || '').toLocaleLowerCase('tr-TR').includes(q);
      const matchNotes = (o.notes || '').toLocaleLowerCase('tr-TR').includes(q);
      const matchItems = (o.items || []).some((i) =>
        (i.productName || '').toLocaleLowerCase('tr-TR').includes(q)
      );
      if (!matchNum && !matchAddr && !matchSite && !matchNotes && !matchItems) return false;
    }

    return true;
  });

  // Pagination Slice
  const totalItems = visible.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedOrders = visible.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Resolve active modal order
  const order = own.find((o) => o.id === selected);
  const cfg = order ? trackingStatus(order.status) : null;
  const history =
    order?.statusHistory
      ?.slice()
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)) || [];

  // Status Counts for Badges
  const counts = {
    all: own.length,
    pending: own.filter((o) => o.status === 'pending').length,
    preparing: own.filter((o) => o.status === 'preparing' || o.status === 'approved').length,
    shipped: own.filter((o) => o.status === 'shipped').length,
    delivered: own.filter((o) => o.status === 'delivered').length,
    cancelled: own.filter((o) => o.status === 'cancelled').length,
  };

  return (
    <div className="ui-scope order-tracking ui-tab-fade space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Siparişlerim</h1>
          <p className="ui-hint text-xs text-text-muted">
            Siparişlerinizi ve Alpha Teknik teslimat sürecini anlık takip edin.
          </p>
        </div>
      </div>

      {!user ? (
        <FeedbackState
          kind="unauthorized"
          title="Giriş gerekli"
          description="Siparişlerinizi görmek için hesabınıza giriş yapın."
          action={<Button onClick={onLogin}>Giriş yap</Button>}
        />
      ) : loading ? (
        <div aria-label="Siparişler yükleniyor" className="space-y-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : error ? (
        <FeedbackState
          kind="error"
          title="Siparişler yüklenemedi"
          description={error}
          action={<Button onClick={onRetry}>Tekrar dene</Button>}
        />
      ) : own.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Henüz siparişiniz yok"
          description="Oluşturduğunuz siparişler ve teslimat hareketleri burada görünecek."
          action={
            <Button variant="secondary" onClick={() => (window.location.hash = 'catalog')}>
              Kataloğu İncele
            </Button>
          }
        />
      ) : (
        <>
          {/* Search & Filter Toolbar */}
          <div className="space-y-3 bg-base-surface p-3 sm:p-4 rounded-2xl border border-border shadow-xs">
            
            {/* Search Input & Select Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 relative">
                <TextInput
                  label="Sipariş numarası veya ürün ara"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Sipariş No, ürün adı, adres veya şantiye ara..."
                />
              </div>

              <div>
                <Select
                  label="Sipariş durumu"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Tüm durumlar ({counts.all})</option>
                  {Object.entries(ORDER_STATUS_CONFIG).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Quick Status KPI Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
              {[
                { 
                  key: 'all', 
                  label: 'Tümü', 
                  count: counts.all,
                  activeClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100 shadow-sm font-extrabold',
                  inactiveClass: 'bg-base-surface-2 hover:bg-base-surface-3 text-text-secondary hover:text-text-primary border-border'
                },
                { 
                  key: 'pending', 
                  label: 'Bekleyen', 
                  count: counts.pending,
                  activeClass: 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-extrabold ring-1 ring-amber-500/50',
                  inactiveClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                },
                { 
                  key: 'preparing', 
                  label: 'Hazırlanan', 
                  count: counts.preparing,
                  activeClass: 'bg-blue-600 text-white border-blue-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30'
                },
                { 
                  key: 'shipped', 
                  label: 'Sevkiyatta', 
                  count: counts.shipped,
                  activeClass: 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30'
                },
                { 
                  key: 'delivered', 
                  label: 'Teslim Edilen', 
                  count: counts.delivered,
                  activeClass: 'bg-teal-600 text-white border-teal-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-500/30'
                },
                { 
                  key: 'cancelled', 
                  label: 'İptal', 
                  count: counts.cancelled,
                  activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
                },
              ].map((chip) => {
                const isSelected = filter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setFilter(chip.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                      isSelected ? chip.activeClass : chip.inactiveClass
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isSelected
                          ? chip.key === 'pending'
                            ? 'bg-slate-950/20 text-slate-950 font-bold'
                            : chip.key === 'all'
                            ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950 font-bold'
                            : 'bg-white/20 text-white font-bold'
                          : 'bg-base-surface text-text-muted border border-border/50'
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Results List */}
          {visible.length === 0 ? (
            <FeedbackState
              kind="empty"
              title="Sonuç bulunamadı"
              description="Arama kriterlerinize veya durum filtresine uygun sipariş bulunamadı."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                    setCurrentPage(1);
                  }}
                >
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <div aria-label="Sipariş listesi" className="space-y-2">
                {paginatedOrders.map((o) => (
                  <div key={o.id}>
                    <OrderRow
                      number={o.orderNumber}
                      customer={orderDate(o.createdAt)}
                      total={formatCurrency(o.total)}
                      status={<Badge status={o.status} />}
                    >
                      <div className="flex items-center gap-1.5">
                        {onPrint && (
                          <button
                            type="button"
                            onClick={() => onPrint(o)}
                            className="p-1.5 rounded-lg border border-border bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary text-xs cursor-pointer"
                            title="Sipariş Belgesi Aç"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Button
                          variant="secondary"
                          aria-label={`${o.orderNumber} siparişini incele`}
                          onClick={() => setSelected(o.id)}
                        >
                          İncele
                        </Button>
                      </div>
                    </OrderRow>
                  </div>
                ))}
              </div>

              {/* Order Pagination */}
              <OrderPagination
                currentPage={safeCurrentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[5, 10, 20]}
                itemLabel="sipariş"
              />
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <Modal
        open={!!selected && !!user && !loading && !error}
        onClose={() => setSelected(null)}
        title={order ? `Sipariş ${order.orderNumber}` : 'Sipariş erişimi'}
      >
        {!order ? (
          <FeedbackState
            kind="unauthorized"
            title="Sipariş görüntülenemiyor"
            description="Bu sipariş hesabınıza ait değil veya artık listede bulunmuyor."
          />
        ) : (
          <div className="order-detail space-y-4">
            <p className="ui-hint text-xs text-text-muted">{orderDate(order.createdAt)}</p>

            <Section title="Mevcut durum">
              <div className="space-y-2">
                <Badge status={order.status} />
                <p className="text-xs text-text-secondary">
                  {cfg?.customerBehaviorText ||
                    'Sipariş durumu için Alpha Teknik ile iletişime geçin.'}
                </p>
                <p className="order-next text-xs">
                  <strong>Sıradaki adım: </strong>
                  {cfg?.nextStatus
                    ? ORDER_STATUS_CONFIG[cfg.nextStatus].label
                    : order.status === 'cancelled'
                    ? 'İptal edildi; teslimat süreci devam etmeyecek.'
                    : order.status === 'delivered'
                    ? 'Teslimat tamamlandı.'
                    : 'Durumun doğrulanması bekleniyor.'}
                </p>
              </div>
            </Section>

            <Section title="Ürünler">
              <div className="divide-y divide-border/60">
                {order.items.map((item, i) => (
                  <div className="ui-row py-2" key={`${item.productId}-${i}`}>
                    <div className="ui-row-body space-y-0.5">
                      <h3 className="font-semibold text-xs text-text-primary">{item.productName}</h3>
                      <p className="text-[11px] text-text-muted">
                        {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                      </p>
                      {item.note && <p className="ui-hint text-[11px] italic">{item.note}</p>}
                    </div>
                    <strong className="text-xs text-text-primary font-mono">{formatCurrency(item.totalPrice)}</strong>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Ödeme bilgisi">
              <dl className="order-totals">
                {[
                  ['Ara toplam', formatCurrency(order.subtotal)],
                  ['İndirim', formatCurrency(order.discount)],
                  ['KDV', formatCurrency(order.tax)],
                  ['Genel toplam', formatCurrency(order.total)],
                  [
                    'Ödeme yöntemi',
                    {
                      bank_transfer: 'Havale / EFT',
                      current_account: 'Cari hesap',
                      credit_card: 'Kredi kartı',
                      on_delivery: 'Teslimatta ödeme',
                    }[order.paymentMethod || ''] ||
                      order.paymentMethod ||
                      'Belirtilmemiş',
                  ],
                  [
                    'Dekont durumu',
                    order.receiptStatus === 'verified'
                      ? 'Dekont doğrulandı'
                      : order.receiptStatus === 'uploaded'
                      ? 'İnceleme bekliyor'
                      : order.receiptStatus === 'rejected'
                      ? 'Dekont reddedildi'
                      : 'Dekont bulunmuyor',
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="ui-hint text-[11px]">
                Dekont bilgisi, tüm sipariş tutarının ödendiği anlamına gelmez.
              </p>
              {order.receiptNote && <p className="text-xs text-text-secondary">{order.receiptNote}</p>}
              {onReceipt && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelected(null);
                      onReceipt(order);
                    }}
                  >
                    Dekont bildir
                  </Button>
                </div>
              )}
            </Section>

            <Section title="Teslimat adresi">
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-text-primary">{order.customerName}</p>
                <p className="text-text-secondary">{order.customerAddress || 'Adres belirtilmemiş'}</p>
                {order.constructionSiteName && (
                  <p className="text-brand-500 font-medium">Şantiye: {order.constructionSiteName}</p>
                )}
                <p className="text-text-muted">{order.customerPhone}</p>
                {order.notes && <p className="text-text-muted">Not: {order.notes}</p>}
                <p className="ui-hint text-[11px]">Teslimatı Alpha Teknik gerçekleştirir.</p>
              </div>
            </Section>

            <Section title="Durum geçmişi">
              {history.length ? (
                <ol className="order-timeline">
                  {history.map((entry, i) => (
                    <li key={entry.id || i}>
                      <strong>{trackingStatus(entry.status)?.label || 'Durum doğrulanamadı'}</strong>
                      <time dateTime={entry.timestamp}>{orderDate(entry.timestamp)}</time>
                      {entry.note && <p>{entry.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="ui-hint text-xs text-text-muted">Bu sipariş için durum geçmişi kaydedilmemiş.</p>
              )}
            </Section>

            {onPrint && (
              <div className="pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(null);
                    onPrint(order);
                  }}
                >
                  Sipariş belgesini aç
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
