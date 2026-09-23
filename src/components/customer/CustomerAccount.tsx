import type { User } from '../../types';
import { Button, FeedbackState, Section, MenuItem } from '../ui';
import { ShoppingBag, FileText, ShieldCheck, Palette } from 'lucide-react';

export default function CustomerAccount({
  user,
  onSelect,
  onLogin,
}: {
  user: User | null;
  onSelect: (id: string) => void;
  onLogin: () => void;
}) {
  const actions = [
    { id: 'orders', label: 'Siparişlerim ve teslimat', icon: <ShoppingBag aria-hidden="true" /> },
    { id: 'quotes', label: 'Tekliflerim', icon: <FileText aria-hidden="true" /> },
    { id: 'customization', label: 'Görünüm ve Tema Seçimi', icon: <Palette aria-hidden="true" /> },
    { id: 'settings', label: 'Hesap güvenliği', icon: <ShieldCheck aria-hidden="true" /> },
  ];

  return (
    <div className="ui-scope">
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Hesabım</h1>
      {!user ? (
        <FeedbackState
          kind="unauthorized"
          title="Hesabınıza giriş yapın"
          description="Siparişlerinize, tekliflerinize ve hesap bilgilerinize erişin."
          action={<Button onClick={onLogin}>Bayi girişi yap</Button>}
        />
      ) : (
        <>
          <Section title="Hesap bilgileri">
            <p>{user.companyName || user.name}</p>
            <p>{user.name}</p>
            <p style={{ overflowWrap: 'anywhere' }}>{user.email}</p>
            {user.phone && <p>{user.phone}</p>}
            {user.address && <p>{user.address}</p>}
          </Section>
          <Section title="İşlemler">
            <div className="shopping-account-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map(({ id, label, icon }) => (
                <MenuItem
                  key={id}
                  icon={icon}
                  label={label}
                  onClick={() => onSelect(id)}
                />
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

