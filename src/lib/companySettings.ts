import { useState, useEffect } from 'react';
import { db, doc, getDoc, setDoc } from './firebase';

export interface CompanyBankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  branchName?: string;
  branchCode?: string;
  accountNumber?: string;
  currency: string;
  isDefault?: boolean;
  badgeText?: string;
}

export interface FleetVehicle {
  id: string;
  plate: string;
  name: string;
  type: string;
  capacity?: string;
  isDefault?: boolean;
}

export interface DispatchDriver {
  id: string;
  name: string;
  phone: string;
  role: string;
  isDefault?: boolean;
}

export interface CompanySettings {
  companyName: string;
  shortName: string;
  brandTitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  district: string;
  city: string;
  postalCode: string;
  taxOffice: string;
  taxNumber: string;
  mersisNo: string;
  ticaretSicilNo: string;
  bankAccounts: CompanyBankAccount[];
  fleetVehicles?: FleetVehicle[];
  dispatchPersonnel?: DispatchDriver[];
  // Premium Enterprise Brand & UX Customizations
  brandAccent?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'stone';
  brandRadius?: 'sharp' | 'rounded' | 'pill';
  uiDensity?: 'compact' | 'comfortable';
  announcementBanner?: {
    enabled: boolean;
    text: string;
    link?: string;
    tone: 'info' | 'warning' | 'success' | 'brand';
  };
  hidePricesForGuests?: boolean;
  whatsappSupportEnabled?: boolean;
  customLogoUrl?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'alpha_company_settings_v1';
const EVENT_NAME = 'alpha_company_settings_updated';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
  shortName: 'ALPHA TEKNİK',
  brandTitle: 'ALPHA TEKNİK HVAC & DOĞALGAZ',
  phone: '+90 544 440 91 80',
  whatsapp: '+90 544 440 91 80',
  email: 'info@alphateknikhvac.com',
  website: 'https://siatek.alphateknikhvac.com',
  address: 'Batıkent Mahallesi Beyazıt Bulvarı No:32/1',
  district: 'Karaköprü',
  city: 'Şanlıurfa',
  postalCode: '63050',
  taxOffice: 'Karaköprü VD',
  taxNumber: '0580948214',
  mersisNo: '',
  ticaretSicilNo: '',
  brandAccent: 'blue',
  brandRadius: 'rounded',
  uiDensity: 'comfortable',
  announcementBanner: {
    enabled: true,
    text: 'Alpha Teknik: B2B Dijital Sipariş & Proje Teklif Portalı Hizmetinizdedir.',
    tone: 'brand',
  },
  hidePricesForGuests: false,
  whatsappSupportEnabled: true,
  customLogoUrl: '',
  bankAccounts: [
    {
      id: 'garanti',
      bankName: 'Garanti BBVA',
      accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
      iban: 'TR12 0006 2000 0001 2345 6789 01',
      branchName: 'Karaköprü Ticari Şube',
      branchCode: '631',
      currency: 'TRY',
      isDefault: true,
    },
    {
      id: 'ziraat',
      bankName: 'Ziraat Bankası',
      accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
      iban: 'TR56 0001 0000 0000 9876 5432 10',
      branchName: 'Karaköprü Şubesi',
      branchCode: '630',
      currency: 'TRY',
      isDefault: false,
    },
    {
      id: 'yapikredi',
      bankName: 'Yapı Kredi',
      accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
      iban: 'TR34 0006 7010 0000 0012 3456 78',
      branchName: 'Şanlıurfa Şubesi',
      branchCode: '067',
      currency: 'TRY',
      isDefault: false,
    },
  ],
  fleetVehicles: [
    {
      id: 'v1',
      plate: '63 AT 941',
      name: 'ALPHA TEKNİK Özmal Dağıtım Aracı',
      type: 'Kamyon',
      capacity: '3.5 Ton',
      isDefault: true,
    },
    {
      id: 'v2',
      plate: '63 ALP 102',
      name: 'ALPHA TEKNİK Panelvan Sevkiyat',
      type: 'Panelvan',
      capacity: '1.5 Ton',
      isDefault: false,
    },
    {
      id: 'v3',
      plate: '63 TK 520',
      name: 'Alpha Kamyonet Hızlı Servis',
      type: 'Kamyonet',
      capacity: '1 Ton',
      isDefault: false,
    },
  ],
  dispatchPersonnel: [
    {
      id: 'd1',
      name: 'Ahmet Yılmaz',
      phone: '+90 544 440 91 80',
      role: 'Şoför & Sevkiyat Sorumlusu',
      isDefault: true,
    },
    {
      id: 'd2',
      name: 'Mehmet Kaya',
      phone: '+90 542 312 44 55',
      role: 'Panelvan Şoförü',
      isDefault: false,
    },
    {
      id: 'd3',
      name: 'Mustafa Demir',
      phone: '+90 533 987 65 43',
      role: 'Depo & Hızlı Dağıtım',
      isDefault: false,
    },
  ],
};

let inMemorySettings: CompanySettings = { ...DEFAULT_COMPANY_SETTINGS };

// Load initially from localStorage if in browser
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      inMemorySettings = { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {}
}

export function getCompanySettings(): CompanySettings {
  return inMemorySettings;
}

export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  try {
    const docRef = doc(db, 'settings', 'company');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remote = snap.data() as Partial<CompanySettings>;
      const localUpdated = inMemorySettings.updatedAt ? new Date(inMemorySettings.updatedAt).getTime() : 0;
      const remoteUpdated = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

      if (localUpdated > remoteUpdated) {
        // Local is newer: persist local to remote
        const cleanPayload = sanitizeForFirestore(inMemorySettings);
        setDoc(docRef, cleanPayload, { merge: true }).catch(() => {});
        return inMemorySettings;
      }

      inMemorySettings = {
        ...DEFAULT_COMPANY_SETTINGS,
        ...remote,
        bankAccounts: Array.isArray(remote.bankAccounts) && remote.bankAccounts.length > 0
          ? remote.bankAccounts
          : DEFAULT_COMPANY_SETTINGS.bankAccounts,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemorySettings));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: inMemorySettings }));
      }
      return inMemorySettings;
    }
  } catch (err) {
    console.warn('Firestore settings/company read notice:', err);
  }
  return inMemorySettings;
}

export async function saveCompanySettings(updated: Partial<CompanySettings>): Promise<CompanySettings> {
  const merged: CompanySettings = {
    ...inMemorySettings,
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  inMemorySettings = merged;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
    } catch {}
  }

  // Persist to Firestore with undefined sanitization
  try {
    const docRef = doc(db, 'settings', 'company');
    const cleanPayload = sanitizeForFirestore(merged);
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err: any) {
    console.error('Firestore settings save failure:', err);
    throw new Error(err?.message || 'Bulut veritabanına kayıt başarısız oldu.');
  }

  return merged;
}

export const ACCENT_PALETTES = {
  blue: {
    primary: '#0086D0',
    light: '#E0F2FE',
    border: '#0284C7',
    label: 'Safir Mavi (Alpha Klasik)',
  },
  emerald: {
    primary: '#059669',
    light: '#D1FAE5',
    border: '#047857',
    label: 'Zümrüt Yeşil',
  },
  amber: {
    primary: '#D97706',
    light: '#FEF3C7',
    border: '#B45309',
    label: 'Kehribar / Altın',
  },
  indigo: {
    primary: '#4F46E5',
    light: '#EEF2FF',
    border: '#4338CA',
    label: 'Kurumsal İndigo',
  },
  stone: {
    primary: '#475569',
    light: '#F1F5F9',
    border: '#334155',
    label: 'Modern Grafit',
  },
} as const;

export function applyCompanyBrandStyles(settings: CompanySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const accentKey = settings.brandAccent || 'blue';
  const accent = ACCENT_PALETTES[accentKey] || ACCENT_PALETTES.blue;
  root.style.setProperty('--color-brand-blue', accent.primary);
  root.style.setProperty('--color-brand-500', accent.primary);
  root.style.setProperty('--color-brand-600', accent.border);

  // Radius scale
  const radiusKey = settings.brandRadius || 'rounded';
  root.setAttribute('data-radius', radiusKey);

  if (radiusKey === 'sharp') {
    root.style.setProperty('--ui-radius', '4px');
    root.style.setProperty('--ui-radius-sm', '3px');
    root.style.setProperty('--ui-radius-md', '4px');
    root.style.setProperty('--ui-radius-lg', '6px');
    root.style.setProperty('--radius-sm', '2px');
    root.style.setProperty('--radius-md', '4px');
    root.style.setProperty('--radius-lg', '6px');
    root.style.setProperty('--radius-xl', '6px');
    root.style.setProperty('--radius-2xl', '8px');
    root.style.setProperty('--radius-3xl', '10px');
  } else if (radiusKey === 'pill') {
    root.style.setProperty('--ui-radius', '20px');
    root.style.setProperty('--ui-radius-sm', '10px');
    root.style.setProperty('--ui-radius-md', '16px');
    root.style.setProperty('--ui-radius-lg', '24px');
    root.style.setProperty('--radius-sm', '8px');
    root.style.setProperty('--radius-md', '14px');
    root.style.setProperty('--radius-lg', '20px');
    root.style.setProperty('--radius-xl', '24px');
    root.style.setProperty('--radius-2xl', '30px');
    root.style.setProperty('--radius-3xl', '36px');
  } else {
    root.style.setProperty('--ui-radius', '12px');
    root.style.setProperty('--ui-radius-sm', '8px');
    root.style.setProperty('--ui-radius-md', '12px');
    root.style.setProperty('--ui-radius-lg', '16px');
    root.style.setProperty('--radius-sm', '6px');
    root.style.setProperty('--radius-md', '10px');
    root.style.setProperty('--radius-lg', '14px');
    root.style.setProperty('--radius-xl', '18px');
    root.style.setProperty('--radius-2xl', '22px');
    root.style.setProperty('--radius-3xl', '26px');
  }

  // Density
  const densityKey = settings.uiDensity || 'comfortable';
  root.setAttribute('data-density', densityKey);
  root.setAttribute('data-accent', accentKey);
}

export function useCompanySettings(): CompanySettings {
  const [settings, setSettings] = useState<CompanySettings>(inMemorySettings);

  useEffect(() => {
    // Initial fetch from Firestore
    fetchCompanySettings().then(res => {
      setSettings(res);
      applyCompanyBrandStyles(res);
    });

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanySettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
        applyCompanyBrandStyles(customEvent.detail);
      }
    };

    if (typeof window !== 'undefined') {
      applyCompanyBrandStyles(inMemorySettings);
      window.addEventListener(EVENT_NAME, handleUpdate);
      return () => {
        window.removeEventListener(EVENT_NAME, handleUpdate);
      };
    }
  }, []);

  return settings;
}

