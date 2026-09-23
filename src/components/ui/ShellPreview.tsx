import { useEffect, useState } from 'react';
import Header from '../Header';
import MobileBottomNav from '../common/MobileBottomNav';
import AdminWorkspaceShell from '../admin/AdminWorkspaceShell';
import { Button, Section, KPI, Modal, OrderRow, StatusBadge, Select } from './index';
import type { UserRole } from '../../types';

export default function ShellPreview() {
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialUnread = queryParams && queryParams.has('unread') ? Number(queryParams.get('unread')) : 3;
  const initialTheme = (queryParams?.get('theme') as 'light' | 'dark') || 'dark';
  const initialRole = (queryParams?.get('role') as UserRole) || 'customer';
  const initialGuest = queryParams?.get('guest') === 'true';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [guest, setGuest] = useState(initialGuest);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [tab, setTab] = useState('home');
  const [audio, setAudio] = useState(false);
  const [dialog, setDialog] = useState('');
  const [cart, setCart] = useState(12);
  const [unreadCount, setUnreadCount] = useState(initialUnread);


  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.classList.add('ui-preview-active');
    return () => {
      delete document.documentElement.dataset.theme;
      document.body.classList.remove('ui-preview-active');
    };
  }, [theme]);

  const previewUser = guest
    ? null
    : {
        id: 'preview',
        name: 'Müslüm Fırat',
        companyName: 'Alpha Doğalgaz & Tesisat B2B',
        email: 'muslumfirat@example.com',
        role,
        createdAt: '',
      };

  if (role === 'admin' && !guest) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <main className="shell-main flex-1 overflow-x-hidden w-full">
          <div className="admin-shell-host">
            <AdminWorkspaceShell
              activeTab="orders"
              onTabChange={() => undefined}
              onOpenAI={() => setDialog('Yardımcı')}
              onOpenNotifications={() => setDialog('Bildirimler')}
              onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              unreadCount={unreadCount}
              currentUser={previewUser!}
              onLogout={() => undefined}
            >
              <div data-testid="admin-scroll-probe" style={{ minHeight: '2200px' }}>
                <Section title="Yönetici Sidebar Önizlemesi">
                  <p>Scroll ve sabit konum doğrulama yüzeyi.</p>
                </Section>
              </div>
            </AdminWorkspaceShell>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ui-scope">
      <Header
        currentRole={role}
        onRoleChange={setRole}
        currentUser={previewUser}
        onOpenAuth={() => setDialog('Giriş')}
        onLogout={() => setGuest(true)}
        connected
        unreadCount={unreadCount}
        audioEnabled={audio}
        onToggleAudio={() => setAudio(!audio)}
        onOpenNotifications={() => setDialog('Bildirimler')}
        onOpenSecurity={() => setDialog('Güvenlik')}
        onOpenAI={() => setDialog('Yardımcı')}
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        onOpenCommandPalette={() => setDialog('Arama')}
        onOpenShortcutsHelp={() => setDialog('Klavye kısayolları')}
      />
      <main className="ui-preview shell-main" data-has-cart={role === 'customer' && cart > 0}>
        <Section title="Faz 4B · Header & Menü Önizlemesi">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <Select
              label="Görünüm"
              value={guest ? 'guest' : role}
              onChange={e => {
                setGuest(e.target.value === 'guest');
                setRole(e.target.value === 'admin' ? 'admin' : 'customer');
                setTab('home');
              }}
            >
              <option value="customer">Müşteri (MF)</option>
              <option value="admin">Yönetici (MF)</option>
              <option value="guest">Girişsiz (Misafir)</option>
            </Select>

            <Select
              label="Okunmamış Bildirim Sayısı"
              value={String(unreadCount)}
              onChange={e => setUnreadCount(Number(e.target.value))}
            >
              <option value="0">0 (Nötr / Rozetsiz)</option>
              <option value="3">3 (Rozetli)</option>
              <option value="12">12 (Rozetli)</option>
              <option value="120">120 (99+ Rozetli)</option>
            </Select>
          </div>
        </Section>
        <Section title={tab === 'home' ? 'Bugünkü işler' : tab === 'orders' ? 'Siparişler' : tab === 'more' ? 'Hesap ve işlemler' : 'Ürünler'}>
          <div className="ui-kpis">
            <KPI label="Bekleyen sipariş" value="12" />
            <KPI label="Teslimata hazır" value="4" />
            <KPI label="Kritik stok" value="7 ürün" />
          </div>
        </Section>
        <Section title="Siparişler">
          <OrderRow
            number="SİP-2026-0042"
            customer="Örnek Mekanik Tesisat ve Mühendislik"
            total="24.850,00 ₺"
            status={<StatusBadge tone="warning">Onay bekliyor</StatusBadge>}
          >
            <Button variant="secondary" onClick={() => setDialog('Sipariş ayrıntısı')}>
              İncele
            </Button>
          </OrderRow>
        </Section>
        <Section title="Örnek sepet">
          <div className="ui-actions">
            <Button onClick={() => setCart(n => n + 1)}>Örnek ürün ekle</Button>
            <Button variant="secondary" onClick={() => setCart(0)}>
              Sepeti temizle
            </Button>
          </div>
        </Section>
      </main>
      {role === 'customer' && cart > 0 && (
        <div id="mobile-sticky-cart-bar" className="shell-preview-cart">
          <span>{cart} adet · 2.220,00 ₺</span>
          <Button onClick={() => setDialog('Sipariş sepeti')}>Sepeti incele</Button>
        </div>
      )}
      <MobileBottomNav
        currentRole={role}
        activeNav={tab}
        cartItemCount={cart}
        onNavChange={next => {
          if (next === 'cart' || next === 'pos') setDialog(next === 'cart' ? 'Sipariş sepeti' : 'Hızlı POS');
          else setTab(next);
        }}
      />
      <Modal open={!!dialog} title={dialog} onClose={() => setDialog('')}>
        <p>Önizleme · Örnek veriler</p>
      </Modal>
    </div>
  );
}
