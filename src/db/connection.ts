import { createRequire } from 'module';
const require = createRequire(`${process.cwd()}/package.json`);

export function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const useInMemoryFallback = process.env.USE_IN_MEMORY_FALLBACK === 'true';

  if (nodeEnv === 'production') {
    if (!databaseUrl && !useInMemoryFallback) {
      console.error('CRITICAL ERROR [Fail-Fast]: Production ortamında DATABASE_URL tanımlı değil ve USE_IN_MEMORY_FALLBACK aktif değil! Uygulama başlatılamıyor.');
      process.exit(1);
    }
    if (!databaseUrl && useInMemoryFallback) {
      console.warn('⚠️  Production bellek modu aktif. Sunucu yeniden başlatıldığında oturumlar sıfırlanır.');
    }
  }

  if (nodeEnv === 'test') {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      console.warn('TEST_DATABASE_URL tanımlı değil. DB entegrasyon testleri skip edilecektir.');
    } else if (testDbUrl === databaseUrl) {
      console.error('CRITICAL ERROR [Fail-Fast]: TEST_DATABASE_URL, production DATABASE_URL ile aynı olamaz!');
      process.exit(1);
    }
  }

  if (nodeEnv === 'development' && !databaseUrl && !useInMemoryFallback) {
    console.error('CRITICAL ERROR [Fail-Fast]: Development ortamında DATABASE_URL tanımlı değil ve USE_IN_MEMORY_FALLBACK aktif değil. Uygulama başlatılamıyor.');
    process.exit(1);
  }
}

let pool: any = null;

export function getPool() {
  if (!pool) {
    validateEnv();
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const { Pool } = require('pg');
      const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
      console.log(`🔌 PostgreSQL bağlantı havuzu başlatıldı: ${maskedUrl}`);
      pool = new Pool({ connectionString: databaseUrl });
    }
  }
  return pool;
}
