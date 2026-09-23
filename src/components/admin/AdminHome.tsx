import type { Product, Order, Quote } from '../../types';
import { Button, Section, KPI, FeedbackState, Skeleton, StatusBadge } from '../ui';
import './operations.css';
type Destination = 'pendingOrders' | 'pendingQuotes' | 'sentQuotes' | 'stock' | 'receipts' | 'orders' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'diagnostics' | 'errors' | 'camera' | 'import' | 'pricing' | 'supplier' | 'tiers' | 'dispatch' | 'aging' | 'quotes' | 'picking';
export default function AdminHome({ products = [], orders = [], quotes = [], loading = false, error, onRetry, onNavigate, onPos, stockThreshold = 5 }: {
    products?: Product[];
    orders?: Order[];
    quotes?: Quote[];
    loading?: boolean;
    error?: string;
    onRetry: () => void;
    onNavigate: (destination: Destination) => void;
    onPos: () => void;
    stockThreshold?: number;
}) {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeQuotes = Array.isArray(quotes) ? quotes : [];
    const safeProducts = Array.isArray(products) ? products : [];
    const pending = safeOrders.filter(o => o && o.status === 'pending').length,
          review = safeQuotes.filter(q => q && q.status === 'pending_review').length,
          sent = safeQuotes.filter(q => q && q.status === 'offer_sent').length,
          low = safeProducts.filter(p => p && p.stock <= stockThreshold).length,
          receipts = safeOrders.filter(o => o && o.receiptStatus === 'uploaded' && o.status !== 'cancelled').length;
    const tasks: Array<{
        id: Destination;
        title: string;
        count: number;
        description: string;
    }> = [{ id: 'pendingOrders', title: 'Onay bekleyen siparişler', count: pending, description: 'Siparişleri kontrol edin; uygun işlemi sipariş ekranında seçin.' }, { id: 'pendingQuotes', title: 'Yanıt bekleyen teklifler', count: review, description: 'Müşteri taleplerini inceleyin.' }, { id: 'receipts', title: 'İnceleme bekleyen dekontlar', count: receipts, description: 'Yüklenen ödeme belgelerini kontrol edin.' }, { id: 'stock', title: 'Düşük stoklu ürünler', count: low, description: `Stok miktarı ${stockThreshold} veya altında olan ürünler.` }, { id: 'sentQuotes', title: 'Yanıtı beklenen fiyat teklifleri', count: sent, description: 'Gönderilmiş tekliflerin durumunu takip edin.' }];
    return <div className="ui-scope ops-home premium-section-seven"><div className="ops-heading ops-heading-premium"><div><p className="ops-eyebrow">Operasyon özeti</p><h1>Yönetici ana sayfası</h1><p className="ui-hint">Örnek kayıtlar bu kurulumda başlangıç verisi olarak yüklenir. Canlı satış ve stok değildir.</p></div><Button onClick={onPos}>POS · Yeni satış</Button></div>
 {loading ? <Section title="İşler yükleniyor"><Skeleton /><Skeleton /><Skeleton /></Section> : error ? <FeedbackState kind="error" title="İşler yüklenemedi" description={error} action={<Button onClick={onRetry}>Tekrar dene</Button>}/> : <><Section title="Bekleyen işler">{tasks.every(t => !t.count) ? <FeedbackState kind="empty" title="Bekleyen iş yok" description="Yeni sipariş ve teklifler burada görünecek."/> : tasks.filter(t => t.count).map(t => <article key={t.id} className="ops-task"><div><h3>{t.title}</h3><p>{t.description}</p><StatusBadge tone="warning">{t.count} {t.id === 'stock' ? 'ürün' : 'kayıt'}</StatusBadge></div><Button variant="secondary" onClick={() => onNavigate(t.id)} aria-label={`${t.title} incele`}>İncele</Button></article>)}</Section><div className="ops-metrics"><KPI label="Kayıtlı sipariş tutarı" value={orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} hint="Örnek kayıtlar dahil; tahsil edilen tutar değildir."/><KPI label="Kayıtlı sipariş" value={String(orders.length)}/><KPI label="Katalogdaki ürün" value={String(products.length)}/></div></>}
 <Section title="Yönetim araçları"><div className="ops-actions">{([['orders', 'Siparişler'], ['quotes', 'Teklifler'], ['products', 'Ürünler'], ['cariler', 'Cari hesaplar'], ['invoices', 'Faturalar'], ['analytics', 'Satış analizi']] as const).map(([id, label]) => <Button variant="secondary" key={id} onClick={() => onNavigate(id)}>{label}</Button>)}</div><details><summary className="ui-button ui-button-secondary">Diğer araçlar</summary><div className="ops-actions">{([['picking', 'Depo toplama'], ['receipts', 'Dekont onay'], ['import', 'Excel işlemleri'], ['pricing', 'Fiyat ayarlama'], ['supplier', 'Tedarikçi satın alma'], ['tiers', 'Müşteri kademeleri'], ['dispatch', 'Sevkiyat rotası'], ['aging', 'Stok yaşlandırma'], ['diagnostics', 'Sistem tanılama'], ['errors', 'Hata merkezi']] as const).map(([id, label]) => <Button variant="secondary" key={id} onClick={() => onNavigate(id)}>{label}</Button>)}</div></details></Section></div>;
}
