# Alpha Teknik Sipariş ve Teklif Platformu

React/Vite arayüzü, Express API ve Capacitor mobil kabuğu. Yerel geliştirme için Node.js ve npm gerekir.

## Yerel çalıştırma

1. `npm install` çalıştırın.
2. Yerel veri için `.env` dosyasına `USE_IN_MEMORY_FALLBACK=true` yazın veya komutu `USE_IN_MEMORY_FALLBACK=true npm run dev` şeklinde çalıştırın. Bu mod, durumu `.local-data/state.json` dosyasına kaydeder ve yeniden başlatmada geri yükler. Dosyayı koruyun; özel hesap ve işlem verisi içerir. Başka konum için `LOCAL_STATE_FILE` ayarlayın.
3. Kalıcı oturum için `AUTH_SECRET`, yönetici başlangıç girişi için `ADMIN_BOOTSTRAP_PASSWORD` değerlerini kendi ortamınızda ayarlayın. Değerleri depoya eklemeyin. Bu değerler yoksa sunucu rastgele değer üretir; yeniden başlatma mevcut oturumları geçersiz kılar ve yönetici başlangıç parolası bilinmez.
4. `npm run dev` çalıştırın; `http://localhost:3000` adresini açın. Müşteri kaydı ve girişi uygulama arayüzünden yapılır.

PostgreSQL kullanacaksanız `DATABASE_URL` tanımlayın ve `pg` paketini kurun. Bu depo şu an `pg` bağımlılığını içermez; PostgreSQL yolu bu teslimde doğrulanmadı. Üretim başlatması `DATABASE_URL` olmadan reddedilir. Sunucudaki sipariş, teklif, stok ve oturum işlemleri şu an PostgreSQL'e yazılmaz; `DATABASE_URL` eklemek bu işlemleri PostgreSQL'e taşımaz. Yerel dosya tek sunucu içindir; çoklu sunucu veya canlı işlem için uygun değildir.

Katalog proje içindeki üretilmiş örnek ürün verisidir; canlı stok ve fiyat değildir. `GEMINI_API_KEY` yalnız AI yardım işlevleri için gereklidir. Firebase yapılandırması `firebase-applet-config.json` dosyasından okunur; Firebase/Firestore ve mobil kabuk için gerçek hesap, erişim ve platform kurulumu ayrıca gereklidir. Sipariş ve teklif API testleri bellek modunda çalışır; bu testler harici hizmetleri veya gerçek tahsilatı doğrulamaz.

## Kontroller

`npm run build`, `npm run typecheck`, `node --test tests/security.test.cjs tests/transactions.test.cjs` ve ilgili Vitest dosyaları. `npm run lint` henüz lint çalıştırmaz.
