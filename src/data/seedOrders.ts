import { Order, OrderItem } from '../types';
import { STOCK_PDF_PRODUCTS } from './stockProducts';

const CUSTOMERS = [
  { name: 'Yılmaz Doğalgaz & Mekanik Taahhüt Ltd.', email: 'yilmaz@mekanik.com.tr', phone: '+90 532 455 12 34', address: 'İkitelli OSB Triko Dokumacılar Sit. M Blok No:14, Başakşehir / İstanbul' },
  { name: 'Kaya İnşaat Yapı Malzemeleri A.Ş.', email: 'siparis@kayayapi.com', phone: '+90 541 789 90 21', address: 'Levent Mah. Nispetiye Cad. No:42 D:8, Beşiktaş / İstanbul' },
  { name: 'Kuzey Tesisat & Mühendislik Ltd.', email: 'kuzey@muhendislik.com.tr', phone: '+90 533 112 33 44', address: 'Gebze Organize Sanayi Bölgesi 400. Sokak No:12, Kocaeli' },
  { name: 'Boğaziçi Yapı Market & Sıhhi Tesisat', email: 'muhasebe@bogaziciyapi.com', phone: '+90 530 890 12 45', address: 'Bağdat Cad. No:184/B, Kadıköy / İstanbul' },
  { name: 'Anadolu Isı Sistemleri & Mühendislik', email: 'info@anadoluisisistemleri.com', phone: '+90 535 678 23 11', address: 'Ostim OSB 1234. Cad. No:56, Yenimahalle / Ankara' },
  { name: 'Ege Tesisat & Mekanik Proje Ltd.', email: 'siparis@egetesisat.com', phone: '+90 542 334 55 66', address: 'Atatürk Org. San. Bölgesi 10006 Sok. No:8, Çiğli / İzmir' },
  { name: 'Marmara Toptan Yapı & Tesisat', email: 'info@marmaratoptan.com', phone: '+90 536 211 44 77', address: 'Güzelyurt Mah. Mimar Sinan Cad. No:19, Esenyurt / İstanbul' },
  { name: 'Çözüm Mekanik Proje Taahhüt A.Ş.', email: 'satis@cozummekanik.com', phone: '+90 538 900 88 12', address: 'Batı Ataşehir Barbaros Mah. Ihlamur Bulvarı No:3, Ataşehir / İstanbul' },
  { name: 'Akdeniz İklimlendirme & Isı Market', email: 'antalya@akdenizisi.com', phone: '+90 544 556 77 88', address: 'Muratpaşa Mah. Evliya Çelebi Cad. No:45, Muratpaşa / Antalya' },
  { name: 'Bursa Tesisat & Radyatör Dünyası', email: 'siparis@bursatesisat.com.tr', phone: '+90 533 876 54 32', address: 'Nilüfer Küçük Sanayi Sitesi 24. Blok No:18, Nilüfer / Bursa' },
];

export function generate30DaysHistoricalOrders(): Order[] {
  const orders: Order[] = [];
  const products = STOCK_PDF_PRODUCTS;
  if (!products || products.length === 0) return [];

  // Anchor to recent time
  const now = Date.now();
  const dayMs = 86400000;

  // Day distribution: 30 days back (Day 29 back to Day 0 today)
  // Higher sales on weekdays, slight dips on weekends
  let orderSeq = 8801;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now - dayOffset * dayMs);
    const dayOfWeek = targetDate.getDay(); // 0 is Sun, 6 is Sat
    
    // Determine order count for this day (1-3 on weekdays, 0-2 on weekends)
    const dailyCount = (dayOfWeek === 0 || dayOfWeek === 6)
      ? (dayOffset % 2 === 0 ? 1 : 2)
      : (2 + ((dayOffset * 7) % 3));

    for (let k = 0; k < dailyCount; k++) {
      const cust = CUSTOMERS[(orderSeq + k + dayOffset) % CUSTOMERS.length];
      const hourOffset = 9 + (k * 3) + ((dayOffset * 3) % 4);
      const minuteOffset = (k * 17 + dayOffset * 13) % 60;
      
      const orderTime = new Date(now - dayOffset * dayMs);
      orderTime.setHours(hourOffset, minuteOffset, 0, 0);

      // Select 1 to 4 distinct items from various categories
      const itemCount = 1 + ((orderSeq + dayOffset) % 4);
      const items: OrderItem[] = [];
      let subtotal = 0;

      for (let i = 0; i < itemCount; i++) {
        // Pick a product with good distribution across ranges
        const prodIndex = (dayOffset * 47 + k * 113 + i * 277) % products.length;
        const prod = products[prodIndex] || products[0];
        
        let qty = 1;
        if (prod.unit === 'METRE') {
          qty = 50 + ((orderSeq * 10 + i * 20) % 250);
        } else if (prod.price < 100) {
          qty = 10 + ((orderSeq * 5 + i * 5) % 40);
        } else if (prod.price < 500) {
          qty = 2 + ((orderSeq * 2 + i) % 8);
        } else if (prod.price < 2000) {
          qty = 1 + ((orderSeq + i) % 4);
        } else {
          qty = 1 + (i % 2);
        }

        const unitPrice = prod.price;
        const totalPrice = Math.round(unitPrice * qty);
        subtotal += totalPrice;

        items.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unit: prod.unit,
          unitPrice,
          totalPrice,
          note: i === 0 ? 'Orijinal ambalajında sevk edilsin' : undefined,
        });
      }

      const discountRate = subtotal > 15000 ? 0.05 : (subtotal > 5000 ? 0.03 : 0);
      const discount = Math.round(subtotal * discountRate);
      const taxable = subtotal - discount;
      const tax = Math.round(taxable * 0.20);
      const total = taxable + tax;

      // Realistic order status based on age
      let status: Order['status'] = 'delivered';
      if (dayOffset === 0) {
        status = k === 0 ? 'pending' : 'approved';
      } else if (dayOffset === 1) {
        status = k === 0 ? 'preparing' : 'shipped';
      } else if (dayOffset <= 3) {
        status = 'shipped';
      } else {
        status = 'delivered';
      }

      const orderNumber = `SIP-2026-${orderSeq}`;
      const trackingNo = status === 'shipped' || status === 'delivered' ? `YK-${orderSeq}9182TR` : undefined;

      // Generate status history chronology
      const statusHistory = [];
      const tCreated = new Date(orderTime.getTime());
      statusHistory.push({
        id: `sh-${orderSeq}-1`,
        status: 'pending' as const,
        timestamp: tCreated.toISOString(),
        note: 'Sipariş müşteri portalından oluşturuldu.',
        updatedBy: cust.name,
      });

      if (status !== 'pending') {
        const tApproved = new Date(tCreated.getTime() + 15 * 60 * 1000);
        statusHistory.push({
          id: `sh-${orderSeq}-2`,
          status: 'approved' as const,
          timestamp: tApproved.toISOString(),
          note: 'Cari limit ve fiyatlar onaylandı, sipariş kayda alındı.',
          updatedBy: 'Ahmet Y. (Yönetici)',
        });
      }

      if (status === 'preparing' || status === 'shipped' || status === 'delivered') {
        const tPreparing = new Date(tCreated.getTime() + 45 * 60 * 1000);
        statusHistory.push({
          id: `sh-${orderSeq}-3`,
          status: 'preparing' as const,
          timestamp: tPreparing.toISOString(),
          note: 'Depo rafından toplandı ve çeki listesi ile paketlendi.',
          updatedBy: 'Mehmet K. (Depo Sorumlusu)',
        });
      }

      if (status === 'shipped' || status === 'delivered') {
        const tShipped = new Date(tCreated.getTime() + 120 * 60 * 1000);
        statusHistory.push({
          id: `sh-${orderSeq}-4`,
          status: 'shipped' as const,
          timestamp: tShipped.toISOString(),
          note: `Alpha Teknik sevkiyat aracına (63 AT 941) yüklendi ve dağıtıma çıkarıldı. Sevkiyat Ref: ${trackingNo}`,
          updatedBy: 'Ali V. (Sevkiyat Sorumlusu)',
          trackingNumber: trackingNo,
        });
      }

      let deliveredAt: string | undefined = undefined;
      let paymentStatus: Order['paymentStatus'] = undefined;
      let settlementChannel: Order['settlementChannel'] = undefined;
      let collectionStatus: Order['collectionStatus'] = undefined;
      let collectionAmount: number | undefined = undefined;

      if (status === 'delivered') {
        const tDelivered = new Date(tCreated.getTime() + 26 * 60 * 60 * 1000);
        deliveredAt = tDelivered.toISOString();
        // Realistic distribution: mostly paid or on_account, occasional pending_collection to demonstrate alert
        if (orderSeq % 5 === 0) {
          paymentStatus = 'pending_collection';
          collectionStatus = 'pending';
        } else if (orderSeq % 2 === 0) {
          paymentStatus = 'on_account';
          settlementChannel = 'cari';
          collectionStatus = 'none';
        } else {
          paymentStatus = 'paid';
          settlementChannel = orderSeq % 3 === 0 ? 'pos' : 'cash';
          collectionStatus = 'collected';
          collectionAmount = total;
        }

        statusHistory.push({
          id: `sh-${orderSeq}-5`,
          status: 'delivered' as const,
          timestamp: tDelivered.toISOString(),
          note: 'Şantiye yetkilisine imza karşılığı teslim edildi.',
          updatedBy: 'Ahmet Yılmaz (Alpha Teknik Şoför)',
          trackingNumber: trackingNo,
        });
      }
      
      orders.push({
        id: `ord-${orderSeq}`,
        orderNumber,
        customerName: cust.name,
        customerEmail: cust.email,
        customerPhone: cust.phone,
        customerAddress: cust.address,
        items,
        subtotal,
        discount,
        tax,
        total,
        status,
        paymentStatus,
        settlementChannel,
        collectionStatus,
        collectionAmount,
        deliveredAt,
        notes: dayOffset === 0 ? 'Acil şantiye ihtiyacı, sabah erken sevk rica olunur.' : undefined,
        signatureHash: `e3b0c44298fc${orderSeq}9afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
        trackingNumber: trackingNo,
        statusHistory,
        createdAt: orderTime.toISOString(),
        updatedAt: orderTime.toISOString(),
      });

      orderSeq++;
    }
  }

  return orders;
}
