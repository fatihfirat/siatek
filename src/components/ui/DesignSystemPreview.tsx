import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Moon, Sun, ShoppingCart, Trash2, Check, Package } from 'lucide-react';
import { Button, IconButton, TextInput, SearchInput, QuantityStepper, StatusBadge, Section, KPI, ProductRow, OrderRow, Skeleton, FeedbackState, Modal, Toast, ToggleSwitch, MenuItem } from './index';

export default function DesignSystemPreview() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(false);
  const [sampleAudio, setSampleAudio] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const old = root.dataset.theme; const wasLight = root.classList.contains('light');
    document.body.classList.add('ui-preview-active');
    root.dataset.theme = theme; root.classList.toggle('light', theme === 'light');
    return () => { document.body.classList.remove('ui-preview-active'); if (old) root.dataset.theme = old; else delete root.dataset.theme; root.classList.toggle('light', wasLight); };
  }, [theme]);
  const productName = 'PPRC Kompozit Boru 25 mm • PN20';
  const matches = `${productName} AT-025`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'));
  const add = () => {setCart(n => n + quantity); setToast(`${quantity} adet ürün örnek sepete eklendi.`);};
  return <div className="ui-scope ui-preview">
    <header className="ui-preview-header"><div><p className="ui-hint">Tasarım önizlemesi · Faz 4A · Örnek veriler</p><h1>Alpha Teknik</h1></div><div className="ui-actions"><StatusBadge tone="success">Ortak UI temeli</StatusBadge><IconButton label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun/> : <Moon/>}</IconButton></div></header>
    <Section title="Günlük özet"><div className="ui-kpis"><KPI label="Bekleyen sipariş" value="12" hint="4 sipariş bugün teslim edilecek"/><KPI label="Günlük satış" value="128.450,00 ₺" hint="18 tamamlanan satış"/><KPI label="Kritik stok" value="7 ürün" hint="Satın alma kontrolü bekliyor"/></div></Section>
    <Section title="Kayan anahtarlar ve menü öğeleri">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <ToggleSwitch label="Koyu tema" description="Arayüz renk modu" checked={theme === 'dark'} onChange={checked => setTheme(checked ? 'dark' : 'light')} />
        <ToggleSwitch label="Bildirim sesi" description="İşlem sesli uyarıları" checked={sampleAudio} onChange={setSampleAudio} />
        <MenuItem icon={<Package aria-hidden="true" />} label="Ürün yönetimi" description="Katalog ve stok masası" onClick={() => setToast('Ürün yönetimi tıklandı.')} />
        <MenuItem icon={<Check aria-hidden="true" />} label="Güvenlik ayarları" description="Şifreleme ve 2FA" onClick={() => setToast('Güvenlik ayarları tıklandı.')} />
      </div>
    </Section>
    <Section title="Ürünler"><SearchInput value={query} onValueChange={setQuery}/>{matches ? <ProductRow name={productName} code="AT-025 · Metre" price="185,00 ₺"><StatusBadge tone="success">Stokta: 24</StatusBadge><QuantityStepper value={quantity} onChange={setQuantity} max={24}/><Button onClick={add}><ShoppingCart aria-hidden="true"/>Sepete ekle</Button></ProductRow> : <FeedbackState kind="empty" title="Ürün bulunamadı" description="Aramanızla eşleşen ürün yok." action={<Button variant="secondary" onClick={() => setQuery('')}>Aramayı temizle</Button>}/>}
    <div className="ui-row"><span className="ui-hint" aria-live="polite">Örnek sepet: {cart} adet</span><Button variant="secondary" onClick={() => setOpen(true)}>Sipariş özeti<ArrowRight aria-hidden="true"/></Button></div></Section>
    <Section title="Son siparişler"><OrderRow number="SİP-2026-0042" customer="Örnek Mekanik Tesisat ve Mühendislik Ltd. Şti." total="24.850,00 ₺" status={<StatusBadge tone="warning">Onay bekliyor</StatusBadge>}><Button variant="secondary" onClick={() => setOpen(true)}>İncele<ArrowRight aria-hidden="true"/></Button></OrderRow><OrderRow number="SİP-2026-0041" customer="Örnek Yapı Projesi" total="8.320,00 ₺" status={<StatusBadge tone="success">Teslim edildi</StatusBadge>}/></Section>
    <div className="ui-preview-grid"><Section title="İşlemler"><div className="ui-actions"><Button onClick={() => setToast('Örnek değişiklik kaydedildi.')}><Check aria-hidden="true"/>Kaydet</Button><Button variant="secondary" onClick={() => setToast('Örnek işlem iptal edildi.')}>Vazgeç</Button><Button variant="destructive" onClick={() => {setCart(0); setToast('Örnek sepet temizlendi.');}}><Trash2 aria-hidden="true"/>Temizle</Button><IconButton label="Bildirimleri göster" onClick={() => setToast('Yeni bildiriminiz yok.')}><Bell/></IconButton><Button disabled>Yetki gerekli</Button><Button loading>Kaydediliyor</Button></div></Section>
    <Section title="Durumlar"><div className="ui-actions"><StatusBadge tone="neutral">Taslak</StatusBadge><StatusBadge tone="info">Hazırlanıyor</StatusBadge><StatusBadge tone="warning">Kritik stok</StatusBadge><StatusBadge tone="success">Tamamlandı</StatusBadge><StatusBadge tone="error">İptal edildi</StatusBadge></div></Section></div>
    <div className="ui-preview-grid"><Section title="Sipariş bilgileri"><form onSubmit={e => {e.preventDefault(); setSaved(true); if(reference.trim()) setToast('Örnek referans kaydedildi.');}}><TextInput label="Müşteri referansı" value={reference} onChange={e => setReference(e.target.value)} error={saved && !reference.trim() ? 'Müşteri referansını girin.' : undefined} hint="Örneğin: Şantiye A / Eylül"/><div style={{marginTop: 16}}><Button type="submit">Referansı kaydet</Button></div></form></Section>
    <Section title="Yükleme ve geri bildirim"><Skeleton/>{retry ? <FeedbackState kind="empty" title="Henüz sipariş yok" description="Oluşturulan siparişler burada listelenir."/> : <FeedbackState kind="error" title="Siparişler yüklenemedi" description="Bağlantıyı kontrol edip yeniden deneyin." action={<Button variant="secondary" onClick={() => setRetry(true)}>Tekrar dene</Button>}/>}</Section></div>
    <Section title="Renkler"><div className="ui-swatches">{[['Ana işlem','--ui-primary'],['Yüzey','--bg-surface'],['Bilgi','--ui-info'],['Uyarı','--ui-warning'],['Hata','--ui-danger']].map(([label, token]) => <div className="ui-swatch" key={token}><span style={{background: `var(${token})`}}/>{label}</div>)}</div></Section>
    <Modal open={open} onClose={() => setOpen(false)} title="Sipariş özeti" footer={<Button onClick={() => {setOpen(false); setToast('Örnek sipariş taslağı kaydedildi.');}}>Taslağı kaydet</Button>}><StatusBadge tone="neutral">Örnek taslak</StatusBadge><div className="ui-row"><Package aria-hidden="true"/><div className="ui-row-body"><h3>{productName}</h3><p>{cart} adet · {(cart * 185).toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</p></div></div></Modal>
    <Toast message={toast} onClose={() => setToast(null)}/>
  </div>;
}
