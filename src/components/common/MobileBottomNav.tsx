import { UserRole } from '../../types';
import { getNavigationForRole } from '../../utils/navigationConfig';
import { Haptics } from '../../utils/haptics';
import '../ui/ui.css';
import './shell.css';

interface MobileBottomNavProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  currentRole: UserRole;
  cartItemCount?: number;
  unreadNotificationCount?: number;
}
export default function MobileBottomNav({activeNav, onNavChange, currentRole, cartItemCount = 0, unreadNotificationCount = 0}: MobileBottomNavProps) {
  const tabs = getNavigationForRole(currentRole);
  return (
    <nav aria-label="Mobil Alt Navigasyon" className="shell-bottom-nav" data-role={currentRole}>
      <div 
        className="shell-tabs"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const count = tab.id === 'cart' ? cartItemCount : tab.id === 'more' ? unreadNotificationCount : 0;
          return (
            <button 
              key={tab.id} 
              type="button" 
              onClick={() => {
                Haptics.tap();
                onNavChange(tab.id);
              }} 
              aria-current={activeNav === tab.id ? 'page' : undefined} 
              className="shell-tab" 
              data-primary={tab.id === 'cart' || tab.id === 'pos' || undefined}
            >
              <span className="shell-tab-icon">
                <Icon aria-hidden="true"/>
                {count > 0 && <span className="shell-badge" aria-label={count + ' öğe'}>{count > 99 ? '99+' : count}</span>}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
