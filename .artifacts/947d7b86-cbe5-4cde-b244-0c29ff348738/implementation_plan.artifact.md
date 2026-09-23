# FAZ 4 — Canlı Yayına (Production) Hazırlık ve Deployment Planı

Sistemi tam olarak yayına (production) hazır hale getirmek için sunucu ortamı, veritabanı canlı geçişi, Docker/PM2 yapılandırmaları ve Flutter mobil sürüm çıktılarını hazırlayacağız.

---

## 1. Planlanan Hazırlık Adımları

### 1.1 Sunucu Deployment Dosyaları (Node.js & Vite)
*   **`Dockerfile` ve `.dockerignore`:** Projenin herhangi bir bulut sunucusunda (AWS, DigitalOcean, Render, vb.) izole ve güvenli bir şekilde çalışabilmesi için Docker container mimarisinin oluşturulması.
*   **PM2 Yapılandırması (`ecosystem.config.cjs`):** Eğer sunucu Docker yerine doğrudan Node.js/PM2 çalıştıracaksa, uygulamanın çökme anında otomatik yeniden başlaması (auto-restart) ve log yönetimi için yapılandırma dosyası eklenecektir.

### 1.2 Çevresel Değişkenler (Environment Variables)
*   **`.env.example` Güncellemesi:** Canlı ortamda ayarlanması gereken zorunlu değişkenlerin (Örn. `DATABASE_URL`, `PORT`, `NODE_ENV=production`) bir şablonunun oluşturulması.

### 1.3 Veritabanı (PostgreSQL) Canlı Geçiş Kılavuzu
*   Canlı veritabanına bağlanıp Drizzle SQL migration'larının (`0001_initial.sql`) güvenle çalıştırılması için script ve talimatların netleştirilmesi.

### 1.4 Flutter Mobil Çıktıları (APK/AAB)
*   Android için `release` imzalı APK veya Google Play Store için AAB derleme komutlarının ve `build.gradle` versiyon numaralarının yayına hazır hale getirilmesi.

---

## 2. Kullanıcı Onayı Gereken Kararlar

> [!IMPORTANT]
> Uygulamayı hangi platformda yayınlamayı planlıyorsunuz? (Örn. Vercel + Harici Node.js Sunucu, Render, AWS, DigitalOcean Droplet vb.)
> Şu an varsayılan olarak **Docker** ve **PM2** yapılandırmalarını ekleyeceğim, böylece her ortama uyumlu olacaktır.

## 3. Verification Plan

*   Uygulamanın `npm run build` ile hatasız derlenmesi.
*   Docker build testinin yapılması (`docker build -t alpha-teknik .`).
*   Üretim ortamı için eksiksiz bir "Deployment Checklist" (Yayınlama Kontrol Listesi) sunulması.
