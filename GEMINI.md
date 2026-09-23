# Proje Genel Yönergesi ve Standartları (Alpha Teknik / Siatek)

Bu projedeki **tüm sohbetler ve tüm ajanlar (agents/subagents)** istisnasız aşağıdaki kurallara ve kılavuzlara uymakla yükümlüdür.

## 1. Ana Skill ve Standart: `siatek-premium-master-skill`
- Bu projede yapılan her kodlama, tamir veya tasarım işleminde `.agents/skills/siatek-premium-master-skill/` yetkili ana kılavuzdur.
- **En Üst Seviye Otonom Tamir:** Hata çözülürken sadece semptom değil, kök neden tamir edilir. İstemci ile sunucu (`server.ts`) veri sözleşmeleri, para/KDV/iskonto hesaplamaları, stok tutarlılığı ve `Idempotency-Key` koruması eksiksiz sağlanır.
- **Sıfır Gerileme (Zero-Regression):** Önceden çalışan akışlar ve iş mantığı bozulmaz. Her tamir sonrasında `./.agents/skills/siatek-premium-master-skill/scripts/check-health.sh` (veya `npm run build` & `npm run test:security`) ile doğrulama yapılmalıdır.

## 2. World-Class Premium UI/UX Standartları
- **Kurumsal ve Lüks Tasarım:** Slate & Emerald renk disiplini esastır. Rastgele mor gradyanlar, aşırı süsleme veya AI-şablon slop'u kesinlikle yasaktır.
- **Sayısal Doğruluk:** Fiyatlar, stoklar ve sayaçlarda `tabular-nums` ve yerel para formatı (`12.345,00 ₺`) zorunludur.
- **Mikro Etkileşimler:** Butonlarda `active:scale-[0.98]` basılma tepkisi ve dokunmatik ekranlar için minimum 44px tıklama alanı hedeflenmelidir.
- **4 Durumlu UI:** Her ekran ve veri listesinde Skeleton (Loading), Anlaşılır Boş Durum (Empty), Çözüm Odaklı Hata (Error) ve Başarı (Success) döngüleri eksiksiz uygulanır.
- **Fikir Üretme & Onay:** Arayüz veya kritik iş mantığında yeni bir adım atılmadan önce kullanıcıya alternatifli fikirler sunulup açık onayı alınır.
