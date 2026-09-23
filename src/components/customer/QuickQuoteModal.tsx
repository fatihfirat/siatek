import React, { useState, useEffect, useRef } from 'react';
import { Product, QuoteRequestedItem, User } from '../../types';
import { FileText, Plus, Trash2, ShieldCheck, Send, X, Lock, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { Button, TextInput, Textarea, Select, NumberInput, Modal, FeedbackState } from '../ui';
import './shopping.css';
import { encryptPayload } from '../../lib/crypto';

interface QuickQuoteModalProps {
  products: Product[];
  initialItems?: QuoteRequestedItem[];
  currentUser?: User | null;
  onClose: () => void;
  onSubmit: (quoteData: any) => Promise<void>;
}

export default function QuickQuoteModal({
  products,
  initialItems = [],
  currentUser,
  onClose,
  onSubmit,
}: QuickQuoteModalProps) {
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerCompany, setCustomerCompany] = useState(currentUser?.companyName || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [deliveryCity, setDeliveryCity] = useState(currentUser?.city || '');
  const [customerNote, setCustomerNote] = useState('');
  const [confidentialNote, setConfidentialNote] = useState('');

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      setCustomerCompany(currentUser.companyName || '');
      setCustomerEmail(currentUser.email);
      setCustomerPhone(currentUser.phone || '');
      setDeliveryCity(currentUser.city || '');
    }
  }, [currentUser]);
  
  const [items, setItems] = useState<QuoteRequestedItem[]>(initialItems);
  const submitLock = useRef(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(true);

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        productId: defaultProd?.id,
        productName: defaultProd?.name || 'Yeni Ürün Talebi',
        requestedQuantity: 5,
        unit: defaultProd?.unit || 'Adet',
        targetUnitPrice: defaultProd?.price || 0,
        note: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    if (!prodId) { setItems(prev=>prev.map((item,i)=>i===index?{...item,productId:undefined,productName:''}:item)); return; }
    const selected = products.find(p => p.id === prodId);
    if (selected) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: selected.id,
        productName: selected.name,
        unit: selected.unit,
        requestedQuantity: Math.max(selected.minOrderQuantity || 1, updated[index]?.requestedQuantity || 1),
        targetUnitPrice: Math.round(selected.price * 0.9),
      };
      setItems(updated);
    }
  };

  const handleUpdateItem = (index: number, field: keyof QuoteRequestedItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || items.length === 0) return;
    submitLock.current = true;
    setError('');

    setLoading(true);
    try {
      let encryptedPayloadStr = '';
      if (isEncrypted && confidentialNote.trim()) {
        encryptedPayloadStr = await encryptPayload({
          confidentialNote,
          budgetTarget: 'Private Commercial Data',
          clientTimestamp: new Date().toISOString(),
        });
      }

      await onSubmit({
        customerName,
        customerCompany,
        // Guvenlik: e-posta oturumdan alinir (Firestore kurali bunu zorunlu kilar).
        customerEmail: currentUser?.email || customerEmail,
        customerPhone,
        deliveryCity,
        requestedItems: items,
        customerNote,
        encryptedConfidentialNote: encryptedPayloadStr,
      });

      onClose();
    } catch {
      setError('Talebiniz gönderilemedi. Bilgileriniz korundu; tekrar deneyebilirsiniz.');
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  };

  return <Modal open title="Teklif iste" onClose={()=>{if(!loading)onClose();}}>
    <form className="ui-scope shopping-quote shopping-fields" onSubmit={handleSubmit}>
      <p>İhtiyacınız olan ürünleri ve miktarları ekleyin. Fiyat teklifinizi hesabınızdan takip edin.</p>
      <TextInput label="Ad soyad" required value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
      <TextInput label="Firma" value={customerCompany} onChange={e=>setCustomerCompany(e.target.value)}/>
      <TextInput label="E-posta" type="email" required value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)}/>
      <TextInput label="Telefon" type="tel" required value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
      <TextInput label="Teslimat şehri" value={deliveryCity} onChange={e=>setDeliveryCity(e.target.value)}/>
      {items.length===0&&<FeedbackState kind="empty" title="Ürün ekleyin" description="Teklif almak istediğiniz malzemeleri seçin."/>}
      {items.map((item,index)=><fieldset key={index} className="shopping-fields" disabled={loading} style={{border:0,borderBottom:'1px solid var(--border-color)',padding:'16px 0'}}>
        <legend>Ürün {index+1}</legend>
        <Select label={`Ürün ${index+1}`} value={item.productId||''} onChange={e=>handleProductSelect(index,e.target.value)}><option value="">Özel ürün</option>{products.map(p=><option value={p.id} key={p.id}>{p.name} · {p.sku}</option>)}</Select>
        {!item.productId&&<TextInput label="Ürün adı" required value={item.productName} onChange={e=>handleUpdateItem(index,'productName',e.target.value)}/>}
        <NumberInput label="Miktar" min={1} required value={item.requestedQuantity} onChange={e=>handleUpdateItem(index,'requestedQuantity',Number(e.target.value))}/>
        <NumberInput label="Hedef birim fiyat (₺)" min={0} step="0.01" value={item.targetUnitPrice||0} onChange={e=>handleUpdateItem(index,'targetUnitPrice',Number(e.target.value))}/>
        <TextInput label="Ürün notu" value={item.note||''} onChange={e=>handleUpdateItem(index,'note',e.target.value)}/>
        <Button variant="ghost" onClick={()=>handleRemoveItem(index)}>Ürün {index+1} kaldır</Button>
      </fieldset>)}
      <Button variant="secondary" disabled={loading} onClick={handleAddItem}>Ürün ekle</Button>
      <Textarea label="Talep notu" value={customerNote} onChange={e=>setCustomerNote(e.target.value)}/>
      <Textarea label="Özel ticari not (isteğe bağlı)" value={confidentialNote} onChange={e=>setConfidentialNote(e.target.value)}/>
      {error&&<FeedbackState kind="error" title="Teklif gönderilemedi" description={error}/>}
      <Button type="submit" loading={loading} disabled={items.length===0}>Teklif talebini gönder</Button>
    </form>
  </Modal>;
}
