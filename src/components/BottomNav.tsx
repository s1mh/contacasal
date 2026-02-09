import { Home, Clock, Plus, Settings, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { hapticSelection, isNative } from '@/lib/capacitor';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareCode } = useParams();
  const { t } = usePreferences();

  // On native iOS, we use the native UITabBar instead of this web component
  if (isNative) return null;

  const basePath = `/c/${shareCode}`;

  const navItems: NavItem[] = [
    { icon: Home, label: t('Resumo'), path: basePath },
    { icon: Clock, label: t('Histórico'), path: `${basePath}/historico` },
    { icon: BarChart3, label: t('Estatísticas'), path: `${basePath}/estatisticas` },
    { icon: Settings, label: t('Ajustes'), path: `${basePath}/ajustes` },
  ];

  const isActive = (path: string) => {
    if (path === basePath) {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    if (isNative) hapticSelection();
    navigate(path);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <button
        onClick={() => handleNav(item.path)}
        className={cn(
          'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300',
          active
            ? 'text-primary scale-105'
            : 'text-muted-foreground hover:text-foreground active:scale-95'
        )}
      >
        <div className={cn(
          'relative p-1.5 rounded-xl transition-all duration-300',
          active && 'bg-primary/12'
        )}>
          <item.icon className={cn('w-5 h-5 transition-all', active && 'stroke-[2.5]')} />
          {active && (
            <div className="absolute inset-0 rounded-xl bg-primary/8 blur-sm" />
          )}
        </div>
        <span className={cn(
          'text-[10px] transition-all duration-300',
          active ? 'font-semibold' : 'font-medium'
        )}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ paddingBottom: isNative ? 'var(--safe-area-bottom, 8px)' : '8px' }}
    >
      <div
        className="liquid-glass-nav rounded-[28px] px-2 py-1.5 grid grid-cols-5 items-center mx-4 w-full max-w-md"
      >
        {/* First two nav items */}
        <NavButton item={navItems[0]} />
        <NavButton item={navItems[1]} />

        {/* Center FAB */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (isNative) hapticSelection();
              navigate(`${basePath}/novo`);
            }}
            className={cn(
              'fab w-14 h-14 flex items-center justify-center -my-5 transition-all duration-200',
              location.pathname.includes('/novo')
                ? 'scale-90 opacity-80'
                : 'active:scale-90'
            )}
          >
            <Plus className="w-7 h-7 text-primary-foreground" />
          </button>
        </div>

        {/* Last two nav items */}
        <NavButton item={navItems[2]} />
        <NavButton item={navItems[3]} />
      </div>
    </nav>
  );
}
