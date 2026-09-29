import { AlertTriangle, ArrowDownToLine, BarChart3, Box, PackagePlus, Plus, RefreshCw, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react';
import type { Order, Product, Quote } from '../../types';

type Props = {
  mode: 'sales' | 'stock';
  orders: Order[];
  quotes: Quote[];
  products: Product[];
  onRefresh: () => void;
  onPrimaryAction: () => void;
  onAlertAction: () => void;
  secondaryActions?: React.ReactNode;
  hideAlertBanner?: boolean;
  hideRefresh?: boolean;
  hideTitlebar?: boolean;
  activeStockFilter?: 'all' | 'in_stock' | 'critical' | 'health';
  onStockFilterChange?: (filter: 'all' | 'in_stock' | 'critical' | 'health') => void;
};

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

export default function AdminModuleOverview({
  mode,
  orders,
  quotes,
  products,
  onRefresh,
  onPrimaryAction,
  onAlertAction,
  secondaryActions,
  hideAlertBanner = false,
  hideRefresh = false,
  hideTitlebar = false,
  activeStockFilter = 'all',
  onStockFilterChange,
}: Props) {
  const activeOrders = orders.filter(order => order.status !== 'cancelled');
  const revenue = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pending = orders.filter(order => order.status === 'pending').length;
  const averageOrder = activeOrders.length ? revenue / activeOrders.length : 0;
  const acceptedQuotes = quotes.filter(quote => quote.status === 'accepted').length;
  const conversion = quotes.length ? (acceptedQuotes / quotes.length) * 100 : 0;
  const stockValue = products.reduce((sum, product) => sum + (product.stock || 0) * (product.price || 0), 0);
  const critical = products.filter(product => product.stock <= 5).length;
  const activeProducts = products.filter(product => product.stock > 0).length;
  const stockHealth = products.length ? ((products.length - critical) / products.length) * 100 : 100;
  const sales = mode === 'sales';

  const cards = sales
    ? [
        { id: 'sales-revenue', label: 'Net satış', value: money(revenue), meta: `${activeOrders.length} aktif sipariş`, icon: BarChart3, onClick: undefined },
        { id: 'sales-pending', label: 'Açık sipariş', value: String(pending), meta: pending ? 'İşlem gerekli' : 'Tümü güncel', icon: ShoppingBag, onClick: onAlertAction },
        { id: 'sales-conversion', label: 'Teklif dönüşümü', value: `%${conversion.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`, meta: `${acceptedQuotes}/${quotes.length} kabul`, icon: TrendingUp, onClick: undefined },
        { id: 'sales-avg', label: 'Ort. sipariş', value: money(averageOrder), meta: 'Aktif sipariş başına', icon: Sparkles, onClick: undefined },
      ]
    : [
        {
          id: 'all' as const,
          label: 'Stok Değeri',
          value: money(stockValue),
          meta: '(Tıkla: Tüm Ürünler)',
          icon: BarChart3,
          onClick: () => onStockFilterChange?.('all'),
        },
        {
          id: 'in_stock' as const,
          label: 'Toplam Ürün',
          value: products.length.toLocaleString('tr-TR'),
          meta: '(Tıkla: Stoktakiler)',
          icon: Box,
          onClick: () => onStockFilterChange?.('in_stock'),
        },
        {
          id: 'critical' as const,
          label: 'Kritik Stok',
          value: `${critical} Ürün`,
          meta: '(Tıkla: Kritikler)',
          icon: AlertTriangle,
          onClick: () => (onStockFilterChange ? onStockFilterChange('critical') : onAlertAction()),
        },
        {
          id: 'health' as const,
          label: 'Stok Sağlığı',
          value: `%${Math.round(stockHealth)}`,
          meta: '(Tıkla: Sağlık Özeti)',
          icon: Sparkles,
          onClick: () => (onStockFilterChange ? onStockFilterChange('health') : undefined),
        },
      ];

  const showRefreshInTopBar = !hideRefresh && mode !== 'stock';

  return (
    <section className="admin-module-overview" aria-labelledby={`${mode}-page-title`}>
      {!hideTitlebar && (
        <div className="admin-module-titlebar">
          <div>
            <h1 id={`${mode}-page-title`}>{sales ? 'Satış' : 'Stok Yönetimi'}</h1>
            <p>
              {sales
                ? 'Sipariş, teklif ve satış süreçlerini tek akışta yönetin.'
                : 'Ürünleri, stok seviyelerini ve kritik ikmal süreçlerini yönetin.'}
            </p>
          </div>
          <div className="admin-module-actions flex-wrap items-center">
            {showRefreshInTopBar && (
              <button type="button" onClick={onRefresh}>
                <RefreshCw size={18} />
                <span>Verileri yenile</span>
              </button>
            )}
            {secondaryActions}
            <button type="button" className="is-primary" onClick={onPrimaryAction}>
              {sales ? <Plus size={19} /> : <PackagePlus size={19} />}
              <span>{sales ? 'Yeni satış' : 'Yeni ürün'}</span>
            </button>
          </div>
        </div>
      )}
      <div className="admin-module-kpis">
        {cards.map(({ id, label, value, meta, icon: Icon, onClick }) => {
          const isFilterActive = !sales && activeStockFilter === id;
          return (
            <article
              key={label}
              onClick={onClick}
              className={`transition-all select-none ${
                onClick ? 'cursor-pointer active:scale-[0.98]' : ''
              } ${
                isFilterActive
                  ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500 shadow-xs'
                  : onClick
                  ? 'hover:border-emerald-500/50'
                  : ''
              }`}
              title={onClick ? `${label} filtrelemek veya işlem yapmak için tıklayın` : undefined}
            >
              <div className="admin-module-kpi-head">
                <span className={isFilterActive ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
                  {label}
                </span>
                <i>
                  <Icon size={19} className={isFilterActive ? 'text-emerald-600 dark:text-emerald-400' : ''} />
                </i>
              </div>
              <strong className="tabular-nums">{value}</strong>
              <small className={isFilterActive ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
                {meta}
              </small>
              <div className="admin-module-spark" aria-hidden="true">
                <b /><b /><b /><b /><b /><b />
              </div>
            </article>
          );
        })}
      </div>
      {!hideAlertBanner && (
        <button
          type="button"
          className={`admin-module-alert${(sales ? pending : critical) ? ' has-alert' : ''}`}
          onClick={onAlertAction}
        >
          <span>{sales ? <ShoppingBag size={19} /> : <AlertTriangle size={19} />}</span>
          <div>
            <b>{sales ? `${pending} sipariş işlem bekliyor` : `${critical} ürün kritik stokta`}</b>
            <small>
              {sales
                ? 'Bekleyen siparişleri filtrele ve işleme al.'
                : 'Kritik ürünleri incele ve ikmal başlat.'}
            </small>
          </div>
          <ArrowDownToLine size={18} />
        </button>
      )}
    </section>
  );
}
