# Faz 3D — Veritabanı Geçiş (Migration), Rollback ve Yedekleme Stratejisi

Bu belge, Alpha Teknik B2B platformunun in-memory (RAM) belleğinden **PostgreSQL** kalıcı veri katmanına güvenli geçiş aşamalarını, olası aksaklıklarda geri dönüş (rollback) senaryolarını ve yedekleme prosedürlerini açıklamaktadır.

---

## 1. Geçiş (Migration) Aşamaları

1. **Ortam Hazırlığı:**
   * PostgreSQL veritabanı sunucusu ayağa kaldırılır.
   * `DATABASE_URL` environment variable güvenli biçimde tanımlanır (Örn: `postgresql://user:password@localhost:5432/alphateknik_db`).
2. **Şema Oluşturma:**
   * `drizzle/migrations/0001_initial.sql` scripti çalıştırılarak tablolar, indexler, foreign key'ler ve check constraint'ler oluşturulur.
3. **Development Seed (Yalnızca Dev/Test):**
   * Canlı sisteme geçmeden önce test ürünleri ve demo yöneticiler `src/db/seed.ts` ile yüklenir.
4. **Çift Kaynak (Dual-Write) Dönemi & Kontrollü Kesinti:**
   * Canlı geçiş sırasında veri kaybını önlemek için son in-memory veriler JSON export alınarak PostgreSQL'e import edilebilir.

---

## 2. Yedekleme (Backup) Prosedürü

* **Günlük Otomatik Yedekleme:**
  ```bash
  pg_dump -U $DB_USER -h $DB_HOST -d $DB_NAME -F c -b -v -f "backup_alphateknik_$(date +%Y%m%d_%H%M%S).dump"
  ```
* **Migration Öncesi Zorunlu Yedek:**
  Herhangi bir üretim migration işleminden **mutlaka önce** yukarıdaki komutla tam veritabanı yedeği alınmalıdır.

---

## 3. Geri Dönüş (Rollback) Stratejisi

* **Şema Rollback:**
  Olası kritik bir uyumsuzlukta veritabanı şemasını sıfırlamak için:
  ```sql
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  ```
  Ardından yedek geri yüklenir (`pg_restore`).
* **Uygulama Rollback:**
  `server.ts` içerisindeki veritabanı repository katmanı devre dışı bırakılarak geçici olarak in-memory fallback moduna alınabilir.

---

## 4. Bilinen Riskler ve Önlemler
* **Eşzamanlılık Çatışmaları:** `SELECT ... FOR UPDATE` ile kilitlenmeyen stok güncellemeleri engellenmiştir.
* **Idempotency Eksikliği:** Sipariş ve POS satışlarında `idempotency_key` unique constraint zorunluluğu ile mükerrer işlem riski ortadan kaldırılmıştır.
