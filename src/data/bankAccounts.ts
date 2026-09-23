export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  branchName?: string;
  branchCode?: string;
  accountNumber?: string;
  currency: string;
  logoColor: string; // Tailwind color accent
  badgeText?: string;
}

export const COMPANY_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'garanti',
    bankName: 'Garanti BBVA',
    accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
    iban: 'TR12 0006 2000 0001 2345 6789 01',
    branchName: 'Kadıköy Ticari Şube',
    branchCode: '062',
    accountNumber: '1234567',
    currency: 'TRY',
    logoColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    badgeText: 'Ana Tahsilat Hesabı'
  },
  {
    id: 'yapikredi',
    bankName: 'Yapı Kredi',
    accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
    iban: 'TR34 0006 7010 0000 0012 3456 78',
    branchName: 'İmes Sanayi Şubesi',
    branchCode: '067',
    accountNumber: '9876543',
    currency: 'TRY',
    logoColor: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30',
    badgeText: 'Hızlı EFT / FAST'
  },
  {
    id: 'ziraat',
    bankName: 'Ziraat Bankası',
    accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
    iban: 'TR56 0001 0000 0000 9876 5432 10',
    branchName: 'Ümraniye Şubesi',
    branchCode: '100',
    accountNumber: '5544332',
    currency: 'TRY',
    logoColor: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30',
    badgeText: 'Kamu & Kurumsal'
  },
  {
    id: 'isbankasi',
    bankName: 'Türkiye İş Bankası',
    accountHolder: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.',
    iban: 'TR78 0006 4000 0011 2233 4455 66',
    branchName: 'Dudullu OSB Şubesi',
    branchCode: '064',
    accountNumber: '6677889',
    currency: 'TRY',
    logoColor: 'text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    badgeText: 'Ticari Hesap'
  }
];
