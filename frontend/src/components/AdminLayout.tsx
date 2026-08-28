import { ReactNode, useState, useEffect } from 'react';
import { LayoutDashboard, Bell, LogOut, Menu, X, Search } from 'lucide-react';
import Logo from './Logo';
import AccountAvatar from './ui/AccountAvatar';
import type { User } from '../store/useAuthStore';
import { cn } from '../lib/cn';
import GeometricDecor from './ui/GeometricDecor';

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  menuItems: MenuItem[];
  user: User;
}

export default function AdminLayout({
  children,
  currentPage,
  onNavigate,
  onLogout,
  menuItems,
  user,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pageLabel = menuItems.find((item) => item.id === currentPage)?.label || 'Overview';

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-apex-surface font-sans">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-apex-border bg-white py-4 transition-transform duration-300 xl:w-72',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <GeometricDecor variant="minimal" className="opacity-60" />
        <div className="relative mb-4 flex items-center justify-between border-b border-apex-border px-4 pb-5 pt-2">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onNavigate('dashboard')}>
            <Logo size="sidebar" className="max-w-[9.5rem]" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-btn p-2 text-apex-body hover:bg-apex-primary-light hover:text-apex-heading lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-btn px-3.5 py-3 text-sm font-semibold transition-all click-effect',
                  isActive
                    ? 'bg-apex-primary-light text-apex-primary shadow-[inset_3px_0_0_0_#2D3EFF]'
                    : 'text-apex-body hover:bg-apex-surface hover:text-apex-heading',
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-105',
                    isActive ? 'text-apex-primary' : 'text-apex-muted',
                  )}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="relative mt-4 border-t border-apex-border px-3 pt-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-btn px-3.5 py-3 text-sm font-semibold text-apex-body transition-all click-effect hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-apex-heading/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex min-h-screen flex-1 flex-col lg:ml-[17.5rem] xl:ml-72">
        <header
          className={cn(
            'sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b px-3 transition-all sm:h-[4.5rem] sm:gap-4 sm:px-8',
            scrolled ? 'border-apex-border bg-white/95 shadow-sm backdrop-blur-md' : 'border-apex-border/80 bg-white/90 backdrop-blur-sm lg:border-transparent lg:bg-transparent',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-btn border border-apex-border bg-white p-2 text-apex-body shadow-sm hover:text-apex-heading lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-semibold text-apex-heading sm:text-xl lg:font-bold">{pageLabel}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-apex-muted" />
              <input
                type="text"
                placeholder="Search workspace..."
                className="w-52 rounded-pill border border-apex-border bg-white py-2 pl-10 pr-4 text-sm text-apex-heading placeholder:text-apex-muted focus:border-apex-primary focus:outline-none focus:ring-2 focus:ring-apex-primary/15 lg:w-64"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              aria-label="Open notifications"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-btn border border-apex-border bg-white text-apex-body shadow-sm transition-all hover:border-apex-primary/25 hover:bg-apex-primary-light hover:text-apex-primary sm:h-10 sm:w-10"
            >
              <Bell className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-apex-primary ring-2 ring-white sm:right-2.5 sm:top-2.5 sm:h-2 sm:w-2" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 sm:border-l sm:border-apex-border sm:pl-3">
              <AccountAvatar name={user.name} />
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-semibold text-apex-heading">{user.name}</p>
                <p className="truncate text-xs font-medium text-apex-body">
                  apex · {user.role === 'admin' ? 'administrator' : 'member'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div key={currentPage} className="mx-auto w-full max-w-7xl flex-1 animate-fade-in-up px-3 py-4 sm:px-8 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
