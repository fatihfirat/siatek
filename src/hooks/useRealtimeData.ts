import { useState, useEffect, useCallback } from 'react';
import { Product, Order, Quote, PushNotification, UserRole } from '../types';
import { STOCK_PDF_PRODUCTS } from '../data/stockProducts';
import { 
  seedProductsIfEmpty, 
  subscribeToProducts,
  subscribeToOrders,
  subscribeToQuotes,
  subscribeToNotifications,
  markNotificationReadInFirestore,
  describeFirestoreReadError,
} from '../lib/firestoreService';

export function useRealtimeData(
  initialRole: UserRole = 'customer',
  accountId: string | null = null,
  /** Firebase Auth UID. Sahiplik bununla kurulur. */
  accountUid: string | null = null,
  isAdmin: boolean = false,
  /**
   * Firebase Auth durumu netlesene kadar false. Bu kapi olmadan uygulama
   * localStorage'daki ESKI kullaniciyla sorgu acabilir; ayni tarayicida
   * hesap degistirildiginde yanlis hesabin verisi istenmis olur.
   */
  authReady: boolean = false
) {
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [products, setProducts] = useState<Product[]>(() => {
    // Initial state initialized with default stock catalog for instant zero-lag rendering
    return STOCK_PDF_PRODUCTS && STOCK_PDF_PRODUCTS.length > 0 ? STOCK_PDF_PRODUCTS : [];
  });
  const [orders, setOrders] = useState<Order[]>([]);

  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  useEffect(() => {
    localStorage.removeItem('alpha_cached_orders');
    localStorage.removeItem('alpha_cached_quotes');
    setOrders([]);
    setQuotes([]);
    setNotifications([]);
  }, [accountId]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [connected, setConnected] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  // Seed Firestore if empty and connect Firestore Realtime Subscriptions
  useEffect(() => {
    seedProductsIfEmpty();

    // Kimlik kesinlesmeden hicbir ozel veri sorgusu acilmaz.
    if (!authReady) {
      setProductsLoading(false);
      setOrdersLoading(false);
      setQuotesLoading(false);
      setOrders([]);
      setQuotes([]);
      return () => {};
    }

    setProductsLoading(true);
    setOrdersLoading(true);
    setQuotesLoading(true);
    setProductsError('');
    setOrdersError('');
    setQuotesError('');
    setConnected(true);

    const unsubProducts = subscribeToProducts((firestoreProducts) => {
      if (firestoreProducts && firestoreProducts.length > 0) {
        setProducts(firestoreProducts);
      }
      setProductsLoading(false);
      setProductsError('');
    }, (error) => {
      setProductsLoading(false);
      setProductsError(describeFirestoreReadError(error));
      setConnected(false);
    });

    // Firestore kurallari musteriye sadece kendi kayitlarini okutur;
    // sorgu da ayni sekilde filtreli acilmali.
    const access = { uid: accountUid, isAdmin };

    const unsubOrders = subscribeToOrders((firestoreOrders) => {
      setOrders(firestoreOrders || []);
      setOrdersLoading(false);
      setOrdersError('');
    }, access, (error) => {
      setOrdersLoading(false);
      setOrdersError(describeFirestoreReadError(error));
      setConnected(false);
    });

    const unsubQuotes = subscribeToQuotes((firestoreQuotes) => {
      setQuotes(firestoreQuotes || []);
      setQuotesLoading(false);
      setQuotesError('');
    }, access, (error) => {
      setQuotesLoading(false);
      setQuotesError(describeFirestoreReadError(error));
      setConnected(false);
    });

    // Bildirimler: subscribeToNotifications yardimcisi vardi ama HICBIR YERDEN
    // cagrilmiyordu; bildirim beslemesi olu /api/notifications yolundan
    // geliyordu, yani uygulamada hic bildirim gorunmuyordu. (19.09.2026)
    const unsubNotifications = subscribeToNotifications((list) => {
      setNotifications(list || []);
    }, access);

    const handleNewOrder = (e: any) => {
      if (e.detail) {
        setOrders(prev => [e.detail, ...prev.filter(o => o.id !== e.detail.id)]);
      }
    };
    const handleNewQuote = (e: any) => {
      if (e.detail) {
        setQuotes(prev => [e.detail, ...prev.filter(q => q.id !== e.detail.id)]);
      }
    };
    window.addEventListener('alpha:order-created', handleNewOrder);
    window.addEventListener('alpha:quote-created', handleNewQuote);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubQuotes();
      unsubNotifications();
      window.removeEventListener('alpha:order-created', handleNewOrder);
      window.removeEventListener('alpha:quote-created', handleNewQuote);
    };
  }, [accountUid, isAdmin, authReady, retryNonce]);

  // Fetch all initial data with isolated error handling and automated retry
  // Olu REST polling KALDIRILDI (19.09.2026).
  //
  // Burada 15 saniyede bir /api/products, /api/orders, /api/quotes ve
  // /api/notifications cagriliyordu. Sunucu olmadigi icin dorduncu de
  // index.html donduruyor, res.json() patliyor ve hata sessizce yutuluyordu
  // ("// Ignore SPA HTML rewrite" yorumu koda zaten yazilmisti).
  // Ayni veriyi yukaridaki onSnapshot abonelikleri CANLI olarak veriyor.
  const fetchData = useCallback(async () => {
    setRetryNonce((n) => n + 1);
  }, []);

  // Bildirimi okundu isaretle
  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationReadInFirestore(id);
    } catch (e) {
      // Kurallar normal kullaniciya notifications yazmasina izin vermiyor;
      // isaret yerel kalir. Kalici cozum icin kullanici basina okundu kaydi.
      console.warn('Bildirim okundu isaretlenemedi:', e);
    }
  }, []);

  // Hepsini okundu isaretle
  const markAllNotificationsRead = useCallback(async () => {
    const okunmamislar = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await Promise.all(okunmamislar.map(id => markNotificationReadInFirestore(id)));
    } catch (e) {
      console.warn('Bildirimler okundu isaretlenemedi:', e);
    }
  }, [notifications]);


  return {
    currentRole,
    setCurrentRole,
    products,
    setProducts,
    orders,
    setOrders,
    ordersLoading,
    ordersError,
    productsLoading,
    productsError,
    quotesLoading,
    quotesError,
    quotes,
    setQuotes,
    notifications,
    connected,
    audioEnabled,
    setAudioEnabled,
    markNotificationRead,
    markAllNotificationsRead,
    fetchData,
  };
}
