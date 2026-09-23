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
};

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

export default function AdminModuleOverview({ mode, orders, quotes, products, onRefresh, onPrimaryAction, onAlertAction }: Props) {
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
        { label: 'Net satış', value: money(revenue), meta: `${activeOrders.length} aktif sipariş`, icon: BarChart3 },
        { label: 'Açık sipariş', value: String(pending), meta: pending ? 'İşlem gerekli' : 'Tümü güncel', icon: ShoppingBag },
        { label: 'Teklif dönüşümü', value: `%${conversion.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`, meta: `${acceptedQuotes}/${quotes.length} kabul`, icon: TrendingUp },
        { label: 'Ort. sipariş', value: money(averageOrder), meta: 'Aktif sipariş başına', icon: Sparkles },
      ]
    : [
        { label: 'Stok değeri', value: money(stockValue), meta: 'Güncel satış fiyatı', icon: BarChart3 },
        { label: 'Toplam ürün', value: products.length.toLocaleString('tr-TR'), meta: `${activeProducts.toLocaleString('tr-TR')} stokta`, icon: Box },
        { label: 'Kritik stok', value: String(critical), meta: critical ? 'Aksiyon gerekli' : 'Stoklar yeterli', icon: AlertTriangle },
        { label: 'Stok sağlığı', value: `%${stockHealth.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`, meta: 'Kritik eşik üstü', icon: Sparkles },
      ];

  return <section className="admin-module-overview" aria-labelledby={`${mode}-page-title`}>
    <div className="admin-module-titlebar">
      <div><h1 id={`${mode}-page-title`}>{sales ? 'Satış' : 'Stok Yönetimi'}</h1><p>{sales ? 'Sipariş, teklif ve satış süreçlerini tek akışta yönetin.' : 'Ürünleri, stok seviyelerini ve kritik ikmal süreçlerini yönetin.'}</p></div>
      <div className="admin-module-actions">
        <button type="button" onClick={onRefresh}><RefreshCw size={18} /><span>Verileri yenile</span></button>
        <button type="button" className="is-primary" onClick={onPrimaryAction}>{sales ? <Plus size={19} /> : <PackagePlus size={19} />}<span>{sales ? 'Yeni satış' : 'Yeni ürün'}</span></button>
      </div>
    </div>
    <div className="admin-module-kpis">
      {cards.map(({ label, value, meta, icon: Icon }) => <article key={label}>
        <div className="admin-module-kpi-head"><span>{label}</span><i><Icon size={19} /></i></div>
        <strong>{value}</strong><small>{meta}</small>
        <div className="admin-module-spark" aria-hidden="true"><b /><b /><b /><b /><b /><b /></div>
      </article>)}
    </div>
    <button type="button" className={`admin-module-alert${(sales ? pending : critical) ? ' has-alert' : ''}`} onClick={onAlertAction}>
      <span>{sales ? <ShoppingBag size={19} /> : <AlertTriangle size={19} />}</span>
      <div><b>{sales ? `${pending} sipariş işlem bekliyor` : `${critical} ürün kritik stokta`}</b><small>{sales ? 'Bekleyen siparişleri filtrele ve işleme al.' : 'Kritik ürünleri incele ve ikmal başlat.'}</small></div>
      <ArrowDownToLine size={18} />
    </button>
  </section>;
}
