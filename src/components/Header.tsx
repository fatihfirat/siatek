import { useState } from 'react';
import { UserRole, User } from '../types';
import Logo from './Logo';
import { Bell, LogOut, Search, ShieldCheck, Sparkles, Keyboard, LayoutDashboard, Settings, Sun, Moon, Download } from 'lucide-react';
import { Button, Modal, MenuItem, ToggleSwitch } from './ui';
import './common/shell.css';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentUser: User | null;
  onOpenAuth: (initialTab?: 'login' | 'register', targetRole?: 'customer' | 'admin') => void;
  onLogout: () => void;
  connected: boolean;
  unreadCount: number;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenNotifications: () => void;
  onOpenSecurity: () => void;
  onOpenAI: () => void;
  theme?: 'dark' | 'light' | 'system';
  /** Gerçek aktif tema — 'system' belirsizliğini çözmüş hali */
  resolvedTheme?: 'dark' | 'light';
  onToggleTheme?: (targetTheme?: 'dark' | 'light' | 'system') => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
}

function getUserInitials(name?: string, fallback = 'MF'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export default function Header({
  currentRole,
  onRoleChange,
  currentUser,
  onOpenAuth,
  onLogout,
  connected,
  unreadCount,
  audioEnabled,
  onToggleAudio,
  onOpenNotifications,
  onOpenSecurity,
  onOpenAI,
  theme = 'dark',
  resolvedTheme,
  onToggleTheme,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
}: HeaderProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const action = (callback: () => void) => {
    setAccountOpen(false);
    callback();
  };

  // effectiveTheme: resolvedTheme varsa onu kullan (daha doğru),
  // yoksa theme === 'dark' fallback'ine dön. 'system' değeri asla dark sayılmaz.
  const effectiveTheme = resolvedTheme ?? (theme === 'dark' ? 'dark' : 'light');

  const userDisplayName = currentUser?.name || currentUser?.companyName || currentUser?.email?.split('@')[0] || '';
  const initials = currentUser ? getUserInitials(userDisplayName, 'MF') : '';

  return (
    <>
      <header className="shell-header ui-scope">
        <div className="shell-header-inner">
          <div className="shell-brand">
            <Logo size="sm" showText={false} variant={effectiveTheme === 'light' ? 'light' : 'dark'} />
            <div>
              <strong>Alpha Teknik</strong>
              <small>{currentRole === 'admin' ? 'Yönetim' : 'Sipariş ve teklif'}</small>
            </div>
          </div>

          {onOpenCommandPalette && (
            <Button
              variant="secondary"
              className="shell-search"
              onClick={onOpenCommandPalette}
            >
              <Search aria-hidden="true" />
              Ürün veya işlem ara
            </Button>
          )}

          <div className="shell-header-actions flex items-center gap-1.5">
            {/* Direct 1-Tap Day / Night Mode Toggle (Mobile & Desktop) */}
            {onToggleTheme && (
              <button
                type="button"
                id="btn-header-theme-toggle"
                className="shell-header-btn flex items-center justify-center p-2 rounded-xl transition hover:bg-slate-800/60"
                aria-label={effectiveTheme === 'dark' ? 'Gündüz Moduna Geç (Açık Tema)' : 'Gece Moduna Geç (Koyu Tema)'}
                title={effectiveTheme === 'dark' ? 'Gündüz Moduna Geç (Açık Tema)' : 'Gece Moduna Geç (Koyu Tema)'}
                onClick={() => onToggleTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-transform active:scale-90" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-600 hover:text-blue-500 transition-transform active:scale-90" aria-hidden="true" />
                )}
              </button>
            )}

            {currentUser ? (
              <div className="shell-account-group" role="group" aria-label="Kullanıcı hesap alanı">
                <button
                  type="button"
                  id="btn-notification-bell"
                  className="shell-header-btn"
                  aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'}
                  title={unreadCount > 0 ? `Bildirimler (${unreadCount})` : 'Bildirimler'}
                  onClick={onOpenNotifications}
                >
                  <Bell className="shell-btn-icon" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="shell-badge" aria-hidden="true">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-user-profile"
                  className="shell-header-btn shell-avatar-btn"
                  aria-label={`Hesap ve tercihler: ${currentUser.name}`}
                  title={`Hesap ve tercihler (${currentUser.name})`}
                  onClick={() => setAccountOpen(true)}
                >
                  <span className="shell-avatar" aria-hidden="true">
                    {initials}
                  </span>
                </button>
              </div>
            ) : (
              <div className="shell-account-group" role="group" aria-label="Hesap ve giriş alanı">
                <button
                  type="button"
                  id="btn-header-settings"
                  className="shell-header-btn"
                  aria-label="Tercihler"
                  title="Tercihler"
                  onClick={() => setAccountOpen(true)}
                >
                  <Settings className="shell-btn-icon" aria-hidden="true" />
                </button>
                <Button id="btn-header-login" size="small" onClick={() => onOpenAuth('login', 'customer')}>
                  Giriş
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Modal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title={currentUser ? 'Hesap ve tercihler' : 'Tercihler'}
        size="small"
        footer={
          <div className="shell-account-footer">
            {currentUser?.role === 'admin' ? (
              <Button
                variant="secondary"
                className="shell-footer-btn"
                onClick={() =>
                  action(() => onRoleChange(currentRole === 'admin' ? 'customer' : 'admin'))
                }
              >
                <LayoutDashboard aria-hidden="true" />
                {currentRole === 'admin' ? 'Müşteri görünümüne geç' : 'Yönetim görünümüne geç'}
              </Button>
            ) : null}
            {currentUser && (
              <Button
                variant="destructive"
                className="shell-footer-btn"
                onClick={() => action(onLogout)}
              >
                <LogOut aria-hidden="true" />
                Çıkış yap
              </Button>
            )}
          </div>
        }
      >
        <div className="shell-settings">
          {currentUser && (
            <div className="shell-user-summary">
              <div className="shell-summary-avatar" aria-hidden="true">{initials}</div>
              <div className="shell-summary-info">
                <strong>{currentUser.name}</strong>
                <p className="ui-hint" style={{ overflowWrap: 'anywhere' }}>
                  {currentUser.companyName || currentUser.email}
                </p>
                <p className="ui-hint">{currentUser.isDealer ? 'Bayi profili' : 'Müşteri profili'}</p>
              </div>
            </div>
          )}

          <div className="shell-settings-group" role="group" aria-label="Kullanıcı tercihleri">
            {onToggleTheme && (
              <ToggleSwitch
                label="Koyu tema"
                checked={effectiveTheme === 'dark'}
                onChange={(checked) => onToggleTheme(checked ? 'dark' : 'light')}
              />
            )}
            <ToggleSwitch
              label="Bildirim sesi"
              checked={audioEnabled}
              onChange={onToggleAudio}
            />
          </div>

          <div className="shell-settings-group" role="group" aria-label="Hızlı işlemler ve araçlar">
            <MenuItem
              icon={<Download aria-hidden="true" />}
              label="Uygulamayı Cihaza Yükle (PWA)"
              onClick={() => {
                setAccountOpen(false);
                window.dispatchEvent(new CustomEvent('siatek:trigger-install-prompt'));
              }}
            />
            {onOpenCommandPalette && (
              <MenuItem
                icon={<Search aria-hidden="true" />}
                label="Ürün veya işlem ara"
                onClick={() => action(onOpenCommandPalette)}
              />
            )}
            <MenuItem
              icon={<Sparkles aria-hidden="true" />}
              label="Yardımcı"
              onClick={() => action(onOpenAI)}
            />
            <MenuItem
              icon={<ShieldCheck aria-hidden="true" />}
              label="Güvenlik"
              onClick={() => action(onOpenSecurity)}
            />
            {onOpenShortcutsHelp && (
              <MenuItem
                icon={<Keyboard aria-hidden="true" />}
                label="Klavye kısayolları"
                onClick={() => action(onOpenShortcutsHelp)}
              />
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
