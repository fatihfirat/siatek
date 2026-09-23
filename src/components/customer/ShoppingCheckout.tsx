import { useEffect, useRef, useState, type FormEvent } from 'react';
import { acquireScrollLock } from '../../lib/scrollLock';
import type { CartItem, User } from '../../types';
import { Button, TextInput, Textarea, QuantityStepper, Select, FeedbackState, IconButton } from '../ui';
import { formatMoney } from './ShoppingCatalog';
import { X, Trash2, Building2, CreditCard, Copy, Check, MapPin, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';

export interface DeliveryFields {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  user: User | null;
  onLogin: () => void;
  onQuantity: (id: string, n: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  fields: DeliveryFields;
  onField: (key: keyof DeliveryFields, value: string) => void;
  onSite: () => void;
  payment: string;
  onPayment: (v: 'bank_transfer' | 'credit_card' | 'on_delivery' | 'current_account') => void;
  banks: { bankName: string; accountName: string; iban: string; branch: string }[];
  bankIndex: number;
  onBank: (n: number) => void;
  onCopy: (s: string) => void;
  copied: string | null;
  subtotal: number;
  tax: number;
  total: number;
  busy: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
}

export default function ShoppingCheckout(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [activeStep, setActiveStep] = useState<'cart' | 'delivery' | 'payment'>('cart');

  useEffect(() => {
    if (!p.open) return;
    const previous = document.activeElement as HTMLElement;
    // Kaydirma kilidi merkezi yoneticiden alinir. Eskiden burada ham
    // document.body.style.overflow kullaniliyordu; sayac disinda oldugu icin
    // banka/dekont modaliyla birlikte acildiginda kilit kalici olarak
    // sizabiliyordu (sayfa donuyordu).
    const releaseScroll = acquireScrollLock();
    try {
      if (!ref.current?.open) {
        ref.current?.showModal();
      }
    } catch (e) {
      console.warn('ShoppingCheckout showModal error:', e);
    }
    setActiveStep('cart');
    return () => {
      try {
        if (ref.current?.open) {
          ref.current?.close();
        }
      } catch (e) {}
      releaseScroll();
      previous?.focus();
    };
  }, [p.open]);

  if (!p.open) return null;

  const bank = p.banks[p.bankIndex];

  return (
    <dialog
      ref={ref}
      className="ui-scope shopping-checkout"
      aria-labelledby="shopping-cart-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!p.busy) p.onClose();
      }}
    >
      <header>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-info-text" />
          <h2 id="shopping-cart-title">Sipariş Sepeti ({p.cart.reduce((s, i) => s + i.quantity, 0)} Ürün)</h2>
        </div>
        <IconButton label="Kapat" onClick={p.onClose} disabled={p.busy}>
          <X className="w-5 h-5" />
        </IconButton>
      </header>

      {!p.cart.length ? (
        <FeedbackState
          kind="empty"
          title="Sepetiniz Boş"
          description="Sipariş oluşturmak için ürün kataloğundan dilediğiniz malzemeleri ekleyin."
          action={<Button onClick={p.onClose}>Kataloğa Dön</Button>}
        />
      ) : (
        <form onSubmit={p.onSubmit} className="grid gap-5">
          {/* Step 1: Cart Items */}
          <section className="bg-base-surface-2 p-3.5 rounded-xl border border-border">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Sepetteki Ürünler</span>
              <button
                type="button"
                onClick={p.onClear}
                className="text-xs text-text-muted hover:text-ui-danger transition-colors cursor-pointer font-medium"
              >
                Sepeti Temizle
              </button>
            </div>

            <div className="divide-y divide-border">
              {p.cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-text-primary truncate">{item.product.name}</h3>
                    <div className="text-[11px] text-text-muted">
                      {formatMoney(item.product.price)} / {item.product.unit} (KDV Hariç)
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <QuantityStepper
                      label={`${item.product.name} miktarı`}
                      value={item.quantity}
                      min={Math.min(item.product.minOrderQuantity || 1, item.quantity)}
                      max={Math.max(item.quantity, item.product.stock)}
                      onChange={(n) => p.onQuantity(item.product.id, n)}
                    />
                    <div className="w-20 text-right font-bold text-xs sm:text-sm font-mono text-text-primary">
                      {formatMoney(item.product.price * item.quantity)}
                    </div>
                    <button
                      type="button"
                      onClick={() => p.onRemove(item.product.id)}
                      className="p-1.5 text-text-muted hover:text-ui-danger transition-colors cursor-pointer"
                      title="Sepetten Çıkar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {!p.user ? (
            <FeedbackState
              kind="unauthorized"
              title="Sipariş Vermek İçin Bayi Girişi Yapın"
              description="Kurumsal iskontolarınız ve teslimat adresleriniz ile sipariş oluşturmak için giriş yapmalısınız."
              action={<Button onClick={p.onLogin}>Bayi Girişi Yap</Button>}
            />
          ) : (
            <>
              {/* Step 2: Delivery & Address */}
              <fieldset disabled={p.busy} className="bg-base-surface-2 p-3.5 rounded-xl border border-border grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-info-text" />
                    <span>Teslimat & Şantiye Bilgileri</span>
                  </span>
                  <Button variant="ghost" size="small" onClick={p.onSite}>
                    Kayıtlı Adresler
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <TextInput
                    label="Teslim Alacak Yetkili"
                    required
                    autoComplete="name"
                    value={p.fields.name}
                    onChange={(e) => p.onField('name', e.target.value)}
                  />
                  <TextInput
                    label="İletişim Telefonu"
                    required
                    type="tel"
                    autoComplete="tel"
                    value={p.fields.phone}
                    onChange={(e) => p.onField('phone', e.target.value)}
                  />
                </div>
                <TextInput
                  label="E-posta Adresi"
                  required
                  type="email"
                  autoComplete="email"
                  value={p.fields.email}
                  onChange={(e) => p.onField('email', e.target.value)}
                />
                <Textarea
                  label="Teslimat / Şantiye Adresi"
                  required
                  autoComplete="street-address"
                  value={p.fields.address}
                  onChange={(e) => p.onField('address', e.target.value)}
                />
                <TextInput
                  label="Sipariş Notu / Özel Talimat (İsteğe bağlı)"
                  value={p.fields.notes}
                  onChange={(e) => p.onField('notes', e.target.value)}
                />
              </fieldset>

              {/* Step 3: Payment Method */}
              <fieldset disabled={p.busy} className="bg-base-surface-2 p-3.5 rounded-xl border border-border grid gap-3">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-info-text" />
                  <span>Ödeme Yöntemi</span>
                </span>

                <div className="shopping-payment">
                  {(
                    [
                      ['bank_transfer', 'Havale / EFT'],
                      ['current_account', 'Cari Hesap'],
                      ['credit_card', 'Kredi Kartı'],
                      ['on_delivery', 'Teslimatta Ödeme'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={p.payment === value}
                        onChange={() => p.onPayment(value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {p.payment === 'bank_transfer' && bank && (
                  <div className="shopping-bank mt-2">
                    <Select label="Havale Yapılacak Banka" value={p.bankIndex} onChange={(e) => p.onBank(Number(e.target.value))}>
                      {p.banks.map((b, i) => (
                        <option key={i} value={i}>
                          {b.bankName} - {b.branch}
                        </option>
                      ))}
                    </Select>
                    <div className="bg-base-surface p-2.5 rounded-lg border border-border">
                      <div className="text-[11px] text-text-muted">Hesap Sahibi:</div>
                      <div className="font-semibold text-xs text-text-primary mb-1">{bank.accountName}</div>
                      <div className="text-[11px] text-text-muted">IBAN:</div>
                      <div className="font-mono font-bold text-xs text-text-primary mb-2 select-all">{bank.iban}</div>
                      <Button variant="secondary" size="small" onClick={() => p.onCopy(bank.iban)}>
                        {p.copied === bank.iban ? <><Check className="w-3.5 h-3.5 text-success-text"/> IBAN Kopyalandı</> : <><Copy className="w-3.5 h-3.5"/> IBAN Kopyala</>}
                      </Button>
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Order Totals Summary */}
              <div className="shopping-totals bg-base-surface-2 p-3.5 rounded-xl border border-border">
                <div>
                  <span className="text-text-secondary text-xs">Ara Toplam (KDV Hariç)</span>
                  <span className="font-mono font-semibold">{formatMoney(p.subtotal)}</span>
                </div>
                <div>
                  <span className="text-text-secondary text-xs">Hesaplanan KDV (%20)</span>
                  <span className="font-mono font-semibold">{formatMoney(p.tax)}</span>
                </div>
                <div className="pt-2 border-t border-border text-base font-bold">
                  <span>Ödenecek Genel Toplam</span>
                  <span className="font-mono text-text-primary font-black">{formatMoney(p.total)}</span>
                </div>
              </div>

              {p.error && <FeedbackState kind="error" title="Sipariş İletilemedi" description={p.error} />}

              <Button type="submit" loading={p.busy} size="large" className="w-full">
                <span>Siparişi Onayla & Gönder</span>
              </Button>
              <p className="text-[11px] text-center text-text-muted">
                Siparişiniz kontrol ve sevkiyat planlaması için Alpha Teknik operasyon ekibine anında iletilir.
              </p>
            </>
          )}
        </form>
      )}
    </dialog>
  );
}

