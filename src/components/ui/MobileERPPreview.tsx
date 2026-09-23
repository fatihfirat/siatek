import { useState } from 'react';
import { MobileCariOverview, MobileOverview, MobileQuickActionSheet, MobileStockOverview } from '../mobile/MobileERP';
import MobileBottomNav from '../common/MobileBottomNav';
import type { AdminTab, CariAccount, KasaHareketi, Product } from '../../types';
import '../admin/operations.css';

const now = new Date();
const iso = now.toISOString();
const old = new Date(now.getTime() - 45 * 86_400_000).toISOString();
const products: Product[] = [
  { id: 'p1', name: 'PPRC Boru', category: 'Boru', description: '', price: 120, stock: 2, unit: 'ADET', sku: 'P1', minOrderQuantity: 1, imageUrl: '' },
  { id: 'p2', name: 'Küresel Vana', category: 'Vana', description: '', price: 320, stock: 0, unit: 'ADET', sku: 'P2', minOrderQuantity: 1, imageUrl: '' },
];
const cariler: CariAccount[] = [
  { id: 'c1', code: 'CR-001', name: 'Ahmet', companyName: 'Atlas Endüstri', type: 'customer', phone: '', email: '', city: 'İstanbul', creditLimit: 500000, paymentTermDays: 30, balance: 1840600, totalDebit: 1900000, totalCredit: 59400, status: 'active', lastTransactionDate: old, createdAt: old, updatedAt: iso },
  { id: 'c2', code: 'CR-002', name: 'Siemens', companyName: 'Siemens Türkiye', type: 'supplier', phone: '', email: '', city: 'İstanbul', creditLimit: 500000, paymentTermDays: 30, balance: -684180, totalDebit: 0, totalCredit: 684180, status: 'active', createdAt: old, updatedAt: iso },
];
const cash: KasaHareketi[] = [
  { id: 'k1', tip: 'giris', kategori: 'satis_tahsilat', tutar: 84250, aciklama: 'Satış faturası', cariAdi: 'Atlas Endüstri', tarih: iso, createdAt: iso, updatedAt: iso },
  { id: 'k2', tip: 'cikis', kategori: 'tedarikci_odeme', tutar: 126000, aciklama: 'Tedarikçi ödemesi', cariAdi: 'Siemens Türkiye', tarih: iso, createdAt: iso, updatedAt: iso },
  { id: 'k3', tip: 'giris', kategori: 'cari_odeme', tutar: 48600, aciklama: 'Havale tahsilatı', cariAdi: 'Nova Yapı', tarih: old, createdAt: old, updatedAt: iso },
];

export default function MobileERPPreview() {
  const [active, setActive] = useState<AdminTab>('home');
  const [quick, setQuick] = useState(false);
  const navigate = (tab: AdminTab) => tab === 'pos' ? setQuick(true) : setActive(tab);
  return <div className="admin-workspace-shell" data-active-tab={active}><div className="admin-workspace-content"><main className="admin-workspace-main"><div className="admin-premium-surface">{active==='cariler'?<div className="mobile-admin-module-only"><MobileCariOverview userName="Fatih Fırat" accounts={cariler} setActive={navigate}/></div>:active==='products'?<div className="mobile-admin-module-only"><MobileStockOverview userName="Fatih Fırat" products={products} setActive={navigate}/></div>:<div className="admin-home-mobile-layout"><div className="admin-dashboard-mobile-only"><MobileOverview userName="Fatih Fırat" products={products} cariAccounts={cariler} cashMovements={cash} setActive={navigate} onCreate={()=>setQuick(true)} /></div></div>}</div></main></div><MobileBottomNav activeNav={active} onNavChange={(tab) => tab==='more'?document.dispatchEvent(new CustomEvent('siatek:open-mobile-admin-menu')):navigate(tab as AdminTab)} currentRole="admin" /><MobileQuickActionSheet open={quick} onClose={()=>setQuick(false)} onSelect={navigate}/></div>;
}
