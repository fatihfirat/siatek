import { EInvoice } from '../types';

export interface ArchivedEInvoiceRecord {
  id: string;
  invoiceNumber: string;
  uuid: string;
  invoiceDate: string; // YYYY-MM-DD
  invoiceTime: string;
  year: string; // '2026'
  month: string; // '02'
  monthName: string; // 'Şubat'
  yearMonth: string; // '2026-02'
  folderKey: string; // '2026/02'
  folderDisplay: string; // '2026 / 02 - Şubat'
  customerTitle: string;
  customerVknTckn: string;
  customerCity?: string;
  profile: string; // 'TICARIFATURA' | 'TEMELFATURA' | 'EARSIVFATURA'
  type: string; // 'SATIS' | 'IADE' | 'TEVKIFAT' etc.
  status: string; // 'sent' | 'draft' | 'cancelled'
  payableAmount: number;
  taxExclusiveAmount: number;
  totalVat: number;
  totalTevkifat: number;
  itemCount: number;
  orderNumber?: string;
  sourceType?: string;
  invoiceData: EInvoice;
  savedAt: string; // ISO string
  updatedAt: string;
}

export interface MonthFolderNode {
  month: string;
  monthName: string;
  yearMonth: string;
  folderDisplay: string;
  count: number;
  totalAmount: number;
  totalVat: number;
  totalMatrah: number;
  eFaturaCount: number;
  eArsivCount: number;
  invoices: ArchivedEInvoiceRecord[];
}

export interface YearFolderNode {
  year: string;
  count: number;
  totalAmount: number;
  totalVat: number;
  totalMatrah: number;
  months: MonthFolderNode[];
}

export interface ArchiveFolderHierarchy {
  years: YearFolderNode[];
  allInvoices: ArchivedEInvoiceRecord[];
  stats: {
    totalInvoices: number;
    totalAmount: number;
    totalVat: number;
    totalMatrah: number;
    eFaturaCount: number;
    eArsivCount: number;
    draftCount: number;
    sentCount: number;
    yearCount: number;
    monthCount: number;
    storageUsageBytes: number;
  };
}

const DB_NAME = 'AlphaEInvoiceArchiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'einvoices_archive';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export function getMonthNameTr(monthIndexOrStr: number | string): string {
  const num = typeof monthIndexOrStr === 'string' ? parseInt(monthIndexOrStr, 10) : monthIndexOrStr;
  if (isNaN(num) || num < 1 || num > 12) return 'Genel';
  return MONTH_NAMES_TR[num - 1];
}

/**
 * Open or initialize the IndexedDB database
 */
export function openEInvoiceDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB bu tarayıcıda desteklenmiyor veya sunucu tarafında çalışıyor.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
        store.createIndex('uuid', 'uuid', { unique: false });
        store.createIndex('invoiceDate', 'invoiceDate', { unique: false });
        store.createIndex('year', 'year', { unique: false });
        store.createIndex('yearMonth', 'yearMonth', { unique: false });
        store.createIndex('customerTitle', 'customerTitle', { unique: false });
        store.createIndex('customerVknTckn', 'customerVknTckn', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('profile', 'profile', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error || new Error('IndexedDB açılırken hata oluştu.'));
    };
  });
}

/**
 * Helper to convert an EInvoice to an ArchivedEInvoiceRecord with date-based folder metadata
 */
export function formatInvoiceToArchiveRecord(invoice: EInvoice): ArchivedEInvoiceRecord {
  const dateStr = invoice.invoiceDate || new Date().toISOString().split('T')[0];
  const dateParts = dateStr.split('-');
  const year = dateParts[0] || new Date().getFullYear().toString();
  const month = dateParts[1] || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const monthName = getMonthNameTr(month);
  const yearMonth = `${year}-${month}`;
  const folderKey = `${year}/${month}`;
  const folderDisplay = `${year} / ${month} - ${monthName}`;

  const now = new Date().toISOString();

  return {
    id: invoice.id || invoice.invoiceNumber || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    invoiceNumber: invoice.invoiceNumber,
    uuid: invoice.uuid,
    invoiceDate: dateStr,
    invoiceTime: invoice.invoiceTime || '12:00:00',
    year,
    month,
    monthName,
    yearMonth,
    folderKey,
    folderDisplay,
    customerTitle: invoice.customerTitle || 'İsimsiz Müşteri',
    customerVknTckn: invoice.customerVknTckn || '',
    customerCity: invoice.customerCity,
    profile: invoice.profile || 'EARSIVFATURA',
    type: invoice.type || 'SATIS',
    status: invoice.status || 'draft',
    payableAmount: Number(invoice.payableAmount) || 0,
    taxExclusiveAmount: Number(invoice.taxExclusiveAmount || invoice.subtotal) || 0,
    totalVat: Number(invoice.totalVat) || 0,
    totalTevkifat: Number(invoice.totalTevkifat) || 0,
    itemCount: invoice.items?.length || 0,
    orderNumber: invoice.orderNumber,
    sourceType: invoice.sourceType,
    invoiceData: invoice,
    savedAt: now,
    updatedAt: now,
  };
}

/**
 * Save a single invoice to IndexedDB archive
 */
export async function saveInvoiceToIndexedDB(invoice: EInvoice): Promise<ArchivedEInvoiceRecord> {
  const db = await openEInvoiceDB();
  const record = formatInvoiceToArchiveRecord(invoice);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => {
      resolve(record);
    };

    request.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error('Fatura arşive kaydedilemedi.'));
    };
  });
}

/**
 * Save a batch of invoices to IndexedDB
 */
export async function saveBatchInvoicesToIndexedDB(invoices: EInvoice[]): Promise<{ savedCount: number; totalInDB: number }> {
  if (!invoices || invoices.length === 0) {
    const all = await getAllArchivedInvoicesFromIndexedDB();
    return { savedCount: 0, totalInDB: all.length };
  }

  const db = await openEInvoiceDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let savedCount = 0;

    invoices.forEach(inv => {
      const record = formatInvoiceToArchiveRecord(inv);
      store.put(record);
      savedCount++;
    });

    transaction.oncomplete = async () => {
      try {
        const all = await getAllArchivedInvoicesFromIndexedDB();
        resolve({ savedCount, totalInDB: all.length });
      } catch {
        resolve({ savedCount, totalInDB: savedCount });
      }
    };

    transaction.onerror = (e) => {
      reject((e.target as IDBTransaction).error || new Error('Toplu fatura arşivi kaydedilemedi.'));
    };
  });
}

/**
 * Retrieve all archived invoices from IndexedDB
 */
export async function getAllArchivedInvoicesFromIndexedDB(): Promise<ArchivedEInvoiceRecord[]> {
  const db = await openEInvoiceDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result || []) as ArchivedEInvoiceRecord[];
      // Sort newest invoiceDate descending
      records.sort((a, b) => {
        const timeA = new Date(a.invoiceDate).getTime();
        const timeB = new Date(b.invoiceDate).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      });
      resolve(records);
    };

    request.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error('Arşivdeki faturalar okunamadı.'));
    };
  });
}

/**
 * Get a single invoice by ID from IndexedDB
 */
export async function getArchivedInvoiceByIdFromIndexedDB(id: string): Promise<ArchivedEInvoiceRecord | null> {
  const db = await openEInvoiceDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error('Fatura aranamadı.'));
    };
  });
}

/**
 * Delete a single invoice from IndexedDB archive
 */
export async function deleteArchivedInvoiceFromIndexedDB(id: string): Promise<void> {
  const db = await openEInvoiceDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error('Fatura arşivden silinemedi.'));
    };
  });
}

/**
 * Clear all invoices from IndexedDB archive
 */
export async function clearAllIndexedDBInvoices(): Promise<void> {
  const db = await openEInvoiceDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error('Arşiv temizlenemedi.'));
    };
  });
}

/**
 * Build Date-Based Folder Hierarchy (Year -> Month -> Invoices)
 */
export async function getArchivedFolderHierarchy(): Promise<ArchiveFolderHierarchy> {
  const allInvoices = await getAllArchivedInvoicesFromIndexedDB();

  const yearMap = new Map<string, Map<string, ArchivedEInvoiceRecord[]>>();

  let totalAmount = 0;
  let totalVat = 0;
  let totalMatrah = 0;
  let eFaturaCount = 0;
  let eArsivCount = 0;
  let draftCount = 0;
  let sentCount = 0;

  allInvoices.forEach(inv => {
    totalAmount += inv.payableAmount;
    totalVat += inv.totalVat;
    totalMatrah += inv.taxExclusiveAmount;

    if (inv.profile === 'EARSIVFATURA') eArsivCount++;
    else eFaturaCount++;

    if (inv.status === 'draft') draftCount++;
    else if (inv.status === 'sent') sentCount++;

    const y = inv.year;
    const m = inv.month;

    if (!yearMap.has(y)) {
      yearMap.set(y, new Map());
    }

    const monthMap = yearMap.get(y)!;
    if (!monthMap.has(m)) {
      monthMap.set(m, []);
    }

    monthMap.get(m)!.push(inv);
  });

  const years: YearFolderNode[] = [];

  // Sort years descending (e.g. 2026, 2025)
  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b.localeCompare(a));

  let monthCount = 0;

  sortedYears.forEach(y => {
    const monthMap = yearMap.get(y)!;
    const months: MonthFolderNode[] = [];

    // Sort months descending (e.g. 12, 11, ... 02, 01)
    const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));
    monthCount += sortedMonths.length;

    let yCount = 0;
    let yAmount = 0;
    let yVat = 0;
    let yMatrah = 0;

    sortedMonths.forEach(m => {
      const invs = monthMap.get(m)!;
      const mCount = invs.length;
      const mAmount = invs.reduce((sum, i) => sum + i.payableAmount, 0);
      const mVat = invs.reduce((sum, i) => sum + i.totalVat, 0);
      const mMatrah = invs.reduce((sum, i) => sum + i.taxExclusiveAmount, 0);
      const meFatura = invs.filter(i => i.profile !== 'EARSIVFATURA').length;
      const meArsiv = invs.filter(i => i.profile === 'EARSIVFATURA').length;
      const mName = getMonthNameTr(m);

      yCount += mCount;
      yAmount += mAmount;
      yVat += mVat;
      yMatrah += mMatrah;

      months.push({
        month: m,
        monthName: mName,
        yearMonth: `${y}-${m}`,
        folderDisplay: `${y} / ${m} - ${mName}`,
        count: mCount,
        totalAmount: mAmount,
        totalVat: mVat,
        totalMatrah: mMatrah,
        eFaturaCount: meFatura,
        eArsivCount: meArsiv,
        invoices: invs,
      });
    });

    years.push({
      year: y,
      count: yCount,
      totalAmount: yAmount,
      totalVat: yVat,
      totalMatrah: yMatrah,
      months,
    });
  });

  // Estimate storage usage
  const approxJson = JSON.stringify(allInvoices);
  const storageUsageBytes = approxJson.length * 2; // UTF-16 bytes approx

  return {
    years,
    allInvoices,
    stats: {
      totalInvoices: allInvoices.length,
      totalAmount,
      totalVat,
      totalMatrah,
      eFaturaCount,
      eArsivCount,
      draftCount,
      sentCount,
      yearCount: years.length,
      monthCount,
      storageUsageBytes,
    },
  };
}

/**
 * Export IndexedDB archive as JSON string
 */
export async function exportIndexedDBArchiveAsJson(): Promise<string> {
  const records = await getAllArchivedInvoicesFromIndexedDB();
  const exportPayload = {
    app: 'ALPHA_TEKNIK_EINVOICE_ARCHIVE',
    exportedAt: new Date().toISOString(),
    version: '1.0',
    totalRecords: records.length,
    invoices: records.map(r => r.invoiceData),
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import JSON backup into IndexedDB
 */
export async function importJsonToIndexedDB(jsonString: string): Promise<{ importedCount: number; totalInDB: number }> {
  const parsed = JSON.parse(jsonString);
  let invoicesToImport: EInvoice[] = [];

  if (Array.isArray(parsed)) {
    invoicesToImport = parsed;
  } else if (parsed && Array.isArray(parsed.invoices)) {
    invoicesToImport = parsed.invoices;
  } else if (parsed && parsed.invoiceNumber) {
    invoicesToImport = [parsed];
  } else {
    throw new Error('Geçersiz fatura JSON yedek dosyası formatı.');
  }

  const saveResult = await saveBatchInvoicesToIndexedDB(invoicesToImport);
  return { importedCount: saveResult.savedCount, totalInDB: saveResult.totalInDB };
}
