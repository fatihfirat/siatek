# FAZ 4 — Canlı Yayına (Production) Hazırlık ve Deployment Raporu

Bu rapor, Alpha Teknik platformunu tam olarak canlı yayın (production) ortamında kesintisiz, izole ve güvenle çalıştırmak için oluşturulan Docker, PM2, Environment ve Flutter derleme hazırlıklarını belgelemektedir.

---

## 1. Sunucu ve Container Altyapısı
* **`Dockerfile` (Multi-stage Build):** Node 20-alpine imajı kullanılarak önce `npm run build` ile Vite ve Esbuild üretim derlemelerinin alınmasını, ardından sadece production bağımlılıklarıyla çalışacak hafif ve güvenli bir Docker imajının oluşturulmasını sağlar. Uygulama `3000` portundan dışarı açılır.
* **`.dockerignore`:** `.env`, `.git`, `node_modules`, MacOS kalıntıları ve log dosyaları Docker imajından dışlanarak güvenlik ve imaj boyutu optimize edilmiştir.
* **PM2 (`ecosystem.config.cjs`):** Uygulamanın sanal sunucu (VPS/Droplet) ortamında Docker olmadan çalıştırılması gerektiğinde, CPU çekirdeklerine göre "Cluster" modunda çalışmasını, çökme anında anında yeniden başlamasını ve log kayıtlarının (`logs/out.log`, `logs/error.log`) merkezi yönetimini sağlar.

## 2. Çevresel Değişkenler (Environment Configuration)
* **`.env.example`:** Canlı ortamda ayarlanması gereken tüm değişkenler (Özellikle `DATABASE_URL` zorunluluğu) belgelendi. Uygulamanın fail-fast mekanizması `DATABASE_URL` eksik olduğunda sistemin başlatılmasını engeller, bu da prod güvenliğini pekiştirir.

## 3. Flutter (Mobil) Deployment Hazırlıkları
* **Android (Google Play):** Yayınlama için `flutter build appbundle` komutu ile AAB (Android App Bundle) veya doğrudan cihaz kurulumu için `flutter build apk --release` komutu ile release APK oluşturulabilir.

## 4. Build Kalite Kontrolü
* Entegre edilen tüm dosyalar sonrasında `npm run build` komutu çalıştırılmış ve **0 hata (Exit Code: 0)** ile derleme başarıyla tamamlanmıştır.

---

### Deployment Checklist (Son Onaylar)
1. Hedef sunucuda PostgreSQL veritabanı kurulumunun yapılması ve `DATABASE_URL` bilgisinin `.env` dosyasına kaydedilmesi.
2. Drizzle şemasının (`drizzle/migrations/0001_initial.sql`) canlı veritabanında çalıştırılması.
3. Sunucu ortamına Docker veya PM2 ile kodların aktarılarak servisin başlatılması.
