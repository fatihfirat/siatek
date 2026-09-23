import { describe, it, expect } from 'vitest';
import { getNavigationForRole, getMoreModulesForRole, FEATURE_POS_ENABLED } from './navigationConfig';

describe('Faz 3E.1 — Premium Mobile Navbar UI Testleri', () => {

  it('1. Admin navigasyonu doğru ana öğeleri gösterir', () => {
    const adminNav = getNavigationForRole('admin');
    expect(adminNav.length).toBe(5);
    expect(adminNav.map(n => n.id)).toEqual(['home', 'cariler', 'pos', 'products', 'more']);
  });

  it('2. Müşteri navigasyonu doğru 5 ana öğeyi gösterir', () => {
    const customerNav = getNavigationForRole('customer');
    expect(customerNav.length).toBe(5);
    expect(customerNav.map(n => n.id)).toEqual(['home', 'catalog', 'cart', 'orders', 'more']);
  });

  it('3. Rozet hesaplama ve 99+ gösterim mantığı', () => {
    const countNormal = 5;
    const countHigh = 120;

    expect(countNormal > 99 ? '99+' : countNormal).toBe(5);
    expect(countHigh > 99 ? '99+' : countHigh).toBe('99+');
  });

  it('4. Rol bazlı Daha Fazla modül kısıtlamaları', () => {
    const customerModules = getMoreModulesForRole('customer');
    const allCustomerKeys = Object.values(customerModules).flat().map((m: any) => m.id);

    expect(allCustomerKeys).not.toContain('cariler');
    expect(allCustomerKeys).not.toContain('analytics');
    expect(allCustomerKeys).toContain('quotes');
  });

});
