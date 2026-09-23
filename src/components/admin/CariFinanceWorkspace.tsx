import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CariAccount, CariType } from '../../types';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react';
import CariPaymentCalendar from './CariPaymentCalendar';
import type { TransactionModalMode } from './CariTransactionModal';
import { calculateCariDueStatus } from '../../utils/reminderUtils';
import { formatTRY } from '../../utils/exportUtils';

type BalanceFilter = 'all' | 'debtors' | 'overdue' | 'approaching' | 'creditors' | 'zero' | 'overlimit';

interface Summary {
  totalCount: number;
  customerCount: number;
  dealerCount: number;
  supplierCount: number;
  totalReceivables: number;
  totalPayables: number;
}

interface Props {
  cariler: CariAccount[];
  filteredCariler: CariAccount[];
  summary: Summary;
  isLoading: boolean;
  loadError: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  typeFilter: 'all' | CariType;
  setTypeFilter: (value: 'all' | CariType) => void;
  balanceFilter: BalanceFilter;
  setBalanceFilter: (value: BalanceFilter) => void;
  activeView: 'list' | 'calendar';
  setActiveView: (value: 'list' | 'calendar') => void;
  openMenuId: string | null;
  setOpenMenuId: (value: string | null) => void;
  overdueCariler: CariAccount[];
  approachingCariler: CariAccount[];
  overLimitCount: number;
  isExportingPDF: boolean;
  isExportingExcel: boolean;
  toastMessage: string | null;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (cari: CariAccount) => void;
  onDelete: (cari: CariAccount) => void;
  onOpenTransaction: (cari: CariAccount, mode: TransactionModalMode) => void;
  onOpenStatement: (cari: CariAccount) => void;
  onDownloadStatement: (cari: CariAccount) => void;
  onWhatsApp: (cari: CariAccount) => void;
  onEmail: (cari: CariAccount) => void;
  onOpenReminder: (cariId?: string) => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
}

const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-all duration-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
const iconButtonClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-all duration-100 active:scale-[0.98]';

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('') || 'CR';
}

function statusLabel(cari: CariAccount) {
  if (cari.status === 'blocked') return { label: 'Bloke', className: 'border-danger-border bg-danger-fill/10 text-danger-text' };
  if (cari.status === 'passive') return { label: 'Pasif', className: 'border-border bg-base-surface-2 text-text-secondary' };
  const due = calculateCariDueStatus(cari);
  if (cari.balance > 0 && due.isOverdue) return { label: 'Vadesi geçti', className: 'border-warning-border bg-warning-fill/10 text-warning-text' };
  if (cari.balance > 0) return { label: 'Borçlu', className: 'border-danger-border bg-danger-fill/10 text-danger-text' };
  if (cari.balance < 0) return { label: 'Alacaklı', className: 'border-info-border bg-info-fill/10 text-info-text' };
  return { label: 'Dengede', className: 'border-success-border bg-success-fill/10 text-success-text' };
}

function balanceText(cari: CariAccount) {
  if (cari.balance > 0) return formatTRY(cari.balance);
  if (cari.balance < 0) return `-${formatTRY(Math.abs(cari.balance))}`;
  return formatTRY(0);
}

function LoadingState() {
  return (
    <div className="divide-y divide-border" aria-label="Cari hesaplar yükleniyor">
      {[0, 1, 2, 3].map(item => (
        <div key={item} className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,1fr)_140px_150px_120px_52px] items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-3"><span className="h-11 w-11 animate-pulse rounded-xl bg-base-surface-2" /><span className="h-4 w-40 animate-pulse rounded bg-base-surface-2" /></div>
          <span className="h-4 w-24 animate-pulse rounded bg-base-surface-2" />
          <span className="h-4 w-20 animate-pulse rounded bg-base-surface-2" />
          <span className="h-4 w-24 animate-pulse rounded bg-base-surface-2" />
          <span className="h-7 w-20 animate-pulse rounded-lg bg-base-surface-2" />
          <span className="h-10 w-10 animate-pulse rounded-lg bg-base-surface-2" />
        </div>
      ))}
    </div>
  );
}

export default function CariFinanceWorkspace(props: Props) {
  const filtersActive = props.typeFilter !== 'all' || props.balanceFilter !== 'all' || !!props.searchQuery.trim();
  const clearFilters = () => {
    props.setSearchQuery('');
    props.setTypeFilter('all');
    props.setBalanceFilter('all');
  };

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-col gap-5 rounded-2xl border border-border bg-base-surface px-5 py-6 shadow-sm sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-success-text">Cari yönetimi</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-text-primary sm:text-3xl">Cari hesaplar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Müşteri, bayi ve tedarikçi bakiyelerini; vadeleri ve risk limitlerini tek ekrandan yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={props.onRefresh} className={`${actionClass} border-border bg-base-surface-2 text-text-primary hover:bg-base-surface`}>
            <RefreshCw className="h-4 w-4" /> Verileri yenile
          </button>
          <button type="button" onClick={props.onCreate} className={`${actionClass} border-success-border bg-success-fill px-4 text-white hover:opacity-90`}>
            <Plus className="h-4 w-4" /> Yeni cari
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Toplam alacak', value: formatTRY(props.summary.totalReceivables), detail: `${props.overdueCariler.length} vadesi geçen`, icon: ArrowDownRight, tone: 'border-success-border bg-success-fill/10 text-success-text' },
          { label: 'Vadesi geçen', value: formatTRY(props.overdueCariler.reduce((sum, cari) => sum + Math.max(cari.balance, 0), 0)), detail: `${props.overdueCariler.length} hesap`, icon: ShieldAlert, tone: 'border-danger-border bg-danger-fill/10 text-danger-text' },
          { label: 'Toplam borç', value: formatTRY(props.summary.totalPayables), detail: `${props.summary.supplierCount} tedarikçi`, icon: WalletCards, tone: 'border-info-border bg-info-fill/10 text-info-text' },
          { label: 'Aktif cari', value: String(props.summary.totalCount), detail: `${props.summary.customerCount} müşteri · ${props.summary.dealerCount} bayi`, icon: Users, tone: 'border-warning-border bg-warning-fill/10 text-warning-text' },
        ].map(metric => (
          <article key={metric.label} className="relative min-h-40 overflow-hidden rounded-2xl border border-border bg-base-surface p-5 shadow-xs">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${metric.tone}`}><metric.icon className="h-5 w-5" /></div>
            <p className="mt-5 text-xs font-semibold text-text-secondary">{metric.label}</p>
            <p className="mt-1 truncate text-2xl font-black tracking-[-0.03em] text-text-primary tabular-nums">{metric.value}</p>
            <p className="mt-2 text-[11px] font-semibold text-text-muted tabular-nums">{metric.detail}</p>
          </article>
        ))}
      </div>

      {(props.overdueCariler.length > 0 || props.approachingCariler.length > 0 || props.overLimitCount > 0) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning-border bg-warning-fill/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-base-surface text-warning-text"><Bell className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary">Tahsilat takibi gerekiyor</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary"><span className="font-bold tabular-nums">{props.overdueCariler.length}</span> geciken, <span className="font-bold tabular-nums">{props.approachingCariler.length}</span> yaklaşan, <span className="font-bold tabular-nums">{props.overLimitCount}</span> limit aşımı.</p>
            </div>
          </div>
          <button type="button" onClick={() => props.onOpenReminder()} className={`${actionClass} border-warning-border bg-base-surface text-warning-text hover:bg-warning-fill/10`}><MessageCircle className="h-4 w-4" /> Hatırlatma masası</button>
        </div>
      )}

      {props.toastMessage && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-success-border bg-success-fill/10 px-4 py-3 text-xs font-bold text-success-text">
          <CheckCircle2 className="h-4 w-4" /> {props.toastMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-base-surface shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit rounded-xl border border-border bg-base-surface-2 p-1">
              <button type="button" onClick={() => props.setActiveView('list')} className={`${actionClass} min-h-10 border-0 px-4 ${props.activeView === 'list' ? 'bg-base-surface text-text-primary shadow-xs' : 'bg-transparent text-text-secondary'}`}><Users className="h-4 w-4" /> Tüm cariler</button>
              <button type="button" onClick={() => props.setActiveView('calendar')} className={`${actionClass} min-h-10 border-0 px-4 ${props.activeView === 'calendar' ? 'bg-base-surface text-text-primary shadow-xs' : 'bg-transparent text-text-secondary'}`}><CalendarDays className="h-4 w-4" /> Vade takvimi</button>
            </div>
            {props.activeView === 'list' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={props.onExportPDF} disabled={props.isExportingPDF} className={`${actionClass} border-border bg-base-surface-2 text-text-primary hover:bg-base-surface`}><Download className="h-4 w-4" /> {props.isExportingPDF ? 'Hazırlanıyor' : 'PDF'}</button>
                <button type="button" onClick={props.onExportExcel} disabled={props.isExportingExcel} className={`${actionClass} border-border bg-base-surface-2 text-text-primary hover:bg-base-surface`}><FileSpreadsheet className="h-4 w-4 text-success-text" /> {props.isExportingExcel ? 'Hazırlanıyor' : 'Excel'}</button>
                <button type="button" onClick={props.onExportCSV} className={`${iconButtonClass} border-border bg-base-surface-2 text-text-secondary hover:text-text-primary`} title="CSV indir" aria-label="CSV indir"><FileDown className="h-4 w-4" /></button>
              </div>
            )}
          </div>

          {props.activeView === 'list' && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(240px,1fr)_180px_190px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input value={props.searchQuery} onChange={event => props.setSearchQuery(event.target.value)} placeholder="Firma, yetkili, kod, telefon veya vergi no ara" className="h-11 w-full rounded-lg border border-border bg-base-surface-2 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-success-border focus:ring-2 focus:ring-success-fill/15" />
              </label>
              <select value={props.typeFilter} onChange={event => props.setTypeFilter(event.target.value as 'all' | CariType)} className="h-11 rounded-lg border border-border bg-base-surface-2 px-3 text-xs font-semibold text-text-primary outline-none focus:border-success-border">
                <option value="all">Tüm cari türleri</option><option value="customer">Müşteri</option><option value="dealer">Bayi</option><option value="supplier">Tedarikçi</option>
              </select>
              <select value={props.balanceFilter} onChange={event => props.setBalanceFilter(event.target.value as BalanceFilter)} className="h-11 rounded-lg border border-border bg-base-surface-2 px-3 text-xs font-semibold text-text-primary outline-none focus:border-success-border">
                <option value="all">Tüm bakiyeler</option><option value="debtors">Borçlu hesaplar</option><option value="overdue">Vadesi geçenler</option><option value="approaching">Vadesi yaklaşanlar</option><option value="creditors">Alacaklı hesaplar</option><option value="zero">Kapalı hesaplar</option><option value="overlimit">Limit aşımı</option>
              </select>
              {filtersActive && <button type="button" onClick={clearFilters} className={`${actionClass} border-border bg-base-surface text-text-secondary hover:text-text-primary`}><RotateCcw className="h-4 w-4" /> Temizle</button>}
            </div>
          )}
        </div>

        {props.activeView === 'calendar' ? (
          <div className="p-4 sm:p-5"><CariPaymentCalendar cariler={props.cariler} onRefreshParent={props.onRefresh} onOpenTransactionModal={props.onOpenTransaction} onSelectCariStatement={props.onDownloadStatement} /></div>
        ) : props.loadError ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-danger-border bg-danger-fill/10 text-danger-text"><AlertTriangle className="h-6 w-6" /></div>
            <h3 className="mt-4 text-base font-bold text-text-primary">Cari verileri alınamadı</h3><p className="mt-2 max-w-md text-sm text-text-secondary">{props.loadError}</p>
            <button type="button" onClick={props.onRefresh} className={`${actionClass} mt-5 border-success-border bg-success-fill text-white`}><RefreshCw className="h-4 w-4" /> Yeniden dene</button>
          </div>
        ) : props.isLoading ? <LoadingState /> : props.filteredCariler.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-base-surface-2 text-text-secondary"><Building2 className="h-6 w-6" /></div>
            <h3 className="mt-4 text-base font-bold text-text-primary">{props.cariler.length ? 'Eşleşen cari bulunamadı' : 'Henüz cari hesabı yok'}</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">{props.cariler.length ? 'Aramayı veya filtreleri temizleyin.' : 'İlk müşteri, bayi veya tedarikçi hesabını oluşturun.'}</p>
            <button type="button" onClick={props.cariler.length ? clearFilters : props.onCreate} className={`${actionClass} mt-5 border-success-border bg-success-fill text-white`}>{props.cariler.length ? <RotateCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{props.cariler.length ? 'Filtreleri temizle' : 'Yeni cari oluştur'}</button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1040px] table-fixed">
                <thead className="bg-base-surface-2/70 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                  <tr><th className="w-[27%] px-5 py-3.5">Cari hesap</th><th className="w-[16%] px-4 py-3.5">Yetkili</th><th className="w-[13%] px-4 py-3.5">Risk limiti</th><th className="w-[14%] px-4 py-3.5">Bakiye</th><th className="w-[12%] px-4 py-3.5">Durum</th><th className="w-[18%] px-4 py-3.5 text-right">Hızlı işlemler</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {props.filteredCariler.map(cari => {
                    const badge = statusLabel(cari);
                    const ratio = cari.creditLimit > 0 ? Math.min(100, Math.round((Math.max(cari.balance, 0) / cari.creditLimit) * 100)) : 0;
                    return (
                      <tr key={cari.id} className="group transition-colors hover:bg-base-surface-2/50">
                        <td className="px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-base-surface-2 text-xs font-black text-text-secondary">{initials(cari.companyName)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">{cari.companyName}</p><p className="mt-1 truncate text-[11px] font-semibold text-text-muted"><span className="tabular-nums">{cari.code}</span> · {cari.type === 'dealer' ? 'Bayi' : cari.type === 'supplier' ? 'Tedarikçi' : 'Müşteri'}{cari.city ? ` · ${cari.city}` : ''}</p></div></div></td>
                        <td className="px-4 py-4"><p className="truncate text-xs font-semibold text-text-primary">{cari.name || '—'}</p><p className="mt-1 truncate text-[11px] text-text-muted">{cari.phone || cari.email || 'İletişim bilgisi yok'}</p></td>
                        <td className="px-4 py-4"><p className="text-xs font-semibold text-text-primary tabular-nums">{formatTRY(cari.creditLimit || 0)}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base-surface-2"><div className={`h-full rounded-full ${ratio >= 100 ? 'bg-danger-fill' : ratio >= 75 ? 'bg-warning-fill' : 'bg-success-fill'}`} style={{ width: `${ratio}%` }} /></div></td>
                        <td className="px-4 py-4"><p className={`text-sm font-black tabular-nums ${cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-info-text' : 'text-success-text'}`}>{balanceText(cari)}</p><p className="mt-1 text-[10px] font-semibold text-text-muted">{cari.balance > 0 ? 'Alacağımız' : cari.balance < 0 ? 'Borcumuz' : 'Kapalı hesap'}</p></td>
                        <td className="px-4 py-4"><span className={`inline-flex min-h-8 items-center rounded-lg border px-2.5 text-[11px] font-bold ${badge.className}`}><span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />{badge.label}</span></td>
                        <td className="px-4 py-4"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => props.onOpenStatement(cari)} className={`${iconButtonClass} border-transparent bg-transparent text-text-muted hover:border-border hover:bg-base-surface-2 hover:text-text-primary`} title="Ekstre" aria-label={`${cari.companyName} ekstresi`}><FileText className="h-4 w-4" /></button><button type="button" onClick={() => props.onOpenTransaction(cari, 'payment')} className={`${iconButtonClass} border-transparent bg-transparent text-success-text hover:border-success-border hover:bg-success-fill/10`} title="Tahsilat" aria-label={`${cari.companyName} tahsilat ekle`}><ArrowDownRight className="h-4 w-4" /></button><button type="button" onClick={() => props.onEdit(cari)} className={`${iconButtonClass} border-transparent bg-transparent text-text-muted hover:border-border hover:bg-base-surface-2 hover:text-text-primary`} title="Düzenle" aria-label={`${cari.companyName} kartını düzenle`}><Edit3 className="h-4 w-4" /></button><MenuTrigger cari={cari} transparent {...props} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:hidden">
              {props.filteredCariler.map(cari => {
                const badge = statusLabel(cari);
                const due = calculateCariDueStatus(cari);
                return (
                  <article key={cari.id} className="min-w-0 rounded-xl border border-border bg-base-surface p-4 shadow-xs">
                    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-base-surface-2 text-xs font-black text-text-secondary">{initials(cari.companyName)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-text-primary">{cari.companyName}</p><p className="mt-1 truncate text-[11px] text-text-muted">{cari.code} · {cari.name || 'Yetkili yok'}</p></div><span className={`inline-flex min-h-7 items-center rounded-lg border px-2 text-[10px] font-bold ${badge.className}`}>{badge.label}</span></div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-base-surface-2/60 p-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Net bakiye</p><p className={`mt-1 text-sm font-black tabular-nums ${cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-info-text' : 'text-success-text'}`}>{balanceText(cari)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Vade</p><p className="mt-1 text-xs font-bold text-text-primary">{cari.balance > 0 ? due.daysText : `${cari.paymentTermDays || 0} gün`}</p></div></div>
                    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => props.onOpenStatement(cari)} className={`${actionClass} flex-1 border-border bg-base-surface-2 text-text-primary`}><FileText className="h-4 w-4" /> Ekstre</button><button type="button" onClick={() => props.onOpenTransaction(cari, 'payment')} className={`${actionClass} flex-1 border-success-border bg-success-fill/10 text-success-text`}><ArrowDownRight className="h-4 w-4" /> Tahsilat</button><button type="button" onClick={() => props.onEdit(cari)} className={`${iconButtonClass} border-border bg-base-surface-2 text-text-secondary`} aria-label="Cari kartını düzenle"><Edit3 className="h-4 w-4" /></button><MenuTrigger cari={cari} {...props} /></div>
                  </article>
                );
              })}
            </div>
            <footer className="flex flex-col gap-2 border-t border-border bg-base-surface-2/60 px-5 py-3 text-[11px] text-text-secondary sm:flex-row sm:items-center sm:justify-between"><span><strong className="font-bold text-text-primary tabular-nums">{props.filteredCariler.length}</strong> / {props.cariler.length} cari gösteriliyor</span><span>Bakiyeler canlı güncellenir.</span></footer>
          </>
        )}
      </div>
    </section>
  );
}

function MenuTrigger({ cari, transparent = false, ...props }: { cari: CariAccount; transparent?: boolean } & Props) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = props.openMenuId === cari.id;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={event => event.stopPropagation()}
        onClick={() => props.setOpenMenuId(isOpen ? null : cari.id)}
        className={`${iconButtonClass} ${transparent ? 'border-transparent bg-transparent' : 'border-border bg-base-surface-2'} text-text-muted hover:border-border hover:bg-base-surface-2 hover:text-text-primary`}
        title="Diğer işlemler"
        aria-label={`${cari.companyName} diğer işlemleri`}
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {isOpen && <RowMenu anchor={buttonRef.current} cari={cari} {...props} />}
    </>
  );
}

function RowMenu({ anchor, cari, ...props }: { anchor: HTMLButtonElement | null; cari: CariAccount } & Props) {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!anchor) return;
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 224;
      setPosition({
        left: Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth)),
        top: Math.max(8, rect.top - 8),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor]);

  const run = (action: () => void) => { action(); props.setOpenMenuId(null); };
  const menu = (
    <div
      id={`cari-menu-${cari.id}`}
      onMouseDown={event => event.stopPropagation()}
      className="fixed z-[70] w-56 -translate-y-full overflow-hidden rounded-xl border border-border bg-base-surface p-1.5 text-left shadow-2xl"
      style={{ left: position.left, top: position.top }}
    >
      <MenuButton icon={FileText} label="Ekstreyi görüntüle" onClick={() => run(() => props.onOpenStatement(cari))} />
      <MenuButton icon={ArrowDownRight} label="Tahsilat / ödeme ekle" onClick={() => run(() => props.onOpenTransaction(cari, 'payment'))} />
      <MenuButton icon={ArrowUpRight} label="Borç / fatura ekle" onClick={() => run(() => props.onOpenTransaction(cari, 'debt'))} />
      <MenuButton icon={MessageCircle} label="WhatsApp hatırlat" onClick={() => run(() => props.onWhatsApp(cari))} />
      <MenuButton icon={Mail} label="E-posta hatırlat" onClick={() => run(() => props.onEmail(cari))} />
      <MenuButton icon={Bell} label="Hatırlatmayı özelleştir" onClick={() => run(() => props.onOpenReminder(cari.id))} />
      <MenuButton icon={Download} label="PDF ekstre indir" onClick={() => run(() => props.onDownloadStatement(cari))} />
      <div className="my-1 border-t border-border" />
      <MenuButton icon={Edit3} label="Cari kartını düzenle" onClick={() => run(() => props.onEdit(cari))} />
      <MenuButton icon={Trash2} label="Cari hesabını sil" danger onClick={() => run(() => props.onDelete(cari))} />
    </div>
  );
  return createPortal(menu, document.body);
}

function MenuButton({ icon: Icon, label, onClick, danger = false }: { icon: typeof FileText; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-colors ${danger ? 'text-danger-text hover:bg-danger-fill/10' : 'text-text-primary hover:bg-base-surface-2'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>;
}
