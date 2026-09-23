import { ConstructionSite } from '../types';

export const DEFAULT_CONSTRUCTION_SITES: ConstructionSite[] = [
  {
    id: 'site-1',
    siteName: 'Vadi İstanbul Konutları 2. Etap B Blok',
    city: 'İstanbul',
    district: 'Sarıyer / Ayazağa',
    fullAddress: 'Ayazağa Mah. Kemerburgaz Cad. No: 42 B Blok Şantiye Girişi',
    contactPerson: 'Mimar Hasan Usta',
    contactPhone: '0532 987 65 43',
    notes: 'Kamyon girişi arka nizamiyeden yapılacak, vinç saat 10:00 - 16:00 arası müsait.',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'site-2',
    siteName: 'Kartal Sahil Panorama Rezidans',
    city: 'İstanbul',
    district: 'Kartal / Kordonboyu',
    fullAddress: 'Kordonboyu Mah. Sahil Bulvarı No: 128 Kat 4',
    contactPerson: 'Şantiye Şefi Serkan Bey',
    contactPhone: '0544 112 23 34',
    notes: 'Malzeme asansörü mevcut, teslimat öncesi 1 saat önceden arayınız.',
    isDefault: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'site-3',
    siteName: 'Bursa Nilüfer Sanayi Sitesi Fabrika Ek Binası',
    city: 'Bursa',
    district: 'Nilüfer / OSB',
    fullAddress: 'Nilüfer OSB 14. Sokak No: 8 Fabrika Alanı',
    contactPerson: 'Tesisat Sorumlusu Ali Usta',
    contactPhone: '0533 555 44 33',
    notes: 'Tır yanaşma rampası vardır.',
    isDefault: false,
    createdAt: new Date().toISOString()
  }
];

const SITES_STORAGE_KEY = 'alpha_construction_sites';

export function getStoredConstructionSites(): ConstructionSite[] {
  try {
    const raw = localStorage.getItem(SITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_CONSTRUCTION_SITES;
}

export function saveConstructionSites(sites: ConstructionSite[]): void {
  try {
    localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(sites));
  } catch (e) {
    console.error(e);
  }
}
