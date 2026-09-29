import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Users, Shield, Truck, ShoppingBag, Search, Loader2, AlertCircle, UserPlus, Trash2,
  Pencil, Eye, EyeOff, Wand2, KeyRound, RefreshCw, Check, TriangleAlert,
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import type { UserRole } from '../../types';

interface UserRecord {
  id: string;
  email: string;
  username?: string;
  name: string;
  companyName?: string;
  phone?: string;
  role: UserRole;
  createdAt?: string;
}

interface FormState {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  companyName: string;
  phone: string;
}

const EMPTY_FORM: FormState = { name: '', username: '', email: '', password: '', role: 'operasyon', companyName: '', phone: '' };

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'admin',     label: 'Yönetici',     desc: 'Tüm modüllere tam erişim',        icon: <Shield className="w-3.5 h-3.5" />,      color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'operasyon', label: 'Operasyon',    desc: 'Toplama & teslimat süreçleri',    icon: <Truck className="w-3.5 h-3.5" />,       color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'customer',  label: 'Bayi/Müşteri', desc: 'Sipariş, katalog ve teklifler',   icon: <ShoppingBag className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

const roleMeta = (role: UserRole) => ROLES.find(r => r.value === role) ?? ROLES[2];

function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?';
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => chars[n % chars.length]).join('');
}

function passwordStrength(pw: string): { score: number; label: string; bar: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Çok zayıf', bar: 'bg-red-500' },
    { label: 'Zayıf', bar: 'bg-red-500' },
    { label: 'Orta', bar: 'bg-amber-500' },
    { label: 'İyi', bar: 'bg-emerald-500' },
    { label: 'Güçlü', bar: 'bg-emerald-600' },
  ];
  return { score, ...map[score] };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'İşlem başarısız oldu.');
  return data as T;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  displayMode?: 'modal' | 'page';
}

const inputCls = 'w-full px-3 py-2.5 min-h-[44px] text-sm bg-base-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500';

export default function UserManagementModal({ isOpen, onClose, displayMode = 'modal' }: Props) {
  useModalBehavior(isOpen && displayMode === 'modal', onClose);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // form: null = kapalı, 'new' = yeni kullanıcı, UserRecord = düzenleme
  const [editing, setEditing] = useState<'new' | UserRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleting, setDeleting] = useState<UserRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ users: UserRecord[] }>('/api/admin/users');
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const openNew = () => { setForm(EMPTY_FORM); setFormError(null); setShowPw(false); setEditing('new'); };
  const openEdit = (u: UserRecord) => {
    setForm({ name: u.name || '', username: u.username || '', email: u.email, password: '', role: u.role, companyName: u.companyName || '', phone: u.phone || '' });
    setFormError(null); setShowPw(false); setEditing(u);
  };
  const closeForm = () => { if (!submitting) setEditing(null); };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const isNew = editing === 'new';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    if (!form.name.trim()) return setFormError('Ad soyad zorunludur.');
    if (!form.email.trim()) return setFormError('E-posta zorunludur.');
    if (isNew && form.password.length < 8) return setFormError('Şifre en az 8 karakter olmalıdır.');
    if (!isNew && form.password && form.password.length < 8) return setFormError('Yeni şifre en az 8 karakter olmalıdır.');

    setSubmitting(true);
    try {
      if (isNew) {
        const { user } = await api<{ user: UserRecord }>('/api/admin/users', { method: 'POST', body: JSON.stringify(form) });
        setUsers(prev => [...prev, user]);
        notify('ok', `${user.name} oluşturuldu.`);
      } else {
        const { user } = await api<{ user: UserRecord }>(`/api/admin/users/${(editing as UserRecord).id}`, { method: 'PATCH', body: JSON.stringify(form) });
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
        notify('ok', `${user.name} güncellendi.`);
      }
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'İşlem başarısız oldu.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/admin/users/${deleting.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== deleting.id));
      notify('ok', `${deleting.name || deleting.email} silindi.`);
      setDeleting(null);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Silinemedi.');
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      ((u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.companyName || '').toLowerCase().includes(q))
    );
  }, [users, search, roleFilter]);

  const counts = useMemo(() => ({
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    operasyon: users.filter(u => u.role === 'operasyon').length,
    customer: users.filter(u => u.role === 'customer').length,
  }), [users]);

  if (!isOpen) return null;

  const strength = passwordStrength(form.password);

  return (
    <div
      className={displayMode === 'modal' ? 'fixed inset-0 z-50 flex items-center justify-center p-4' : 'w-full'}
      onClick={displayMode === 'modal' ? onClose : undefined}
    >
      {displayMode === 'modal' && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />}
      <div
        role={displayMode === 'modal' ? 'dialog' : 'region'}
        aria-modal={displayMode === 'modal' ? true : undefined}
        aria-label="Kullanıcı ve Rol Yönetimi"
        className={`relative bg-base-surface rounded-2xl border border-border w-full flex flex-col overflow-hidden ${displayMode === 'modal' ? 'shadow-2xl max-w-3xl max-h-[88vh]' : 'shadow-sm min-h-[560px]'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-text-primary">Kullanıcı & Rol Yönetimi</h2>
              <p className="text-xs text-text-muted tabular-nums">{users.length} kullanıcı</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              disabled={loading}
              aria-label="Yenile"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-base-surface-2 text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Kullanıcı</span>
            </button>
            {displayMode === 'modal' && (
              <button onClick={onClose} aria-label="Kapat" className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-base-surface-2 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search + role filter */}
        <div className="px-5 py-3 border-b border-border shrink-0 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="İsim, kullanıcı adı, e-posta veya firma ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([{ value: 'all', label: 'Tümü' }, ...ROLES] as { value: UserRole | 'all'; label: string }[]).map(r => {
              const active = roleFilter === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setRoleFilter(r.value)}
                  className={`px-3 min-h-[36px] rounded-full border text-xs font-semibold transition-all active:scale-[0.98] ${
                    active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-base-surface border-border text-text-muted hover:text-text-primary hover:bg-base-surface-2'
                  }`}
                >
                  {r.label} <span className="tabular-nums opacity-80">{counts[r.value]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading && users.length === 0 ? (
            <div className="divide-y divide-border" aria-busy="true">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-base-surface-2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 rounded bg-base-surface-2" />
                    <div className="h-3 w-56 rounded bg-base-surface-2" />
                  </div>
                  <div className="h-6 w-20 rounded-md bg-base-surface-2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <p className="text-sm text-text-primary font-medium">{error}</p>
              <p className="text-xs text-text-muted">Bağlantınızı kontrol edip yeniden deneyin.</p>
              <button onClick={load} className="px-4 min-h-[44px] rounded-lg border border-border text-sm font-semibold hover:bg-base-surface-2 transition-all active:scale-[0.98]">Tekrar Dene</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <Users className="w-6 h-6 text-text-muted" />
              <p className="text-sm text-text-primary font-medium">{users.length === 0 ? 'Henüz kullanıcı yok' : 'Aramanızla eşleşen kullanıcı bulunamadı'}</p>
              {users.length === 0 && (
                <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all active:scale-[0.98]">
                  <UserPlus className="w-4 h-4" /> İlk kullanıcıyı ekle
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(user => {
                const meta = roleMeta(user.role);
                return (
                  <li key={user.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-base-surface-2/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-base-surface-2 border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                      {(user.name || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.name || '—'}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate">
                        {user.username && <span className="font-mono">@{user.username} · </span>}
                        {user.email}
                      </p>
                      {user.companyName && <p className="text-xs text-text-muted truncate">{user.companyName}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(user)}
                        aria-label={`${user.name} düzenle`}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-base-surface-2 transition-all active:scale-[0.98]"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(user)}
                        aria-label={`${user.name} sil`}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-all active:scale-[0.98]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border text-xs text-text-muted shrink-0">
          Rol ve şifre değişiklikleri kullanıcının bir sonraki girişinde geçerli olur.
        </div>

        {/* Toast */}
        {toast && (
          <div
            role="status"
            className={`absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.text}
          </div>
        )}

        {/* Create / Edit sheet */}
        {editing && (
          <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4" onClick={closeForm}>
            <form
              onSubmit={submit}
              onClick={e => e.stopPropagation()}
              className="bg-base-surface w-full sm:max-w-lg max-h-full overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-base-surface">
                <h3 className="text-sm font-bold text-text-primary">{isNew ? 'Yeni Kullanıcı Tanımla' : 'Kullanıcıyı Düzenle'}</h3>
                <button type="button" onClick={closeForm} aria-label="Kapat" className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-base-surface-2 text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Role cards */}
                <fieldset>
                  <legend className="text-xs font-semibold text-text-muted mb-2">Rol</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {ROLES.map(r => {
                      const active = form.role === r.value;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => set('role', r.value)}
                          aria-pressed={active}
                          className={`text-left p-3 min-h-[44px] rounded-lg border transition-all active:scale-[0.98] ${
                            active ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/60' : 'border-border hover:bg-base-surface-2'
                          }`}
                        >
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${r.color}`}>{r.icon} {r.label}</span>
                          <p className="text-[11px] text-text-muted mt-1.5 leading-snug">{r.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-text-muted">Ad Soyad *</span>
                    <input className={`${inputCls} mt-1`} value={form.name} onChange={e => set('name', e.target.value)} autoComplete="off" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-muted">Kullanıcı Adı</span>
                    <input
                      className={`${inputCls} mt-1 font-mono`}
                      value={form.username}
                      onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="ornek.kullanici"
                      autoComplete="off"
                      maxLength={32}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-text-muted">E-posta *</span>
                  <input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={e => set('email', e.target.value)} autoComplete="off" />
                </label>

                <div>
                  <span className="text-xs font-semibold text-text-muted">
                    {isNew ? 'Şifre *' : 'Yeni Şifre'} {!isNew && <span className="font-normal">(boş bırakılırsa değişmez)</span>}
                  </span>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        className={`${inputCls} pl-9 pr-11 font-mono`}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        autoComplete="new-password"
                        placeholder="En az 8 karakter"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-text-muted hover:text-text-primary"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { set('password', generatePassword()); setShowPw(true); }}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-border text-xs font-semibold text-text-primary hover:bg-base-surface-2 transition-all active:scale-[0.98]"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Üret
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 flex items-center gap-2" aria-live="polite">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map(i => (
                          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.bar : 'bg-base-surface-2'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-text-muted w-16 text-right">{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-text-muted">Firma</span>
                    <input className={`${inputCls} mt-1`} value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-text-muted">Telefon</span>
                    <input type="tel" className={`${inputCls} mt-1 tabular-nums`} value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </label>
                </div>

                {formError && (
                  <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {formError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-base-surface">
                <button type="button" onClick={closeForm} disabled={submitting} className="px-4 min-h-[44px] rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-base-surface-2 transition-all active:scale-[0.98]">
                  Vazgeç
                </button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isNew ? 'Kullanıcıyı Oluştur' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete confirmation */}
        {deleting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4" onClick={() => !deleteBusy && setDeleting(null)}>
            <div role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()} className="bg-base-surface w-full max-w-sm rounded-2xl border border-border shadow-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-50 text-red-600 border border-red-200 shrink-0"><TriangleAlert className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Kullanıcı silinsin mi?</h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    <span className="font-semibold text-text-primary">{deleting.name || deleting.email}</span> hesabı kalıcı olarak silinecek ve bir daha giriş yapamayacak. Geçmiş siparişler korunur. Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setDeleting(null)} disabled={deleteBusy} className="px-4 min-h-[44px] rounded-lg border border-border text-sm font-semibold hover:bg-base-surface-2 transition-all active:scale-[0.98]">Vazgeç</button>
                <button onClick={confirmDelete} disabled={deleteBusy} className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60">
                  {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
