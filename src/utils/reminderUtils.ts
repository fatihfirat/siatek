import { CariAccount } from '../types';
import { formatTRY } from './exportUtils';
import { openWhatsAppShare } from './shareUtils';

export const OFFICIAL_BANK_INFO = {
  name: 'Kuveyt Türk Katılım Bankası',
  iban: 'TR84 0020 5000 0987 6543 2100 01',
  accountName: 'ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT İNŞ. TİC. LTD. ŞTİ.',
  branch: 'Şanlıurfa Karaköprü Şubesi',
};

export type ReminderTone = 'approaching' | 'polite' | 'formal' | 'urgent' | 'statement';

/**
 * Calculates due date, remaining/overdue days and status for a Cari Account
 */
export function calculateCariDueStatus(cari?: CariAccount | null): {
  isOverdue: boolean;
  isApproaching: boolean;
  diffDays: number;
  daysText: string;
  badgeLabel: string;
  badgeClass: string;
  estimatedDueDate: Date;
} {
  const now = new Date();
  if (!cari) {
    return {
      isOverdue: false,
      isApproaching: false,
      diffDays: 0,
      daysText: '0 Gün',
      badgeLabel: 'Normal',
      badgeClass: 'bg-info-fill/15 text-info-text border-info-border',
      estimatedDueDate: now,
    };
  }

  const createdDate = new Date(cari.createdAt || Date.now());
  const validCreatedTime = isNaN(createdDate.getTime()) ? Date.now() : createdDate.getTime();
  const paymentTermDays = Number(cari.paymentTermDays) || 30;

  // Approximate due date calculation
  const estimatedDueDate = new Date(validCreatedTime + paymentTermDays * 24 * 60 * 60 * 1000);
  const diffTime = now.getTime() - estimatedDueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays > 0;
  const isApproaching = diffDays <= 0 && Math.abs(diffDays) <= 7;

  let daysText = '';
  let badgeLabel = '';
  let badgeClass = '';

  if (isOverdue) {
    daysText = `${diffDays} Gün Gecikmede`;
    badgeLabel = 'Vadesi Geçti';
    badgeClass = 'bg-danger-fill/15 text-danger-text border-danger-border';
  } else if (isApproaching) {
    daysText = `Vadeye ${Math.abs(diffDays)} Gün Kaldı`;
    badgeLabel = 'Vade Yaklaşıyor';
    badgeClass = 'bg-warning-fill/15 text-warning-text border-warning-border';
  } else {
    daysText = `${Math.abs(diffDays)} Gün Var`;
    badgeLabel = 'Vade Normal';
    badgeClass = 'bg-info-fill/15 text-info-text border-info-border';
  }

  return {
    isOverdue,
    isApproaching,
    diffDays,
    daysText,
    badgeLabel,
    badgeClass,
    estimatedDueDate,
  };
}

/**
 * Generates automated WhatsApp message for a Cari account
 */
export function generateQuickWhatsAppReminder(
  cari: CariAccount,
  tone: ReminderTone = 'formal',
  customNote?: string,
  options?: {
    includeIban?: boolean;
    includeLastOrder?: boolean;
  }
): string {
  if (!cari) return '';
  const formattedBalance = formatTRY(cari.balance || 0);
  const companyTitle = cari.companyName || cari.name || 'Firma Yetkilisi';
  const contactName = cari.name || cari.companyName || 'Yetkili';
  const paymentTermDays = Number(cari.paymentTermDays) || 30;
  const dueInfo = calculateCariDueStatus(cari);
  const includeIban = options?.includeIban ?? true;
  const includeLastOrder = options?.includeLastOrder ?? true;

  let greeting = `Sayın *${contactName}* (${companyTitle}),\n\n`;
  let body = '';

  if (tone === 'approaching') {
    body = `Alpha Teknik Doğalgaz & Sıhhi Tesisat olarak iyi çalışmalar dileriz. 🌿\n\nSistemimizdeki cari hesabınızda *${formattedBalance}* tutarında vadesi yaklaşmakta olan (*${dueInfo.daysText}*) açık bakiye mevcuttur.\n\nÖdeme planlamanızı yapabilmeniz ve iş akışımızın sorunsuz devam etmesi adına bilgilerinize sunarız.`;
  } else if (tone === 'polite') {
    body = `Alpha Teknik Doğalgaz & Sıhhi Tesisat Sistemleri olarak hayırlı işler dileriz. 🌿\n\nCari hesabınızda *${formattedBalance}* tutarında açık bakiye görünmektedir.\n\nMutabakatınız ve hesap kapatma transferiniz hususunu rica ederiz.`;
  } else if (tone === 'urgent') {
    body = `*ÖNEMLİ VADE VE BAKİYE İHBARI*\n\nŞirketiniz cari hesabında bulunan *${formattedBalance}* tutarındaki bakiye *${paymentTermDays} günlük vade süresini (${Math.max(1, dueInfo.diffDays)} gün) aşmıştır*.\n\nYeni sipariş ve sevkiyat planlamalarınızın aksamaması adına ödemenizi ivedilikle gerçekleştirmenizi ve dekontu iletmenizi önemle rica ederiz.`;
  } else {
    // formal (default)
    body = `Alpha Teknik Doğalgaz & Sıhhi Tesisat Muhasebe ve Finans Departmanı'ndan bilgilendirmedir.\n\nŞirketiniz adına kayıtlı (*${cari.code || 'CR'}*) cari hesabınızda *${formattedBalance}* tutarında vadesi ${dueInfo.isOverdue ? 'geçmiş' : 'yaklaşan'} borç bakiyesi mevcuttur.\n\nMutabakatınız ve ilgili tutarın şirketimiz banka hesaplarına transfer edilmesi hususunu bilgilerinize sunarız.`;
  }

  let extra = '';
  if (includeLastOrder && cari.lastTransactionDesc) {
    extra += `\n\n📋 *Son İşlem:* ${cari.lastTransactionDesc}`;
  }

  if (includeIban) {
    extra += `\n\n🏦 *Banka Hesap Bilgilerimiz:*\n• *Banka:* ${OFFICIAL_BANK_INFO.name}\n• *IBAN:* \`${OFFICIAL_BANK_INFO.iban}\`\n• *Alıcı:* ${OFFICIAL_BANK_INFO.accountName}`;
  }

  if (customNote && customNote.trim()) {
    extra += `\n\n📌 *Not:* ${customNote.trim()}`;
  }

  const footer = `\n\nSaygılarımızla,\n*Alpha Teknik Doğalgaz ve Tesisat*\n📞 0544 440 91 80 • Karaköprü / Şanlıurfa`;

  return greeting + body + extra + footer;
}

/**
 * Generates automated Email Subject and Body for a Cari account
 */
export function generateQuickEmailReminder(
  cari: CariAccount,
  tone: ReminderTone = 'formal',
  customNote?: string,
  options?: {
    includeIban?: boolean;
    includeLastOrder?: boolean;
  }
): { subject: string; body: string } {
  if (!cari) return { subject: '', body: '' };
  const formattedBalance = formatTRY(cari.balance || 0);
  const companyTitle = cari.companyName || cari.name || 'Firma Yetkilisi';
  const contactName = cari.name || cari.companyName || 'Yetkili';
  const paymentTermDays = Number(cari.paymentTermDays) || 30;
  const dueInfo = calculateCariDueStatus(cari);
  const includeIban = options?.includeIban ?? true;
  const includeLastOrder = options?.includeLastOrder ?? true;

  const subject = `[Alpha Teknik Finans] Cari Hesap Vade & Ödeme Bildirimi - ${companyTitle} (${cari.code || 'CR'})`;

  let noteBlock = '';
  if (tone === 'urgent') {
    noteBlock = `ÖNEMLİ NOT: İşbu bakiye mutabakat vademiz dahilinde gecikmeye girmiştir. Sevkiyat planlamalarınızın duraklamaması için ödemenizin ivedilikle gerçekleştirilmesini rica ederiz.\n\n`;
  } else if (tone === 'approaching') {
    noteBlock = `NOT: Vadenizin dolmasına az bir süre kalmıştır. Ödeme planınızı kontrol etmenizi rica ederiz.\n\n`;
  } else if (tone === 'polite') {
    noteBlock = `NOT: Açık bakiye mutabakatınızı ve hesap kapatma işlemlerinizi rica ederiz.\n\n`;
  }

  let body = 
    `Sayın ${contactName},\n${companyTitle} Yetkilisine,\n\n` +
    `Alpha Teknik Doğalgaz Sıhhi Tesisat İnş. Tic. Ltd. Şti. Muhasebe ve Finans Departmanı tarafından düzenlenen cari hesap durum özetiniz aşağıda bilgilerinize sunulmuştur:\n\n` +
    `--------------------------------------------------\n` +
    `CARİ HESAP & BAKİYE MUTABAKAT ÖZETİ:\n` +
    `• Cari Kodu: ${cari.code || 'CR'}\n` +
    `• Firma Ünvanı: ${cari.companyName || '-'}\n` +
    `• Yetkili: ${cari.name || '-'}\n` +
    `• Şehir: ${cari.city || 'Şanlıurfa'}\n` +
    `• Vade Süresi: ${paymentTermDays} Gün\n` +
    `• Vade Durumu: ${dueInfo.daysText}\n` +
    `• GÜNCEL NET BORÇ BAKİYESİ: ${formattedBalance}\n` +
    `--------------------------------------------------\n\n` +
    (includeLastOrder && cari.lastTransactionDesc ? `Son İşlem Kaydı: ${cari.lastTransactionDesc}\n\n` : '') +
    noteBlock +
    (customNote && customNote.trim() ? `Ek Açıklama: ${customNote.trim()}\n\n` : '');

  if (includeIban) {
    body += 
      `ÖDEME YAPILABİLECEK RESMİ BANKA HESABIMIZ:\n` +
      `Banka: ${OFFICIAL_BANK_INFO.name}\n` +
      `IBAN: ${OFFICIAL_BANK_INFO.iban}\n` +
      `Hesap Sahibi: ${OFFICIAL_BANK_INFO.accountName}\n` +
      `Şube: ${OFFICIAL_BANK_INFO.branch}\n\n` +
      `Ödemenizi gerçekleştirdikten sonra dekontu bu e-postaya yanıt olarak veya 0544 440 91 80 WhatsApp hattımıza iletmenizi rica ederiz.\n\n`;
  }

  body += 
    `İyi çalışmalar dileriz.\n\n` +
    `ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT İNŞ. TİC. LTD. ŞTİ.\n` +
    `Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa\n` +
    `Tel: 0544 440 91 80 • www.alphadogalgaz.com`;

  return { subject, body };
}

/**
 * Directly triggers WhatsApp reminder with 1-click
 */
export function triggerOneClickWhatsAppReminder(
  cari: CariAccount,
  tone?: ReminderTone,
  customNote?: string,
  options?: {
    includeIban?: boolean;
    includeLastOrder?: boolean;
  }
) {
  if (!cari) return;
  const autoTone: ReminderTone = tone || (calculateCariDueStatus(cari).isOverdue ? 'urgent' : 'formal');
  const message = generateQuickWhatsAppReminder(cari, autoTone, customNote, options);
  openWhatsAppShare({
    phone: cari.phone,
    message,
  });
}

/**
 * Directly opens email client with pre-filled subject and body
 */
export function triggerOneClickEmailReminder(
  cari: CariAccount,
  tone?: ReminderTone,
  customNote?: string,
  options?: {
    includeIban?: boolean;
    includeLastOrder?: boolean;
  }
) {
  if (!cari) return;
  const autoTone: ReminderTone = tone || (calculateCariDueStatus(cari).isOverdue ? 'urgent' : 'formal');
  const { subject, body } = generateQuickEmailReminder(cari, autoTone, customNote, options);
  const subjectEnc = encodeURIComponent(subject);
  const bodyEnc = encodeURIComponent(body);
  const mailto = `mailto:${cari.email || ''}?subject=${subjectEnc}&body=${bodyEnc}`;
  
  // Safe trigger avoiding blank black tabs created by window.open
  try {
    const a = document.createElement('a');
    a.href = mailto;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    window.location.href = mailto;
  }
}
