import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, MessageCircle, PackageSearch, ShoppingBag, Wrench, X } from 'lucide-react';
import { useCompanySettings } from '../../lib/companySettings';

type SupportFlow = 'order' | 'tracking' | 'technical';

const flows = {
  order: { label: 'Yeni sipariş', prompt: 'İhtiyacınız olan ürünleri veya ürün grubunu kısaca yazın.', placeholder: 'Örn. 20 adet vana, 10 adet dirsek…', icon: ShoppingBag },
  tracking: { label: 'Sipariş takibi', prompt: 'Sipariş numaranızı yazın, ekibimiz güncel durumu kontrol etsin.', placeholder: 'Örn. SI-2048', icon: PackageSearch },
  technical: { label: 'Teknik destek', prompt: 'Sorunu veya destek istediğiniz ürünü kısaca anlatın.', placeholder: 'Örn. Kombi bağlantı seti hakkında…', icon: Wrench },
} satisfies Record<SupportFlow, { label: string; prompt: string; placeholder: string; icon: typeof ShoppingBag }>;

export default function FloatingWhatsAppButton() {
  const settings = useCompanySettings();
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<SupportFlow | null>(null);
  const [detail, setDetail] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const outside = (event: PointerEvent) => { if (!panelRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('pointerdown', outside); };
  }, [open]);

  useEffect(() => { if (flow) requestAnimationFrame(() => inputRef.current?.focus()); }, [flow]);

  if (settings.whatsappSupportEnabled === false) return null;
  const company = settings.shortName || 'Alpha Teknik';
  const phone = (settings.whatsapp || settings.phone || '+905444409180').replace(/\D/g, '');
  const reset = () => { setFlow(null); setDetail(''); };
  const close = () => { setOpen(false); reset(); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!flow || !detail.trim()) return;
    const subjects = { order: 'yeni sipariş oluşturmak istiyorum', tracking: 'siparişimin durumunu öğrenmek istiyorum', technical: 'teknik destek almak istiyorum' };
    const message = `Merhaba, ${company} üzerinden ${subjects[flow]}.\n\n${flows[flow].label}: ${detail.trim()}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    close();
  };

  return <aside ref={panelRef} className="whatsapp-concierge" aria-label="WhatsApp sipariş ve destek">
    {open && <section className="whatsapp-concierge__panel" role="dialog" aria-labelledby="whatsapp-concierge-title">
      <header className="whatsapp-concierge__header">
        <div className="whatsapp-concierge__identity"><span><MessageCircle /></span><div><b id="whatsapp-concierge-title">{company} Destek</b><small><i /> WhatsApp hattı</small></div></div>
        <button type="button" onClick={close} aria-label="Destek penceresini kapat"><X /></button>
      </header>
      <div className="whatsapp-concierge__conversation" aria-live="polite">
        <div className="whatsapp-concierge__message is-agent"><span>AT</span><p>Merhaba! Size nasıl yardımcı olabiliriz?</p></div>
        {!flow ? <div className="whatsapp-concierge__choices">
          {(Object.entries(flows) as Array<[SupportFlow, (typeof flows)[SupportFlow]]>).map(([id, item]) => { const Icon = item.icon; return <button type="button" key={id} onClick={() => setFlow(id)}><span><Icon /></span><b>{item.label}</b><small>Seç</small></button>; })}
        </div> : <>
          <div className="whatsapp-concierge__message is-user"><p>{flows[flow].label}</p></div>
          <div className="whatsapp-concierge__message is-agent"><span>AT</span><p>{flows[flow].prompt}</p></div>
          <form className="whatsapp-concierge__form" onSubmit={submit}>
            <label htmlFor="whatsapp-support-detail">Mesajınız</label>
            <textarea ref={inputRef} id="whatsapp-support-detail" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={flows[flow].placeholder} rows={3} maxLength={500} />
            <div><button type="button" className="is-back" onClick={reset}><ArrowLeft /> Geri</button><button type="submit" className="is-send" disabled={!detail.trim()}>WhatsApp’ta devam et <ExternalLink /></button></div>
          </form>
        </>}
      </div>
      <footer>Mesajınız WhatsApp’ta güvenle açılır.</footer>
    </section>}
    <button type="button" className={`whatsapp-concierge__launcher${open ? ' is-open' : ''}`} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="dialog" aria-label={open ? 'WhatsApp desteğini kapat' : 'WhatsApp sipariş ve desteği aç'} title={open ? 'Kapat' : 'Sipariş & Destek'}>{open ? <X /> : <MessageCircle />}</button>
  </aside>;
}
