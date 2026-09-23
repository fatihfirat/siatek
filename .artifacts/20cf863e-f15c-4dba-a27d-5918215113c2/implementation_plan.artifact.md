# Hata Giderme ve Uygulama Çalıştırma Planı

Kullanıcının aldığı "hata veriyor açmıyor" uyarısını çözmek için hem derleme (build) hem de çalışma zamanı (runtime) hatalarını kapsayan düzeltme planıdır.

## Tespit Edilen Hatalar
1.  **Derleme Hatası (Build Error):** `AndroidLocationsBuildService` çakışması. `ANDROID_PREFS_ROOT` ve `ANDROID_USER_HOME` değişkenlerinin aynı anda set edilmesi Gradle tarafında hataya sebep oluyor.
2.  **SDK Versiyonu:** `compileSdkVersion` ve `targetSdkVersion` 36 olarak ayarlanmış. Bu çok yeni bir versiyon olup, kullanıcının bilgisayarında yüklü olmayabilir.
3.  **SSE Hatası (Runtime):** Mobil cihazda `/api/events` uç noktasına bağlanmaya çalışması `EventSource` hatasına ve sürekli tekrar eden "MIME type" hatalarına sebep oluyor.

## Yapılacak Değişiklikler

### 1. Gradle Yapılandırmasını Sabitleme
Derleme hatasını önlemek için `gradle.properties` dosyasına gerekli sistem özelliği eklendi. (Bu adım tamamlandı).

### 2. SDK Versiyonunu Optimize Etme
Daha kararlı ve yaygın olan SDK 35 versiyonuna çekilerek derleme riskleri azaltılacaktır.

#### [MODIFY] [variables.gradle](file:///Users/muslumfirat/antigravity/Gerçek-Zamanlı-Sipariş-ve-Teklif-Platformu/android/variables.gradle)
- `compileSdkVersion` ve `targetSdkVersion` değerlerini 35'e düşür.

### 3. Mobil Ortam İçin API Hatalarını Giderme
Capacitor üzerinde çalışırken SSE (Server-Sent Events) bağlantısını devre dışı bırak veya hata yönetimini sessizleştir.

#### [MODIFY] [useRealtimeData.ts](file:///Users/muslumfirat/antigravity/Gerçek-Zamanlı-Sipariş-ve-Teklif-Platformu/src/hooks/useRealtimeData.ts)
- `Capacitor` kontrolü ekle ve `/api/events` bağlantısını mobil ortamda atla.

## Doğrulama Planı
1.  **Gradle Sync:** Android Studio'da senkronizasyonun hatasız tamamlandığını doğrula.
2.  **Build & Install:** `assembleDebug` komutunun hatasız çalıştığını ve uygulamanın cihaza yüklendiğini teyit et.
3.  **Logcat Takibi:** Uygulama açıldığında konsola düşen hataları izle.
