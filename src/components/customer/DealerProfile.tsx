import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2, User as UserIcon, Phone, MapPin, Receipt, ShoppingBag, FileText,
  Wallet, ShieldCheck, Sun, Moon, Monitor, LogOut, Save, Pencil, X, Check,
  TrendingUp, Clock, BadgeCheck, AlertCircle, Loader2, ChevronRight,
  CreditCard, Calendar, Star, Package, Lock, Eye, EyeOff, ArrowUpRight, Hourglass
} from 'lucide-react';
import type { User, Order, Quote } from '../../types';
import { updateUserProfileInFirestore } from '../../lib/firestoreService';
import { changePassword } from '../../lib/auth';
import { db, collection, getDocs, query, where } from '../../lib/firebase';
import { formatTRY } from '../../utils/exportUtils';

interface Props {
  user: User | null;
  orders: Order[];
  quotes: Quote[];
  theme: 'dark' | 'light' | 'system';
  onThemeChange: (t: 'dark' | 'light' | 'system') => void;
  onUserUpdated: (u: User) => void;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (key: 'orders' | 'quotes') => void;
}

interface CariInfo {
  balance: number;
  creditLimit: number;
  paymentTermDays: number;
  status: string;
}

function getInitials(name?: string, company?: string): string {
  const src = company || name || '';
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function cariStatusLabel(status: string) {
  switch (status) {
    case 'active': return { label: 'Aktif', color: 'text-success-text bg-success-fill' };
    case 'pending': return { label: 'Onay Bekliyor', color: 'text-warning-text bg-warning-fill' };
    case 'passive': return { label: 'Pasif', color: 'text-text-muted bg-base-surface-2' };
    case 'blocked': return { label: 'Bloke', color: 'text-danger-text bg-danger-fill' };
    default: return { label: status, color: 'text-text-muted bg-base-surface-2' };
  }
}

export default function DealerProfile({
  user, orders, quotes, theme, onThemeChange, onUserUpdated, onLogin, onLogout, onNavigate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [cari, setCari] = useState<CariInfo | null>(null);

  const [form, setForm] = useState({
    name: '', companyName: '', phone: '', address: '', city: '', taxNumber: '', taxOffice: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      companyName: user.companyName || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      taxNumber: user.taxNumber || '',
      taxOffice: user.taxOffice || '',
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.email) return;
      try {
        const snap = await getDocs(
          query(collection(db, 'cari_accounts'), where('email', '==', user.email.toLowerCase()))
        );
        if (cancelled) return;
        snap.forEach(d => {
          const data = d.data() as any;
          setCari({
            balance: Number(data.balance) || 0,
            creditLimit: Number(data.creditLimit) || 0,
            paymentTermDays: Number(data.paymentTermDays) || 30,
            status: data.status || 'pending',
          });
        });
      } catch { /* Kural hatası → sessiz */ }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const stats = useMemo(() => {
    const total = orders.reduce((t, o) => t + (Number(o.total) || 0), 0);
    const active = orders.filter(o => ['pending', 'approved', 'preparing', 'ready', 'shipped', 'out_for_delivery'].includes(o.status)).length;
    const openQuotes = quotes.filter(q => q.status !== 'accepted' && q.status !== 'rejected').length;
    return { count: orders.length, total, active, openQuotes };
  }, [orders, quotes]);

  const joinedDate = useMemo(() => {
    if (!user?.createdAt) return null;
    const d = new Date(user.createdAt);
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
      : null;
  }, [user?.createdAt]);

  const save = async () => {
    if (!user) return;
    if (!form.name.trim()) { setMsg({ type: 'err', text: 'Ad soyad boş olamaz.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      await updateUserProfileInFirestore(user.id, form);
      onUserUpdated({ ...user, ...form });
      setEditing(false);
      setMsg({ type: 'ok', text: 'Bilgileriniz kaydedildi.' });
    } catch (e: any) {
      setMsg({ type: 'err', text: 'Kaydedilemedi: ' + (e?.message || 'bilinmeyen hata') });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-9 h-9 text-brand-600" />
        </div>
        <h1 className="text-2xl font-black text-text-primary mb-2">Hesabınıza giriş yapın</h1>
        <p className="text-sm text-text-secondary mb-8 max-w-xs mx-auto">
          Siparişlerinize, tekliflerinize ve cari hesabınıza erişmek için bayi girişi yapın.
        </p>
        <button
          onClick={onLogin}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-brand-600/20"
        >
          Bayi Girişi Yap <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const initials = getInitials(user.name, user.companyName);
  const cariStatus = cari ? cariStatusLabel(cari.status) : null;
  const limitUsed = cari && cari.creditLimit > 0
    ? Math.min(100, Math.round((Math.abs(cari.balance) / cari.creditLimit) * 100))
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-1 py-2 space-y-4 pb-[max(calc(var(--shell-nav-space,72px)+20px),28px)]">

      {/* ─── HERO HEADER ─── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600/90 via-brand-700 to-brand-900 p-6 text-white shadow-xl shadow-brand-600/15">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="relative flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <span className="text-2xl font-black tracking-tight">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black truncate">{user.companyName || user.name}</h1>
            {user.companyName && <p className="text-sm text-white/80 truncate">{user.name}</p>}
            <p className="text-xs text-white/60 truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 text-white text-[11px] font-bold border border-white/25">
                <UserIcon className="w-3.5 h-3.5" /> {user.isDealer ? 'Bayi Profili' : 'Müşteri Profili'}
              </span>
              {user.isDealer && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 text-white text-[11px] font-bold border border-white/25">
                  <BadgeCheck className="w-3.5 h-3.5" /> Yetkili Bayi
                </span>
              )}
              {user.discountTier && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 text-white text-[11px] font-bold border border-white/25">
                  <Star className="w-3 h-3" /> {user.discountTier}
                </span>
              )}
              {joinedDate && (
                <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/70 text-[11px] font-semibold">
                  <Calendar className="w-3 h-3 inline mr-1" />{joinedDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── STATS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Toplam Sipariş', value: String(stats.count),
            icon: <ShoppingBag className="w-4 h-4" />, badge: null,
            onClick: () => onNavigate('orders'),
            accent: 'text-brand-600',
          },
          {
            label: 'Devam Eden', value: String(stats.active),
            icon: <Clock className="w-4 h-4" />,
            badge: stats.active > 0 ? 'Aktif' : null,
            onClick: () => onNavigate('orders'),
            accent: 'text-warning-text',
          },
          {
            label: 'Açık Teklif', value: String(stats.openQuotes),
            icon: <FileText className="w-4 h-4" />, badge: null,
            onClick: () => onNavigate('quotes'),
            accent: 'text-info-text',
          },
          {
            label: 'Toplam Tutar', value: formatTRY(stats.total),
            icon: <TrendingUp className="w-4 h-4" />, badge: null,
            onClick: undefined,
            accent: 'text-success-text',
          },
        ].map((s, i) => (
          <div
            key={i}
            onClick={s.onClick}
            className={`group rounded-2xl bg-base-surface border border-border p-4 min-w-0 transition-all duration-200 ${s.onClick ? 'cursor-pointer hover:border-border-strong hover:shadow-sm' : ''}`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className={`flex items-center gap-1.5 ${s.accent} opacity-70`}>
                {s.icon}
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{s.label}</span>
              </div>
              {s.onClick && <ArrowUpRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className="text-xl font-black text-text-primary truncate">{s.value}</p>
            {s.badge && (
              <span className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning-fill text-warning-text">{s.badge}</span>
            )}
          </div>
        ))}
      </div>

      {/* ─── CARİ HESAP ─── */}
      {cari && (
        <div className="rounded-3xl bg-base-surface border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-2 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">Cari Hesap</h2>
                <p className="text-[11px] text-text-muted">Güncel bakiye ve kredi durumu</p>
              </div>
            </div>
            {cariStatus && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cariStatus.color}`}>
                {cari.status === 'pending' && <Hourglass className="w-3 h-3" />}
                {cari.status === 'active' && <Check className="w-3 h-3" />}
                {cariStatus.label}
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <p className="text-[11px] text-text-muted font-semibold mb-0.5">Bakiye</p>
                <p className={`text-3xl font-black leading-none ${cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-success-text' : 'text-text-muted'}`}>
                  {cari.balance === 0 ? '₺0' : formatTRY(Math.abs(cari.balance))}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {cari.balance > 0 ? 'Borç bakiyeniz' : cari.balance < 0 ? 'Alacak bakiyeniz' : 'Bakiye dengede'}
                </p>
              </div>
              {cari.creditLimit > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
                    <span>Kredi Limiti</span>
                    <span className="font-bold text-text-primary">{formatTRY(cari.creditLimit)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-base-surface-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${limitUsed > 80 ? 'bg-danger-text' : limitUsed > 50 ? 'bg-warning-text' : 'bg-success-text'}`}
                      style={{ width: `${limitUsed}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">{limitUsed}% kullanıldı</p>
                </div>
              )}
            </div>
            {cari.paymentTermDays > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-[11px] text-text-secondary">
                <Clock className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                <span>Vade: <strong className="text-text-primary">{cari.paymentTermDays} gün</strong></span>
              </div>
            )}
            {cari.status === 'pending' && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-fill border border-warning-border text-[11px] text-warning-text">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Cari hesabınız yönetici onayı bekliyor. Onaylandıktan sonra alışveriş limitiniz aktif olacaktır.</span>
              </div>
            )}
            <p className="text-[10px] text-text-muted">
              Ödeme ve mutabakat için Alpha Teknik ile iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* ─── PROFİL BİLGİLERİ ─── */}
      <div className="rounded-3xl bg-base-surface border border-border">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-base-surface-2 border border-border flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-text-muted" />
            </div>
            <h2 className="text-sm font-bold text-text-primary">Firma & İletişim</h2>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-primary hover:border-border-strong transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" /> Düzenle
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditing(false); setMsg(null); }}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-secondary cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Vazgeç
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Kaydet
              </button>
            </div>
          )}
        </div>

        <div className="p-5">
          {msg && (
            <div className={`flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl text-xs font-semibold ${msg.type === 'ok' ? 'bg-success-fill text-success-text border border-success-border' : 'bg-danger-fill text-danger-text border border-danger-border'}`}>
              {msg.type === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileField({ editing, form, setForm, label: 'Firma Adı', val: user.companyName, key_: 'companyName', icon: <Building2 className="w-3 h-3" /> })}
            {profileField({ editing, form, setForm, label: 'Yetkili Ad Soyad', val: user.name, key_: 'name', icon: <UserIcon className="w-3 h-3" /> })}
            {profileField({ editing, form, setForm, label: 'Telefon', val: user.phone, key_: 'phone', icon: <Phone className="w-3 h-3" />, inputType: 'tel' })}
            {profileField({ editing, form, setForm, label: 'Şehir', val: user.city, key_: 'city', icon: <MapPin className="w-3 h-3" /> })}
            <div className="sm:col-span-2">
              {profileField({ editing, form, setForm, label: 'Adres', val: user.address, key_: 'address', icon: <MapPin className="w-3 h-3" /> })}
            </div>
            {profileField({ editing, form, setForm, label: 'Vergi No / TCKN', val: user.taxNumber, key_: 'taxNumber', icon: <Receipt className="w-3 h-3" /> })}
            {profileField({ editing, form, setForm, label: 'Vergi Dairesi', val: user.taxOffice, key_: 'taxOffice', icon: <Receipt className="w-3 h-3" /> })}
          </div>

          <p className="text-[11px] text-text-muted mt-4 flex items-center gap-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            E-posta adresi ve iskonto kademeniz güvenlik gereği buradan değiştirilemez.
          </p>
        </div>
      </div>

      {/* ─── GÖRÜNÜM ─── */}
      <div className="rounded-3xl bg-base-surface border border-border p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-base-surface-2 border border-border flex items-center justify-center">
            <Monitor className="w-4 h-4 text-text-muted" />
          </div>
          <h2 className="text-sm font-bold text-text-primary">Görünüm</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'light', label: 'Gündüz', icon: <Sun className="w-5 h-5" /> },
            { id: 'dark', label: 'Gece', icon: <Moon className="w-5 h-5" /> },
            { id: 'system', label: 'Sistem', icon: <Monitor className="w-5 h-5" /> },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={`relative flex flex-col items-center justify-center gap-2 min-h-[72px] rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                theme === t.id
                  ? 'bg-brand-500/10 border-brand-600 text-brand-600 shadow-sm'
                  : 'bg-base-surface-2 border-border text-text-secondary hover:border-border-strong'
              }`}
            >
              {t.icon}
              {t.label}
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── GÜVENLİK ─── */}
      <PasswordCard />

      {/* ─── ÇIKIŞ ─── */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2.5 min-h-[52px] rounded-2xl bg-danger-fill text-danger-text font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border border-danger-border"
      >
        <LogOut className="w-4 h-4" /> Çıkış Yap
      </button>

    </div>
  );
}

function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [nextR, setNextR] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const strength = next.length === 0 ? 0 : next.length < 6 ? 1 : next.length < 10 ? 2 : 3;

  const submit = async () => {
    setMsg(null);
    if (next.length < 6) { setMsg({ type: 'err', text: 'Yeni şifre en az 6 karakter.' }); return; }
    if (next !== nextR) { setMsg({ type: 'err', text: 'Şifreler eşleşmiyor.' }); return; }
    setLoading(true);
    try {
      await changePassword(cur, next);
      setMsg({ type: 'ok', text: 'Şifreniz güncellendi.' });
      setCur(''); setNext(''); setNextR('');
      setTimeout(() => { setOpen(false); setMsg(null); }, 2500);
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Şifre güncellenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-base-surface border border-border overflow-hidden">
      <button
        onClick={() => setOpen(a => !a)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-base-surface-2 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-base-surface-2 border border-border flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-text-muted" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-text-primary">Hesap Güvenliği</p>
            <p className="text-[11px] text-text-muted">Şifre değiştirme</p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-3">
          {msg && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${msg.type === 'ok' ? 'bg-success-fill text-success-text border border-success-border' : 'bg-danger-fill text-danger-text border border-danger-border'}`}>
              {msg.type === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="relative">
            <input
              type={showCur ? 'text' : 'password'}
              value={cur}
              onChange={e => setCur(e.target.value)}
              placeholder="Mevcut şifreniz"
              autoComplete="current-password"
              className="w-full min-h-[44px] px-3 pr-10 py-2.5 rounded-xl bg-base-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-border-strong placeholder:text-text-muted"
            />
            <button type="button" onClick={() => setShowCur(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer">
              {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="Yeni şifre (en az 6 karakter)"
              autoComplete="new-password"
              className="w-full min-h-[44px] px-3 pr-10 py-2.5 rounded-xl bg-base-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-border-strong placeholder:text-text-muted"
            />
            <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer">
              {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {next.length > 0 && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${s <= strength ? (strength === 1 ? 'bg-danger-text' : strength === 2 ? 'bg-warning-text' : 'bg-success-text') : 'bg-base-surface-2'}`} />
              ))}
              <span className="text-[11px] text-text-muted">{strength === 1 ? 'Zayıf' : strength === 2 ? 'Orta' : 'Güçlü'}</span>
            </div>
          )}

          <input
            type="password"
            value={nextR}
            onChange={e => setNextR(e.target.value)}
            placeholder="Yeni şifre (tekrar)"
            autoComplete="new-password"
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-base-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-border-strong placeholder:text-text-muted"
          />

          <button
            onClick={submit}
            disabled={loading || !cur || !next}
            className="w-full min-h-[44px] rounded-xl bg-brand-600 text-white text-sm font-bold hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Şifreyi Güncelle
          </button>
        </div>
      )}
    </div>
  );
}

function profileField({
  editing, form, setForm, label, val, key_, icon, inputType = 'text',
}: {
  editing: boolean;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  label: string;
  val?: string;
  key_: string;
  icon: React.ReactNode;
  inputType?: string;
}) {
  return (
    <div className="min-w-0" key={key_}>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
        {icon}{label}
      </label>
      {editing ? (
        <input
          type={inputType}
          value={form[key_] ?? ''}
          onChange={e => setForm((f: any) => ({ ...f, [key_]: e.target.value }))}
          className="w-full min-w-0 min-h-[44px] px-3 py-2.5 rounded-xl bg-base-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-border-strong placeholder:text-text-muted"
        />
      ) : (
        <p className="text-sm text-text-primary min-h-[44px] flex items-center break-words">
          {val || <span className="text-text-muted">—</span>}
        </p>
      )}
    </div>
  );
}
