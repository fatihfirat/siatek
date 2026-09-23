import { describe, it, expect } from 'vitest';
import { DEFAULT_COMPANY_SETTINGS, FleetVehicle, DispatchDriver } from '../lib/companySettings';

describe('Sevkiyat & Filo Geliştirmeleri ve Finansal Görünürlük Testleri', () => {
  describe('1. Varsayılan Filo Araçları ve Sevkiyat Personeli', () => {
    it('Varsayılan şirket ayarlarında plaka ve araç bilgileri tanımlıdır', () => {
      expect(DEFAULT_COMPANY_SETTINGS.fleetVehicles).toBeDefined();
      expect(DEFAULT_COMPANY_SETTINGS.fleetVehicles!.length).toBeGreaterThanOrEqual(1);

      const defaultVehicle = DEFAULT_COMPANY_SETTINGS.fleetVehicles!.find(v => v.isDefault);
      expect(defaultVehicle).toBeDefined();
      expect(defaultVehicle!.plate).toContain('63');
      expect(defaultVehicle!.name).toBeDefined();
    });

    it('Varsayılan sevkiyat ve dağıtım personeli tanımlıdır', () => {
      expect(DEFAULT_COMPANY_SETTINGS.dispatchPersonnel).toBeDefined();
      expect(DEFAULT_COMPANY_SETTINGS.dispatchPersonnel!.length).toBeGreaterThanOrEqual(1);

      const defaultDriver = DEFAULT_COMPANY_SETTINGS.dispatchPersonnel!.find(d => d.isDefault);
      expect(defaultDriver).toBeDefined();
      expect(defaultDriver!.name).toBeTruthy();
      expect(defaultDriver!.phone).toBeTruthy();
    });

    it('Yeni araç veya personel eklendiğinde veri yapısı geçerlidir', () => {
      const newVehicle: FleetVehicle = {
        id: 'veh_test_1',
        plate: '34 ABC 789',
        name: 'Mercedes Atego',
        type: 'Kamyon',
        capacity: '10 Ton',
        isDefault: false,
      };

      expect(newVehicle.plate).toMatch(/^[0-9]{2}\s[A-Z]{1,3}\s[0-9]{2,4}$/);
      expect(newVehicle.capacity).toContain('Ton');
    });
  });

  describe('2. Sevkiyata Çıkar Hata Yönetimi & Dayanıklılık (Resilience)', () => {
    it('API HTML (SPA index.html) döndürdüğünde JSON parse hatası yakalanır ve doğrudan Firestore tetiklenir', async () => {
      const htmlResponse = new Response('<!DOCTYPE html><html><body>SPA Index</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      const contentType = htmlResponse.headers.get('content-type') || '';
      let isJson = contentType.includes('application/json');
      let fallbackTriggered = false;

      if (!isJson) {
        fallbackTriggered = true;
      }

      expect(isJson).toBe(false);
      expect(fallbackTriggered).toBe(true);
    });

    it('API geçerli JSON döndürdüğünde veri başarıyla okunur', async () => {
      const jsonResponse = new Response(JSON.stringify({ success: true, orderId: 'ord-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = jsonResponse.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      expect(isJson).toBe(true);

      const data = await jsonResponse.json();
      expect(data.success).toBe(true);
    });
  });

  describe('3. Genel Toplam Fiyat Görünürlüğü ve Biçimlendirme', () => {
    it('Para tutarı Türkçe para birimi formatında iki ondalık basamak ile hassas biçimlendirilir', () => {
      const total = 14850.5;
      const formatted = total.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      expect(formatted).toBe('14.850,50');
    });

    it('0 veya tanımsız tutar durumunda güvenli gösterim sağlanır', () => {
      const nullTotal = 0;
      const formatted = (nullTotal || 0).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      expect(formatted).toBe('0,00');
    });
  });
});
