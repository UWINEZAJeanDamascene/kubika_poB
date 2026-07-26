import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Sheet, SheetContent } from '@/app/components/ui/sheet';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { Menu, Sun, Moon, Home, Sparkles, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router';
import NotificationBell from '@/app/components/NotificationBell';
import { GlobalSearch, GlobalSearchTrigger, useGlobalSearchShortcut } from '@/app/components/GlobalSearch';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { QuickCreateMenu } from '@/app/components/QuickCreateMenu';
import { DashboardCommandNav } from '@/app/components/dashboard/DashboardCommandNav';
import { useChatPanelStore } from '@/store/chatPanelStore';
import { useCompanyStore } from '@/store/companyStore';
import { useCurrency } from '@/contexts/CurrencyContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  useGlobalSearchShortcut(setSearchOpen);
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardRoute =
    location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');
  const { open: chatOpen, width: chatWidth, toggle: toggleChat, setOpen: setChatOpen } = useChatPanelStore();
  const company = useCompanyStore((state) => state.company);
  const { displayCurrency, rates } = useCurrency();
  const [isLg, setIsLg] = useState(false);
  const hasEnterpriseAI = Boolean(company?.subscription_plan === 'enterprise' || company?.feature_access?.ai_assistant);
  const effectiveChatOpen = chatOpen && hasEnterpriseAI;

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsLg(mql.matches);
    mql.addEventListener('change', onChange);
    setIsLg(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!hasEnterpriseAI) {
      setChatOpen(false);
    }
  }, [hasEnterpriseAI, setChatOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
    } catch (e) {}
  }, [sidebarCollapsed]);

  // When the app layout is mounted, lock document scrolling so the app's
  // internal scroll container is the only vertical scroll. Remove the lock
  // when unmounting so public pages (landing) can scroll normally.
  useEffect(() => {
    try {
      document.body.classList.add('app-scroll-lock');
    } catch (e) {}
    return () => {
      try {
        document.body.classList.remove('app-scroll-lock');
      } catch (e) {}
    };
  }, []);

  return (
    <div
      className="relative flex h-screen overflow-hidden"
      style={{ paddingRight: isLg && effectiveChatOpen ? chatWidth : undefined }}
    >
      {/* Full-app background */}
      <div className="absolute inset-0 bg-background" />
      {/* Desktop Sidebar - always visible on lg screens */}
      <div className={`hidden lg:block transition-all duration-300 relative z-10 ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile Sidebar - sheet/drawer (render only on mobile to avoid duplicate sidebars) */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r border-slate-800">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile Header - show on screens smaller than lg */}
        <div className="lg:hidden sticky top-0 z-50 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-10 w-10 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7.5 4.27 9 5.15"/>
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
            </div>
            <span className="hidden md:inline text-lg font-semibold text-slate-800 dark:text-white">KUBIKA system</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10 flex-shrink-0"
              title="Search (Ctrl+K)"
              aria-label="Open global search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <QuickCreateMenu compact />
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-10 w-10 flex-shrink-0"
              title="Back to Home"
            >
              <Home className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 flex-shrink-0"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Top Bar */}
        {!isMobile && (
          <header className="hidden h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card/95 px-6 shadow-sm backdrop-blur-xl lg:flex">
            <div className="flex items-center gap-4 min-w-0">
              <Breadcrumbs />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5">
              <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
              <QuickCreateMenu />
              <NotificationBell />
              {hasEnterpriseAI && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChat}
                  className={`h-10 gap-2 rounded-xl px-3 transition-all ${
                    chatOpen
                      ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                      : 'bg-card text-foreground ring-1 ring-inset ring-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                  title={chatOpen ? 'Close Stacy AI assistant' : 'Open Stacy AI assistant'}
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${chatOpen ? 'bg-white' : 'bg-emerald-400'}`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${chatOpen ? 'bg-white' : 'bg-emerald-500'}`} />
                  </span>
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">AI</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="h-10 gap-2 px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
                title="Back to Home"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-10 w-10 text-foreground hover:bg-accent hover:text-accent-foreground"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
        )}

        {/* Mobile breadcrumbs */}
        <div className="border-b border-border bg-card/80 px-3 py-2 lg:hidden">
          <Breadcrumbs />
        </div>

        {isDashboardRoute && (
          <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 md:px-5">
            <DashboardCommandNav />
          </div>
        )}

        {/* Page Content — keyed by display currency so all monetary values
            (including ones rendered through non-hook formatters) refresh
            immediately when the sidebar currency selector changes. */}
        <div
          key={`${displayCurrency}:${rates ? 'r' : 'n'}`}
          className="flex-1 overflow-auto px-3 py-3 pb-24 sm:px-4 md:px-5 md:py-5 md:pb-8 xl:px-6"
        >
          {children}
        </div>
      </main>

      {/* Global command palette */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
