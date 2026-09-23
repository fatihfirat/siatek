# Faz 4F — Yönetici ve POS

Yerel önizleme: http://127.0.0.1:5174/operations-preview

Bu faz yalnızca yönetici ana sayfasını ve POS akışını kapsar. 4A–4E dosyaları ve
önizleme yolları korunmuştur. 4G başlatılmamıştır. Gerçek satış, durum değişikliği,
dış mesaj, production deploy veya git push yapılmamıştır.

## Uygulama

- `AdminPortal`, ana sayfada ortak bileşenlerle oluşturulan `AdminHome` kullanır.
  Onay bekleyen siparişler, yanıt bekleyen teklifler, yüklenen dekontlar, düşük
  stoklar ve gönderilmiş teklifler önceliklidir. Kartlar mevcut yönetim ekranlarına
  veya araçlarına yönlenir; tıklamak otomatik onay ya da stok değişikliği yapmaz.
- Sipariş tutarı iptaller hariç aynı formülle hesaplanır ve tahsilat olarak
  etiketlenmez. İkincil yönetim araçları açılır bölümde korunmuştur. Ana sayfa
  dışındaki eski yönetim ekranları ve pencereleri bu fazda yeniden tasarlanmamıştır.
- `FastPosCheckoutModal` ortak Modal, Button, giriş, miktar, durum ve boş/hata
  bileşenlerini kullanır. Sabit koyu renkler yerine tema değişkenleri uygulanır.
  Masaüstünde ürünler ve sepet yan yanadır. Ödemede sepet ve ödeme yan yana kalır.
  Mobilde Ürünler, Sepet ve Ödeme adımları ayrı görünür.
- Barkod/SKU + Enter ve Türkçe ürün araması vardır. Arama sonuçları 30 kayıtla
  sınırlanır ve fazla sonuçta aramayı daraltma bilgisi verilir. Stoksuz ürünler
  eklenemez. Tekrarlı ekleme stok sınırını aşamaz; değişen veya kaybolan stok
  kaydetmeden önce yeniden kontrol edilir.
- Sepet miktarı, kaldırma, temizleme ve beklemeye alma desteklenir. Bekleyen
  taslaklar müşteri, telefon, cari, ödeme, nakit ve iskonto bilgilerini korur.
  Geri alma dolu sepetin üzerine yazmaz. Yenileme veya portalın kaldırılması
  taslakları siler; kalıcı kayıt ya da hesaplar arası aktarım eklenmemiştir.
- Senkron kilit aynı anda ikinci kayıt çağrısını engeller. Kayıt sırasında alanlar
  ve adımlar kilitlenir; pencere kapanışı sonuç beklenene kadar engellenir.
  Normal kapanış mevcut oturumdaki sepeti korur. Hatalar kalıcı açıklamayla
  gösterilir; belirsiz yanıtta sepet silinmez ve önce sipariş kontrolü istenir.
- Başarı için sunucudan kayıt kimliği, numarası, sayısal toplam ve ürün listesi
  gerekir. Sonuç gerçek kayıt numarasını ve toplamı gösterir. Sepet ile sunucu
  toplamı farklıysa açık uyarı vardır. Otomatik fiş ve konfeti kaldırılmıştır.
  İsteğe bağlı fiş, dönen kaydın bilgilerini kullanır; yazdırma hatası kaydı
  yeniden göndermez. Fiziksel yazıcı doğrulanmamıştır.
- `useRealtimeData`, ürün ve teklif isteklerinin yükleme/hata durumlarını da
  sunar. Geçerli boş ürün yanıtı boş listeye yansır; başarısız ürün yanıtında
  mevcut veriler korunur ama POS satış işlemi engellenir. Bu durumlar App üzerinden
  yönetici ana sayfası ve POS'a bağlanmıştır. Abonelik ve yetki mekanizması değişmez.

## Hesaplama ve sunucu sınırları

İstemcideki mevcut satır iskontosu, ardından genel iskonto, sıfır altına inmeyen
son toplam ve dahil KDV `Math.round(total * (20 / 120))` korunmuştur. Nakit için
boş veya 0 girişin tam tutar sayılması açıkça anlatılır. İskonto seçenekleri
%0/5/10/15/20 olarak kalır. Finansal veriler ve `shipped` değerleri dönüştürülmez.

Kaynak incelemesinde mevcut POS–API uyumsuzluğu görülmüştür:

- AdminPortal'ın POS payload'ı toplam, ödeme yöntemi ve delivered durumu gönderir.
- `server.ts` içindeki POST `/api/orders`, satırları yeniden hesaplar, ayrıca %20
  KDV ekler; gönderilen toplam/durum yerine kendi toplamını ve pending durumunu
  kaydeder. POS iskontosu notta bulunur; mevcut payload API'nin `discount`
  alanını doldurmaz. Cari kimliği, tahsilat ve para üstü bu eski adaptörde kalıcı
  muhasebe hareketine dönüşmez.
- Bu faz finansal/stock/yetki sunucu kurallarını değiştirmez. Sonuç ekranındaki
  kayıt onayı banka tahsilatı veya teslimat onayı olarak sunulmaz. Tutar farkı
  gösterilmesi alttaki uyuşmazlığı çözmez; gerçek POS kullanımı öncesi ayrı bir
  finansal sözleşme ve kalıcılık çalışması gerekir.
- Stok kontrolü istemcide son alınan verilere dayanır. Mevcut sunucu stok düşümünde
  sıfıra kırpma kullanır; eşzamanlı satış ve sunucu idempotency garantisi eklenmez.
  Mevcut rol kapısı korunur. Auth/Firestore/cache izolasyonu ve sunucu yetkileri
  uçtan uca doğrulanmaz; 4E'deki sınırlamalar geçerlidir.

## Önizleme ve doğrulama

Önizleme yalnızca gerçek AdminHome/POS sunum bileşenlerini ve yerel örnek
servisleri bağlar; App, authentication, canlı API veya Firestore aboneliklerini
başlatmaz. Örnek kayıt çağrısı sayacı çift gönderim kontrolünü görünür kılar.
Yönetim bağlantıları önizlemede açıklama penceresi açar. Üretim derlemesi bu
önizleme rotasını ve örnek POS kayıt numarasını içermez.

- Güncel Vitest: **53 geçti, 28 veritabanı testi atlandı**. Altı yeni test;
  iskonto sırası, KDV, nakit/boş sepet, kesirli miktar, stok eşitliği/değişimi,
  eksik stok ve geçersiz miktarı kapsar.
- Güncel Vite üretim derlemesi geçti.
- Kaynak girişi `src/main.tsx`, `allowJs:false` ile tip kontrolü: **önceki 15
  shipped hatası** sürüyor, ek hata yok. Tam proje tip kontrolü başarısı değildir.
- Alışveriş regresyonu: **12 yerleşim** ve mevcut alışveriş etkileşimleri geçti.
- Ortak UI regresyonu: **14 tema/genişlik** ve klavye/pencere kontrolleri geçti.
  İlk çağrı varsayılan 5173 portuna gitti; çalışan 5174 ile yeniden geçti.
- 4F tarayıcı testi sonucu aşağıdaki son doğrulama bölümünde kayıtlıdır.

Ara sonuçlar `.artifacts/ui-phase4f/` içinde tutulur. İlk iki 4F denemesinde test
seçicileri aynı adlı arama düğmelerini ve miktar grubu/girişini ayıramadı. Seçiciler
düzeltildi. Sonraki denemelerde geliştirme sırasında sayfa yenilenmesi ve örnek
senaryonun sıfırlanması görüldü. Testte HMR WebSocket bağlantısı kapatılarak
örnek verilerin sabit kalması sağlandı; canlı API/Firestore istekleri engellenir
ve böyle bir istek test hatası sayılır. Bunlar başarılı test sonucu sayılmamıştır.

Gerçek cihaz, native geri tuşu, ekran okuyucu, fiziksel barkod okuyucu/yazıcı,
canlı veritabanı, gerçek ödeme ve sunucu izolasyonu test edilmemiştir.
Bu klasörde Git metadata yoktur. Önceki AdminPortal/POS dosyalarının kopyaları
`.artifacts/ui-phase4f/*.before.tsx` altında korunur.

### Son 4F tarayıcı doğrulaması — 2026-09-14

`scripts/verify-operations.cjs` geçti: açık/koyu tema ile
320/360/390/412/768/1024/1440 px genişliklerinde ana sayfa, ürünler, sepet ve ödeme
olmak üzere **56 yerleşim** doğrulandı. Kontrol alanlarının genişlik/yüksekliği
44 px altına inmedi; uzun ürün adlarında yatay taşma görülmedi.

Arama/sonuçsuz arama, barkod bulunamaması, stoksuz ürün, stok kadar ekleme,
stok üstü eklemenin engellenmesi, kapanışta sepet koruma, bekleyen taslakta
müşteri/iskonto/ödeme koruma, eksik nakit, aynı anda iki kaydetme tıklamasının
tek çağrı üretmesi, işlem sırasında Escape, başarılı sonuçta sepet temizleme,
kayıt hatasında sepet koruma, sonradan sıfırlanan stok, ürün yükleme/boş/hata,
cari yükleme/boş/hata ve geçersiz cari ödeme, sunucu toplam farkı, Tab/Shift+Tab
odağı, Escape/kapat düğmesi ve tetikleyiciye odak dönüşü geçti.
320×480 kısa ekranda ve büyütülmüş pencere metninde taşma kontrolü geçti.

API/Firestore isteği ve tarayıcı çalışma hatası görülmedi. Açık/koyu ana sayfa,
ürünler, sepet, ödeme ve tutar farkı ekran görüntüleri incelendi. Testte HMR
kapalıdır; canlı sunucu/oturum doğrulamasının yerine geçmez.
