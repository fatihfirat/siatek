import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import PaymentReminderModal from './PaymentReminderModal';
import { CariAccount } from '../../types';
import {
  calculateCariDueStatus,
  generateQuickWhatsAppReminder,
  generateQuickEmailReminder,
  OFFICIAL_BANK_INFO
} from '../../utils/reminderUtils';

const mockCariler: CariAccount[] = [
  {
    id: 'c1',
    code: 'CR-001',
    name: 'Ahmet Usta',
    companyName: 'Ahmet Doğalgaz Ltd.',
    phone: '05441112233',
    email: 'ahmet@example.com',
    city: 'Şanlıurfa',
    creditLimit: 100000,
    status: 'active',
    balance: 45000,
    totalDebit: 60000,
    totalCredit: 15000,
    type: 'customer',
    paymentTermDays: 30,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago -> overdue
    updatedAt: new Date().toISOString(),
    lastTransactionDesc: '20 Adet Kombi Bağlantı Seti',
  },
  {
    id: 'c2',
    code: 'CR-002',
    name: 'Mehmet Yılmaz',
    companyName: 'Yılmaz Tesisat A.Ş.',
    phone: '05329998877',
    email: 'mehmet@example.com',
    city: 'Gaziantep',
    creditLimit: 50000,
    status: 'active',
    balance: 12500,
    totalDebit: 20000,
    totalCredit: 7500,
    type: 'customer',
    paymentTermDays: 30,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago -> approaching
    updatedAt: new Date().toISOString(),
    lastTransactionDesc: '50 Metre PE Doğalgaz Borusu',
  },
];

describe('PaymentReminderModal Component & Utilities', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToString(
      <PaymentReminderModal
        isOpen={false}
        onClose={vi.fn()}
        cariler={mockCariler}
      />
    );
    expect(html).toBe('');
  });

  it('renders gracefully when cariler array is empty', () => {
    const html = renderToString(
      <PaymentReminderModal
        isOpen={true}
        onClose={vi.fn()}
        cariler={[]}
      />
    );
    expect(html).toContain('Otomatik Ödeme &amp; Vade Hatırlatıcı Masası');
    expect(html).toContain('Kayıtlı Borçlu Cari Hesap Bulunamadı');
  });

  it('renders debtor cari info, balance and due status accurately', () => {
    const html = renderToString(
      <PaymentReminderModal
        isOpen={true}
        onClose={vi.fn()}
        cariler={mockCariler}
        initialCariId="c1"
      />
    );

    expect(html).toContain('Otomatik Ödeme &amp; Vade Hatırlatıcı Masası');
    expect(html).toContain('45.000');
    expect(html).toContain('Ahmet Doğalgaz Ltd.');
    expect(html).toContain('05441112233');
    expect(html).toContain('Kuveyt Türk');
  });

  it('calculates cari due status correctly for overdue and approaching balances', () => {
    const overdueStatus = calculateCariDueStatus(mockCariler[0]);
    expect(overdueStatus.isOverdue).toBe(true);
    expect(overdueStatus.badgeLabel).toBe('Vadesi Geçti');

    const approachingStatus = calculateCariDueStatus(mockCariler[1]);
    expect(approachingStatus.isApproaching).toBe(true);
    expect(approachingStatus.badgeLabel).toBe('Vade Yaklaşıyor');
  });

  it('generates WhatsApp message with official IBAN and tone correctly', () => {
    const urgentMsg = generateQuickWhatsAppReminder(mockCariler[0], 'urgent', 'Özel Not Test', {
      includeIban: true,
      includeLastOrder: true,
    });

    expect(urgentMsg).toContain('ÖNEMLİ VADE VE BAKİYE İHBARI');
    expect(urgentMsg).toContain(OFFICIAL_BANK_INFO.iban);
    expect(urgentMsg).toContain('20 Adet Kombi Bağlantı Seti');
    expect(urgentMsg).toContain('Özel Not Test');

    const politeMsg = generateQuickWhatsAppReminder(mockCariler[1], 'polite', '', {
      includeIban: true,
    });
    expect(politeMsg).toContain('hayırlı işler dileriz');
    expect(politeMsg).toContain(OFFICIAL_BANK_INFO.iban);
  });

  it('generates Email subject and body with structured details', () => {
    const emailData = generateQuickEmailReminder(mockCariler[0], 'formal', 'Ekstra Not', {
      includeIban: true,
      includeLastOrder: true,
    });

    expect(emailData.subject).toContain('[Alpha Teknik Finans]');
    expect(emailData.subject).toContain('Ahmet Doğalgaz Ltd.');
    expect(emailData.body).toContain('CARİ HESAP & BAKİYE MUTABAKAT ÖZETİ');
    expect(emailData.body).toContain(OFFICIAL_BANK_INFO.iban);
    expect(emailData.body).toContain('Ekstra Not');
  });
});
