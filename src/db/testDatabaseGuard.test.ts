import { describe, it, expect } from 'vitest';

export function validateTestEnvironment(env: {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
}) {
  if (env.NODE_ENV !== 'test') {
    throw new Error('Test güvenlik hatası: NODE_ENV "test" olmak zorundadır.');
  }

  if (!env.TEST_DATABASE_URL) {
    return { status: 'skipped', message: 'TEST_DATABASE_URL tanımlı değil.' };
  }

  if (env.DATABASE_URL && env.TEST_DATABASE_URL === env.DATABASE_URL) {
    throw new Error('Test güvenlik hatası: TEST_DATABASE_URL, üretim DATABASE_URL ile aynı olamaz!');
  }

  const isTestDbName =
    env.TEST_DATABASE_URL.includes('_test') ||
    env.TEST_DATABASE_URL.includes('test_') ||
    env.TEST_DATABASE_URL.includes('testdb');

  if (!isTestDbName) {
    throw new Error('Test güvenlik hatası: TEST_DATABASE_URL adı test amaçlı olduğunu ( _test, test_ ) doğrulamıyor!');
  }

  return { status: 'ready', message: 'Test veritabanı güvenliği doğrulandı.' };
}

describe('Faz 3D.4 — Test Veritabanı Güvenlik Koruma Testleri', () => {

  it('1. NODE_ENV test değilse hata fırlatır', () => {
    expect(() => validateTestEnvironment({ NODE_ENV: 'development', TEST_DATABASE_URL: 'postgres://localhost/test_db' }))
      .toThrowError(/NODE_ENV "test"/);
  });

  it('2. TEST_DATABASE_URL ile DATABASE_URL aynıysa hata fırlatır', () => {
    const url = 'postgres://localhost/prod_db';
    expect(() => validateTestEnvironment({ NODE_ENV: 'test', DATABASE_URL: url, TEST_DATABASE_URL: url }))
      .toThrowError(/aynı olamaz/);
  });

  it('3. Test veritabanı adı test işareti içermiyorsa hata fırlatır', () => {
    expect(() => validateTestEnvironment({ NODE_ENV: 'test', TEST_DATABASE_URL: 'postgres://localhost/production_db' }))
      .toThrowError(/test amaçlı olduğunu/);
  });

  it('4. Doğru test ortamında geçerli sonuç döner', () => {
    const res = validateTestEnvironment({ NODE_ENV: 'test', TEST_DATABASE_URL: 'postgres://localhost/alphateknik_test' });
    expect(res.status).toBe('ready');
  });

});
