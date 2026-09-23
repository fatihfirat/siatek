import {useEffect,useState} from 'react';
import CustomerPortal from '../customer/CustomerPortal';
import MobileBottomNav from '../common/MobileBottomNav';
import CustomerAccount from '../customer/CustomerAccount';
import type {Product,Order,User} from '../../types';
import {Select} from './index';
import './reference.css';
const products:Product[]=[
 {id:'sample-valve',name:'Pirinç küresel vana',category:'Vanalar',description:'Tam geçişli pirinç gövde. 1 inç bağlantı.',price:285,stock:8,unit:'Adet',minOrderQuantity:1,imageUrl:'',sku:'VLV-025',brand:'Örnek Marka',barcode:'8690000000001'},
 {id:'sample-elbow',name:'PPRC dirsek 90 derece uzun ürün adı ve bağlantı adaptörü',category:'Bağlantı',description:'20 mm bağlantı parçası.',price:12.5,stock:24,unit:'Adet',minOrderQuantity:2,imageUrl:'',sku:'PPR-020'},
 {id:'sample-radiator',name:'Panel radyatör',category:'Isıtma',description:'600 mm panel radyatör.',price:1890,stock:0,unit:'Adet',minOrderQuantity:1,imageUrl:'',sku:'RAD-060'}
];
const user:User={id:'preview-customer',name:'Örnek Kullanıcı',email:'ornek@example.com',companyName:'Örnek Mekanik',phone:'05550000000',address:'Örnek Mahallesi 12, İstanbul',role:'customer',createdAt:''};
export default function ShoppingPreview(){
 const [theme,setTheme]=useState('dark'),[state,setState]=useState('ready');
 const [tab,setTab]=useState<'home'|'catalog'|'orders'|'quotes'>('catalog');
 const [cartOpen,setCartOpen]=useState(false),[count,setCount]=useState(0),[account,setAccount]=useState(false),[orders,setOrders]=useState<Order[]>([]),[requests,setRequests]=useState(0);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.body.classList.add('ui-preview-active');return()=>{delete document.documentElement.dataset.theme;document.body.classList.remove('ui-preview-active');};},[theme]);
 useEffect(()=>{const original=window.fetch;window.fetch=(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(new URL(url,location.href).pathname.startsWith('/api/'))return Promise.reject(new Error('Preview blocks live API requests'));return original(input,init);};return()=>{window.fetch=original;};},[]);
 const service={createOrder:async(payload:Record<string,unknown>)=>{setRequests(n=>n+1);await new Promise(resolve=>setTimeout(resolve,600));if(state==='error')throw new Error('Simulated error');const order={...payload,id:'preview-order',orderNumber:'ÖRNEK-0001',status:'pending',total:342,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),statusHistory:[]} as unknown as Order;setOrders([order]);return order;},requestQuote:async()=>{await new Promise(resolve=>setTimeout(resolve,200));if(state==='error')throw new Error('Simulated error');}};
 return <div className="ui-scope"><aside className="reference-controls"><p>Faz 4D · Örnek veriler · Gerçek sipariş gönderilmez</p><Select label="Tema" value={theme} onChange={e=>setTheme(e.target.value)}><option value="dark">Koyu</option><option value="light">Açık</option></Select><Select label="Senaryo" value={state} onChange={e=>setState(e.target.value)}><option value="ready">Normal</option><option value="error">Gönderim hatası</option><option value="guest">Girişsiz</option></Select><span data-testid="request-count">Gönderim: {requests}</span></aside><main className="reference-main shell-main" data-has-cart={count>0}>
 {account&&<CustomerAccount user={state==='guest'?null:user} onLogin={()=>setState('ready')} onSelect={id=>{if(id==='settings')return;setAccount(false);setTab(id==='quotes'?'quotes':'orders');}}/>}
 <div hidden={account}><CustomerPortal shoppingService={service} products={products} orders={orders} quotes={[]} currentUser={state==='guest'?null:user} activeTab={tab} onTabChange={setTab} onOpenAuth={()=>setState('ready')} onOpenAI={()=>{}} onRefresh={()=>{}} cartRequested={cartOpen} onCartClose={()=>setCartOpen(false)} onCartCountChange={setCount}/></div></main>
 <MobileBottomNav currentRole="customer" activeNav={account?'more':tab} cartItemCount={count} onNavChange={next=>{if(next==='more')setAccount(true);else if(next==='cart'){setAccount(false);setCartOpen(true);}else{setAccount(false);setTab(next==='orders'?'orders':next==='catalog'?'catalog':'home');}}}/>
 </div>;
}
