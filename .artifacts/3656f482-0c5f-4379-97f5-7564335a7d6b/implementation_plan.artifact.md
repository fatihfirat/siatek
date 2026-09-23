# iOS, Web ve Android Çoklu Platform (Cross-Platform) Destek Planı

Bu plan, uygulamanın **Web (PWA / Modern Tarayıcılar)**, **Android** ve **iOS** platformlarında kusursuz, uyumlu ve eksiksiz çalışmasını sağlamak amacıyla hazırlanmıştır.

## Kullanıcı İncelemesi Gerekenler

> [!IMPORTANT]
> Uygulama hali hazırda Web ve Android (Capacitor) desteklemektedir. iOS desteği için Capacitor iOS platformunun eklenmesi, iOS yerel izinlerinin (`Info.plist`) konfigüre edilmesi ve Safari/iOS webview uyumluluğunun doğrulanması gerekmektedir.

## Açık Sorular

- iOS platformu için yerel Capacitor iOS modülü eklenerek Xcode (`ios/`) projesi oluşturulsun mu?
- iOS cihazlarda kamera (barkod tarama), dosya paylaşımı ve bildirim izinleri için `Info.plist` açıklamaları eklensin mi?

## Önerilen Değişiklikler

### 1. Capacitor Yapılandırması ([capacitor.config.ts](file:///Users/muslumfirat/antigravity/Gerçek-Zamanlı-Sipariş-ve-Teklif-Platformu/capacitor.config.ts))
- iOS ve Android için server, splash screen ve status bar ayarlarının optimize edilmesi.

### 2. iOS Yerel Entegrasyonu (`ios/`)
- Capacitor iOS platformunun eklenmesi (`npx cap add ios`).
- Kamera, galeri ve ağ erişim izinlerinin (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`) tanımlanması.

### 3. Web & Mobil Duyarlılık (Responsive UI)
- CSS ve Tailwind yardımıyla iOS Safari çentiği (safe-area-inset) ve mobil klavye görünürlük uyumluluklarının gözden geçirilmesi.

## Doğrulama Planı

### Otomatik Testler
- `npm run build` ile web ve sunucu üretim derlemesinin hatasız çalıştığının doğrulanması.
- `npx cap sync` ile varlıkların iOS ve Android projelerine aktarılması.
