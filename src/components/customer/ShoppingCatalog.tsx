import { useState, type ReactNode } from 'react';
import type { Product, CartItem, User } from '../../types';
import { Package, ShoppingCart, LayoutGrid, List, Sparkles, UploadCloud, Check } from 'lucide-react';
import { Button, QuantityStepper, StatusBadge, FeedbackState, Modal, Select } from '../ui';
import { useCompanySettings } from '../../lib/companySettings';
import { Haptics } from '../../utils/haptics';
import './shopping.css';

export const formatMoney = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

export function ProductPurchase({
  product: p,
  quantity,
  inCart,
  user,
  onQuantity,
  onAdd,
  onLogin,
  isRowView = false,
}: {
  product: Product;
  quantity: number;
  inCart: number;
  user: User | null;
  onQuantity: (n: number) => void;
  onAdd: () => void;
  onLogin: () => void;
  isRowView?: boolean;
}) {
  const companySettings = useCompanySettings();
  const shouldHidePrice = Boolean(companySettings.hidePricesForGuests && !user);
  const min = p.minOrderQuantity || 1;
  const available = Math.max(0, p.stock - inCart);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddWithAnim = () => {
    Haptics.tap();
    onAdd();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className={`grid gap-2 ${isRowView ? 'items-center' : 'mt-auto pt-2 border-t border-border'}`}>
      <div className="shopping-price-tag">
        {!shouldHidePrice ? (
          <div>
            <strong>{formatMoney(p.price)}</strong>
            <small> / {p.unit}</small>
          </div>
        ) : (
          <span className="text-xs text-amber-500/90 dark:text-amber-400 font-bold">Fiyat için bayi girişi</span>
        )}
        <StatusBadge tone={p.stock <= 0 ? 'error' : p.stock <= (p.minStockAlert || min) ? 'warning' : 'success'}>
          {p.stock <= 0 ? 'Tükendi' : `${p.stock} ${p.unit}`}
        </StatusBadge>
      </div>

      {user ? (
        <>
          <div className="shopping-buy-row">
            <QuantityStepper
              label={`${p.name} miktarı`}
              value={Math.min(quantity, Math.max(min, available))}
              min={min}
              max={Math.max(min, available)}
              disabled={available < min}
              onChange={onQuantity}
            />
            <Button
              variant={justAdded ? 'secondary' : 'primary'}
              onClick={handleAddWithAnim}
              disabled={available < min}
            >
              {justAdded ? <><Check aria-hidden="true" className="text-success-text"/> Eklendi</> : <><ShoppingCart aria-hidden="true" /> Sepete Ekle</>}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            {inCart > 0 && <span className="text-success-text font-semibold">Sepette {inCart} {p.unit}</span>}
            {min > 1 && <span>Min. Sipariş: {min} {p.unit}</span>}
          </div>
        </>
      ) : shouldHidePrice ? (
        <Button variant="secondary" onClick={onLogin} className="w-full">
          Yetkili Bayi Girişi Yap
        </Button>
      ) : (
        <Button variant="primary" onClick={onLogin} className="w-full">
          Sipariş Vermek İçin Giriş
        </Button>
      )}
    </div>
  );
}

interface Props {
  products: Product[];
  allProducts: Product[];
  cart: CartItem[];
  user: User | null;
  search: ReactNode;
  filters: ReactNode;
  query: string;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  view: 'grid' | 'table';
  onView: (v: 'grid' | 'table') => void;
  onPage: (n: number) => void;
  onPageSize: (n: number) => void;
  onReset: () => void;
  onLogin: () => void;
  onQuote: () => void;
  onBulk: () => void;
  getQuantity: (p: Product) => number;
  onQuantity: (id: string, n: number, min: number) => void;
  onAdd: (p: Product) => void;
}

export default function ShoppingCatalog(props: Props) {
  const [detail, setDetail] = useState<Product | null>(null);

  const purchase = (p: Product, isRowView = false) => (
    <ProductPurchase
      product={p}
      user={props.user}
      quantity={props.getQuantity(p)}
      inCart={props.cart.find((i) => i.product.id === p.id)?.quantity || 0}
      onQuantity={(n) => props.onQuantity(p.id, n, p.minOrderQuantity || 1)}
      onAdd={() => props.onAdd(p)}
      onLogin={props.onLogin}
      isRowView={isRowView}
    />
  );

  return (
    <section className="ui-scope shopping-catalog premium-section-six ui-tab-fade">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1>Ürün Kataloğu & Stok Listesi</h1>
          <p className="ui-hint">İhtiyacınız olan ürünleri hızlıca bulun, sepete ekleyin veya özel fiyat teklifi talep edin.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={props.onQuote}>
            <Sparkles aria-hidden="true" className="w-4 h-4 text-warning-text" />
            <span>Teklif İste</span>
          </Button>
          <Button variant="secondary" size="small" onClick={props.onBulk}>
            <UploadCloud aria-hidden="true" className="w-4 h-4 text-info-text" />
            <span>Toplu Liste</span>
          </Button>
        </div>
      </header>

      {/* Search & Active Filters */}
      <div className="grid gap-3">
        {props.search}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-base-surface-2 rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-2">
            {props.filters}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary px-2" role="status">
              {props.total} ürün
            </span>
            <div className="flex items-center bg-base-surface border border-border rounded-lg p-0.5">
              <button
                type="button"
                aria-label="Kart Görünümü"
                onClick={() => props.onView('grid')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  props.view === 'grid' ? 'bg-info-fill text-white shadow-2xs' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Liste Görünümü"
                onClick={() => props.onView('table')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  props.view === 'table' ? 'bg-info-fill text-white shadow-2xs' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product List / Grid */}
      {props.total === 0 ? (
        <FeedbackState
          kind="empty"
          title="Aradığınız kriterlere uygun ürün bulunamadı"
          description={props.query ? `"${props.query}" araması ile eşleşen ürün bulunamadı. Filtreleri temizleyebilir veya özel teklif isteyebilirsiniz.` : 'Seçili kategori ve filtrelere ait ürün bulunmuyor. Filtreleri temizleyerek tüm kataloğu görebilirsiniz.'}
          action={
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button onClick={props.onReset}>Filtreleri Temizle</Button>
              <Button variant="secondary" onClick={props.onQuote}>Özel Teklif İste</Button>
            </div>
          }
        />
      ) : props.view === 'grid' ? (
        <div className="shopping-products" data-view="grid">
          {props.products.map((p) => (
            <article key={p.id} className="shopping-product-card" id={`product-card-${p.id}`}>
              <div>
                <div
                  className="shopping-product-img-wrapper cursor-pointer"
                  onClick={() => setDetail(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDetail(p)}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} loading="lazy" />
                  ) : (
                    <Package aria-hidden="true" />
                  )}
                </div>
                <div className="shopping-product-meta">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                    {p.brand && <span>{p.brand}</span>}
                    {p.brand && p.sku && <span>·</span>}
                    {p.sku && <span>Kod: {p.sku}</span>}
                  </div>
                  <Button variant="link" onClick={() => setDetail(p)} title={p.name}>
                    {p.name}
                  </Button>
                </div>
              </div>
              {purchase(p, false)}
            </article>
          ))}
        </div>
      ) : (
        <div className="shopping-products" data-view="table">
          {props.products.map((p) => (
            <article key={p.id} className="shopping-product-row-view" id={`product-card-${p.id}`}>
              <div className="shopping-product-row-info">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} loading="lazy" />
                ) : (
                  <div className="row-icon flex items-center justify-center">
                    <Package className="w-6 h-6 text-ui-muted" />
                  </div>
                )}
                <div>
                  <Button variant="link" onClick={() => setDetail(p)}>
                    {p.name}
                  </Button>
                  <p className="ui-hint">
                    {[p.brand, p.category, p.sku ? `Kod: ${p.sku}` : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {purchase(p, true)}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      <nav className="flex items-center justify-between gap-2 p-3 bg-base-surface rounded-xl border border-border text-xs" aria-label="Katalog sayfaları">
        <Button variant="secondary" size="small" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}>
          Önceki
        </Button>
        <span className="font-semibold text-text-secondary">
          Sayfa {props.page} / {props.pages}
        </span>
        <Button variant="secondary" size="small" disabled={props.page >= props.pages} onClick={() => props.onPage(props.page + 1)}>
          Sonraki
        </Button>
        <Select label="Adet" value={props.pageSize} onChange={(e) => props.onPageSize(Number(e.target.value))}>
          {[24, 36, 60, 120].map((n) => (
            <option key={n} value={n}>
              {n} Ürün
            </option>
          ))}
        </Select>
      </nav>

      {/* Product Detail Modal */}
      <Modal open={!!detail} title="Ürün Detayı" onClose={() => setDetail(null)}>
        {detail && (
          <div className="shopping-detail">
            <h2>{detail.name}</h2>
            {detail.imageUrl && <img src={detail.imageUrl} alt={detail.name} width="240" height="240" />}
            <p className="text-sm text-text-secondary">{detail.description || 'Bu ürün için ek teknik açıklama bulunmuyor.'}</p>
            <dl>
              <dt>Stok Kodu</dt>
              <dd>{detail.sku || '-'}</dd>
              <dt>Kategori</dt>
              <dd>{detail.category}</dd>
              {detail.barcode && (
                <>
                  <dt>Barkod</dt>
                  <dd>{detail.barcode}</dd>
                </>
              )}
              {detail.brand && (
                <>
                  <dt>Marka</dt>
                  <dd>{detail.brand}</dd>
                </>
              )}
            </dl>
            {purchase(detail)}
            {props.allProducts.filter((p) => p.id !== detail.id && p.category === detail.category).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">Benzer Ürünler</h3>
                <div className="flex flex-wrap gap-2">
                  {props.allProducts
                    .filter((p) => p.id !== detail.id && p.category === detail.category)
                    .slice(0, 3)
                    .map((p) => (
                      <Button key={p.id} variant="secondary" size="small" onClick={() => setDetail(p)}>
                        {p.name}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
