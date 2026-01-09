import { Home, Clock, Plus, Settings, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareCode } = useParams();

  const basePath = `/c/${shareCode}`;

  const navItems: NavItem[] = [
    { icon: Home, label: 'Resumo', path: basePath },
    { icon: Clock, label: 'Histórico', path: `${basePath}/historico` },
    { icon: BarChart3, label: 'Stats', path: `${basePath}/estatisticas` },
    { icon: Settings, label: 'Ajustes', path: `${basePath}/ajustes` },
  ];

  const isActive = (path: string) => {
    if (path === basePath) {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(path);
  };

  const NavButton = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => navigate(item.path)}
      className={cn(
        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-full transition-all duration-200',
        isActive(item.path)
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <item.icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </button>
  );

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
      <div className="glass-nav rounded-full px-3 py-2 grid grid-cols-5 items-center">
        {/* First two nav items */}
        <NavButton item={navItems[0]} />
        <NavButton item={navItems[1]} />

        {/* Center FAB */}
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`${basePath}/novo`)}
            className={cn(
              'fab w-14 h-14 flex items-center justify-center -my-6',
              location.pathname.includes('/novo') && 'scale-95 opacity-80'
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
