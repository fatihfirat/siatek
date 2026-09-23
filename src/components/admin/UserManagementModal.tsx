import { useState, useEffect } from 'react';
import { X, Users, Shield, Truck, ShoppingBag, Search, Loader2, Check, AlertCircle } from 'lucide-react';
import { db, collection, getDocs, updateDoc, doc } from '../../lib/firebase';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import type { UserRole } from '../../types';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  role: UserRole;
  createdAt?: string;
}

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'admin',     label: 'Yönetici',   desc: 'Tüm modüller',          icon: <Shield className="w-3.5 h-3.5" />,      color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'operasyon', label: 'Operasyon',  desc: 'Toplama & teslimat',    icon: <Truck className="w-3.5 h-3.5" />,       color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'customer',  label: 'Bayi/Müşteri', desc: 'Sipariş & katalog',  icon: <ShoppingBag className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  displayMode?: 'modal' | 'page';
}

export default function UserManagementModal({ isOpen, onClose, displayMode = 'modal' }: Props) {
  useModalBehavior(isOpen && displayMode === 'modal', onClose);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getDocs(collection(db, 'users'))
      .then(snap => {
        const list: UserRecord[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<UserRecord, 'id'>),
        }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setUsers(list);
      })
      .catch(() => setError('Kullanıcılar yüklenemedi'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const changeRole = async (userId: string, newRole: UserRole) => {
    setSaving(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole, updatedAt: new Date().toISOString() });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSaved(userId);
      setTimeout(() => setSaved(null), 1500);
    } catch {
      setError('Rol güncellenemedi');
    } finally {
      setSaving(null);
    }
  };

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.companyName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      className={displayMode === 'modal' ? 'fixed inset-0 z-50 flex items-center justify-center p-4' : 'w-full'}
      onClick={displayMode === 'modal' ? onClose : undefined}
    >
      {displayMode === 'modal' && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />}
      <div
        role={displayMode === 'modal' ? 'dialog' : 'region'}
        aria-modal={displayMode === 'modal' ? true : undefined}
        className={`relative bg-base-surface rounded-2xl border border-border w-full flex flex-col ${displayMode === 'modal' ? 'shadow-2xl max-w-2xl max-h-[85vh]' : 'shadow-sm min-h-[560px]'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-category-system-bg text-category-system-text border border-category-system-border/40">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Kullanıcı & Rol Yönetimi</h2>
              <p className="text-xs text-text-muted">{users.length} kullanıcı</p>
            </div>
          </div>
          {displayMode === 'modal' && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-base-surface-2 text-text-muted hover:text-text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="İsim, e-posta veya firma ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-base-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-2 flex gap-2 flex-wrap border-b border-border shrink-0">
          {ROLES.map(r => (
            <span key={r.value} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${r.color}`}>
              {r.icon} {r.label}
            </span>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Yükleniyor...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-text-muted text-sm">
              Kullanıcı bulunamadı
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(user => {
                const isSaving = saving === user.id;
                const isSaved = saved === user.id;
                return (
                  <div key={user.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-base-surface-2/50 transition-colors">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-base-surface-2 border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                      {(user.name || user.email || '?')[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{user.name || '—'}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                      {user.companyName && (
                        <p className="text-xs text-text-muted truncate">{user.companyName}</p>
                      )}
                    </div>

                    {/* Role selector */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />}
                      {isSaved && <Check className="w-3.5 h-3.5 text-green-600" />}
                      <div className="flex gap-1">
                        {ROLES.map(r => {
                          const isActive = user.role === r.value;
                          return (
                            <button
                              key={r.value}
                              onClick={() => !isActive && !isSaving && changeRole(user.id, r.value)}
                              disabled={isSaving}
                              title={`${r.label} — ${r.desc}`}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold transition-all ${
                                isActive
                                  ? `${r.color} shadow-sm`
                                  : 'bg-base-surface border-border text-text-muted hover:bg-base-surface-2 hover:text-text-primary'
                              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {r.icon}
                              <span className="hidden sm:inline">{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border text-xs text-text-muted shrink-0">
          Rol değişikliği kullanıcının bir sonraki girişinde aktif olur.
        </div>
      </div>
    </div>
  );
}
