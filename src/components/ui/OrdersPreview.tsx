import {useEffect,useState} from 'react';
import OrderTracking from '../customer/OrderTracking';
import {Select} from './index';
import type {Order,User} from '../../types';
import {ORDER_STATUS_CONFIG} from '../../utils/statusConfig';
const user:User={id:'preview',name:'Örnek Müşteri',email:'ornek@example.com',role:'customer',createdAt:''};
const statuses=Object.keys(ORDER_STATUS_CONFIG);
const orders:Order[]=[...statuses,'shipped','unknown'].map((status,i)=>({id:`example-${i}`,orderNumber:`ÖRNEK-2026-${i+1}`,customerName:'Örnek Mekanik Tesisat ve Endüstriyel Yapı Malzemeleri Limited Şirketi',customerEmail:user.email,customerPhone:'05550000000',customerAddress:'Örnek Mahallesi, Uzun Sokak, Endüstriyel Tesisler Sitesi, B Blok Kat 3, İstanbul',items:[{productId:'sample',productName:'Uzun ürün adı: güçlendirilmiş pirinç bağlantı adaptörü '+ 'A'.repeat(80),quantity:2,unit:'Adet',unitPrice:285,totalPrice:570}],subtotal:570,discount:0,tax:114,total:684,paymentMethod:'Banka havalesi',receiptStatus:i===1?'verified':i===2?'uploaded':'none',status:status as Order['status'],createdAt:'2026-09-10T09:00:00Z',updatedAt:'2026-09-14T09:00:00Z',statusHistory:i===8?[]:(status==='cancelled'?['pending','cancelled']:statuses.slice(0,Math.min(i+1,6))).map((value,j)=>({status:value as Order['status'],timestamp:`2026-09-${10+Math.floor(j/2)}T${j%2?'14':'09'}:00:00Z`}))}));
orders.push({...orders[0],id:'other',orderNumber:'BAŞKA-MÜŞTERİ-GİZLİ',customerEmail:'other@example.com'});
export default function OrdersPreview(){
 const [theme,setTheme]=useState('light'),[scenario,setScenario]=useState('ready');
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.body.classList.add('ui-preview-active');return()=>{delete document.documentElement.dataset.theme;document.body.classList.remove('ui-preview-active');};},[theme]);
 return <main className="ui-scope ui-preview"><div className="ui-preview-header"><p>Faz 4E · Tamamen örnek veriler</p><Select label="Tema" value={theme} onChange={e=>setTheme(e.target.value)}><option value="light">Açık</option><option value="dark">Koyu</option></Select><Select label="Senaryo" value={scenario} onChange={e=>setScenario(e.target.value)}><option value="ready">Normal</option><option value="loading">Yükleniyor</option><option value="empty">Boş liste</option><option value="error">Hata</option><option value="guest">Girişsiz</option><option value="other">Diğer müşteri</option></Select></div><div key={scenario}><OrderTracking orders={scenario==='empty'?[]:orders} user={scenario==='guest'?null:scenario==='other'?{...user,email:'different@example.com'}:user} loading={scenario==='loading'} error={scenario==='error'?'Örnek bağlantı hatası.':undefined} onRetry={()=>setScenario('ready')} onLogin={()=>setScenario('ready')}/></div></main>;
}
