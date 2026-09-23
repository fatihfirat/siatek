import { STOCK_PDF_PRODUCTS } from '../data/stockProducts';
import crypto from 'crypto';

/**
 * Development & Test Seed Script (Faz 3D)
 * Production ortamında otomatik olarak çalıştırılmaz.
 * Mükerrer çalıştırıldığında unique constraint ihlali yapmadan upsert mantığıyla çalışır.
 */

export async function runDevelopmentSeed(dbClient: any) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ PROD UYARISI: Development seed production ortamında çalıştırılamaz!');
    return;
  }

  console.log('🌱 Development seed başlatılıyor...');

  // 1. Seed Demo Admin & Dealer Users
  const salt = 'seed_salt_2026';
  const passwordHash = crypto.pbkdf2Sync('Alpha2026!', salt, 10000, 64, 'sha512').toString('hex');

  const demoUsers = [
    {
      id: 'usr-admin-seed',
      email: 'muslimfirat@yahoo.com',
      username: 'muslimfirat',
      name: 'Müslüm Fırat',
      companyName: 'ALPHA TEKNİK DOĞALGAZ LTD. ŞTİ.',
      phone: '+90 544 440 91 80',
      address: 'Karaköprü / Şanlıurfa',
      role: 'admin',
      isDealer: false,
      discountTier: 'ALPHA_ADMIN',
      passwordHash,
      salt,
    },
    {
      id: 'usr-dealer-seed',
      email: 'bayi@kuzeytesisat.com.tr',
      username: 'kuzeytesisat',
      name: 'Kuzey Mühendislik',
      companyName: 'Kuzey Tesisat Ltd. Şti.',
      phone: '+90 533 112 33 44',
      address: 'Gebze / Kocaeli',
      role: 'customer',
      isDealer: true,
      discountTier: 'GOLD_DEALER',
      passwordHash,
      salt,
    }
  ];

  for (const user of demoUsers) {
    // Inserts or ignores existing demo user
    await dbClient.query(
      `INSERT INTO users (id, email, username, name, company_name, phone, address, role, is_dealer, discount_tier, password_hash, salt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (email) DO NOTHING;`,
      [user.id, user.email, user.username, user.name, user.companyName, user.phone, user.address, user.role, user.isDealer, user.discountTier, user.passwordHash, user.salt]
    );
  }

  // 2. Seed Products from STOCK_PDF_PRODUCTS
  for (const p of STOCK_PDF_PRODUCTS) {
    await dbClient.query(
      `INSERT INTO products (id, sku, barcode, name, category, sub_category, description, price, wholesale_price, stock, unit, min_order_quantity, image_url, warehouse_location, min_stock_alert)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (sku) DO UPDATE SET
         price = EXCLUDED.price,
         stock = EXCLUDED.stock,
         updated_at = NOW();`,
      [p.id, p.sku, p.barcode || null, p.name, p.category, p.subCategory || null, p.description || '', p.price, p.wholesalePrice || p.price * 0.8, p.stock, p.unit, p.minOrderQuantity, p.imageUrl || '', p.warehouseLocation || 'Raf A-01', p.minStockAlert || 5]
    );
  }

  console.log(`✅ Development seed tamamlandı: ${STOCK_PDF_PRODUCTS.length} ürün ve demo kullanıcılar yüklendi.`);
}
