import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Blocks,
  Check,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  Globe2,
  Layers3,
  LayoutTemplate,
  Menu,
  Moon,
  MonitorSmartphone,
  MousePointerClick,
  Network,
  QrCode,
  Smartphone,
  Sun,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LanguageSelector } from '@/app/components/LanguageSelector';

const platformMetrics = [
  { value: 'React 18 + Vite', label: 'Frontend stack', detail: 'Fast builds, modern hooks, and a component system that stays responsive even on large datasets.' },
  { value: 'Node + MongoDB', label: 'Backend stack', detail: 'REST API with tenant-isolated databases. Each company gets its own data boundary.' },
  { value: 'Socket.io', label: 'Real-time sync', detail: 'Live updates across tabs and devices without refreshing the browser.' },
  { value: 'Mobile-first', label: 'Responsive UI', detail: 'Works on a laptop, tablet, or phone. Scan barcodes, approve orders, check stock on the move.' },
];

const systemLayers = [
  {
    icon: LayoutTemplate,
    title: 'Single-page application',
    copy: 'Built with React and Vite. No page reloads when you switch between inventory, sales, or reports. The URL changes, the data updates, the UI stays alive.',
  },
  {
    icon: Database,
    title: 'Tenant isolation',
    copy: 'Every workspace runs in its own database scope. Your stock, invoices and payroll records never mix with another company\'s data.',
  },
  {
    icon: Network,
    title: 'REST API architecture',
    copy: 'The frontend talks to the backend through clean HTTP endpoints. Inventory, finance, and HR modules all pull from the same API layer.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Responsive by default',
    copy: 'The sidebar collapses, tables scroll, and buttons resize. Whether you are on a 13-inch laptop or a phone in the warehouse, it works.',
  },
  {
    icon: WifiOff,
    title: 'Offline-aware design',
    copy: 'Network drops happen. Key actions queue locally and sync when connection returns. You keep working even when the internet does not.',
  },
  {
    icon: QrCode,
    title: 'Barcode & QR scanning',
    copy: 'Use your phone camera to scan product barcodes straight into purchase orders, stock counts, or invoice lines.',
  },
];

const techStack = [
  { category: 'Frontend', items: ['React 18', 'React Router', 'Tailwind CSS v4', 'TanStack Query', 'Radix UI', 'Recharts'] },
  { category: 'State & Forms', items: ['Zustand', 'React Hook Form', 'Zod validation'] },
  { category: 'Backend', items: ['Node.js', 'Express', 'MongoDB', 'Tenant isolation', 'JWT auth'] },
  { category: 'Real-time', items: ['Socket.io client', 'Live dashboards', 'Cross-tab sync'] },
];

const liveStatus = [
  { label: 'API response', value: '< 200ms', bar: '94%', color: 'from-emerald-300 to-cyan-300' },
  { label: 'Build time', value: '2.4s', bar: '88%', color: 'from-cyan-300 to-emerald-300' },
  { label: 'Bundle size', value: '~340 KB', bar: '72%', color: 'from-amber-200 to-orange-300' },
  { label: 'Test coverage', value: 'In progress', bar: '56%', color: 'from-cyan-300 to-slate-200' },
];

export default function PlatformLandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const isDark = theme === 'dark';
  const systemHref = user?.role === 'platform_admin' ? '/platform-admin' : '/dashboard';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Operations', href: '/operations' },
    { label: 'Security', href: '/trust' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
      <style>{`
        @keyframes plat-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -14px, 0); } }
        @keyframes plat-scan { 0% { transform: translateX(-115%); } 100% { transform: translateX(115%); } }
        @keyframes plat-pulse { 0%, 100% { opacity: .35; transform: scale(.94); } 50% { opacity: .95; transform: scale(1.06); } }
        @keyframes plat-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-16px) rotate(4deg); } }
        @keyframes plat-float-delay { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(-3deg); } }
        @keyframes plat-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .plat-drift { animation: plat-drift 7s ease-in-out infinite; }
        .plat-scan { animation: plat-scan 5.5s linear infinite; }
        .plat-pulse { animation: plat-pulse 3.8s ease-in-out infinite; }
        .plat-float { animation: plat-float 8s ease-in-out infinite; }
        .plat-float-delay { animation: plat-float-delay 10s ease-in-out infinite; }
        .plat-rotate { animation: plat-rotate 20s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .plat-drift, .plat-scan, .plat-pulse, .plat-float, .plat-float-delay, .plat-rotate { animation: none; }
        }
      `}</style>

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'border-slate-200/80 bg-white/86 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#080b12]/84'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="KUBIKA system home">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-slate-950">
              <Layers3 className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-[0.18em] text-slate-950 dark:text-white">KUBIKA system</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Operating OS</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) =>
              item.href.startsWith('#') ? (
                <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} to={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector variant="landing" />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {isAuthenticated ? (
              <Link to={systemHref}>
                <Button className="bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                  Back to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                    Start now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-800 dark:text-white">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} className="text-slate-800 dark:text-white">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-xl dark:border-white/10 dark:bg-[#080b12] lg:hidden">
            <div className="grid gap-2">
              {navItems.map((item) =>
                item.href.startsWith('#') ? (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                    {item.label}
                  </Link>
                )
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <LanguageSelector variant="landing" className="justify-center rounded-md border border-input bg-background px-3 py-2" />
                {isAuthenticated ? (
                  <Link to={systemHref} onClick={() => setMobileOpen(false)} className="col-span-2">
                    <Button className="w-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">Back to Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">Log in</Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="col-span-2">
                      <Button className="w-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">Create workspace</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative min-h-[92vh] overflow-hidden pt-24 lg:pt-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.18),transparent_24%),linear-gradient(135deg,#f8fbff_0%,#edf7f4_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(74,222,128,0.13),transparent_24%),linear-gradient(135deg,#05070c_0%,#08111a_48%,#07100d_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#f7f9fb] to-transparent dark:from-[#06080d]" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[16%] left-[8%] plat-float opacity-20">
              <Code2 className="w-16 h-16 text-cyan-500" />
            </div>
            <div className="absolute top-[26%] right-[10%] plat-float-delay opacity-20">
              <Cpu className="w-18 h-18 text-emerald-500" />
            </div>
            <div className="absolute bottom-[22%] left-[10%] plat-float-delay opacity-20">
              <Database className="w-16 h-16 text-cyan-400" />
            </div>
            <div className="absolute bottom-[18%] right-[16%] plat-float opacity-25">
              <Globe2 className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="absolute top-[46%] left-[5%] plat-float opacity-20">
              <Smartphone className="w-14 h-14 text-cyan-300" />
            </div>
            <div className="absolute top-[40%] right-[5%] plat-float-delay opacity-20">
              <Zap className="w-14 h-14 text-emerald-300" />
            </div>
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <Blocks className="h-4 w-4" />
                React, Node, MongoDB — built for production
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                A modern stack powering real business operations.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                KUBIKA system is a single-page application built on React and Vite, backed by a Node.js API and tenant-isolated MongoDB databases. It is fast, responsive, and designed to work even when your connection does not.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={isAuthenticated ? systemHref : '/register'}>
                  <Button className="h-12 bg-slate-950 px-6 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                    {isAuthenticated ? 'Return to Dashboard' : 'Start free trial'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/login">
                    <Button variant="outline" className="h-12 border-slate-300 bg-white/70 px-6 text-slate-900 hover:bg-white dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12">
                      Sign in
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                {['React 18 SPA', 'Tenant isolation', 'Real-time sync', 'Mobile responsive'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/6">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual — layered blocks */}
            <div className="plat-drift relative hidden lg:block">
              <div className="absolute -inset-6 rounded-[8px] bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10" />
              <div className="relative overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-slate-900/20 dark:border-white/10">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent plat-scan" />
                <div className="rounded-lg border border-white/10 bg-[#071018] p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">System Monitor</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">Platform Health</h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <span className="plat-pulse h-2 w-2 rounded-full bg-emerald-300" />
                      Healthy
                    </div>
                  </div>

                  {/* Orbiting layers */}
                  <div className="mt-5 flex items-center justify-center">
                    <div className="relative mx-auto aspect-square max-w-[220px]">
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-300/20 plat-rotate" />
                      <div className="absolute inset-[12%] rounded-full border border-emerald-300/20 plat-rotate" style={{ animationDirection: 'reverse' }} />
                      <div className="absolute inset-[24%] rounded-full border border-amber-300/20 plat-rotate" />
                      <div className="absolute inset-[36%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.18)_0%,rgba(34,211,238,.06)_34%,transparent_35%),conic-gradient(from_30deg,rgba(34,211,238,.34),rgba(16,185,129,.32),rgba(250,204,21,.24),rgba(34,211,238,.34))]" />
                      <div className="absolute inset-[46%] rounded-full border border-white/15 bg-slate-950/80 flex items-center justify-center">
                        <Cpu className="h-10 w-10 text-cyan-200" />
                      </div>
                      {[0, 1, 2, 3].map((node) => (
                        <span
                          key={node}
                          className="plat-pulse absolute h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-lg shadow-cyan-300/40"
                          style={{
                            left: `${50 + 46 * Math.cos((node * Math.PI) / 2)}%`,
                            top: `${50 + 46 * Math.sin((node * Math.PI) / 2)}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {liveStatus.map((row) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="font-semibold text-white">{row.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full bg-gradient-to-r ${row.color}`} style={{ width: row.bar }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics banner */}
        <section className="relative -mt-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] md:grid-cols-4">
            {platformMetrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{m.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{m.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{m.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* System layers */}
        <section id="layers" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Architecture</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  How the system is actually built.
                </h2>
              </div>
              <p className="text-lg leading-8 text-slate-600 dark:text-slate-300">
                No jargon. Just the real layers that make KUBIKA system work: the frontend you interact with, the API that handles logic, and the database that stores your records.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemLayers.map((layer, i) => (
                <article
                  key={layer.title}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.12), transparent 70%)' }}
                  />
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                        <layer.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Layer {i + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{layer.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{layer.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Dark tech stack section */}
        <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Tech stack</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">The tools we actually use.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Not a wishlist. These are the dependencies in our package.json and the services running in production.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {techStack.map((group) => (
                <div key={group.category} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{group.category}</h3>
                  <ul className="mt-4 space-y-2">
                    {group.items.map((it) => (
                      <li key={it} className="flex items-start gap-2 text-sm text-slate-300">
                        <MousePointerClick className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-300" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg bg-gradient-to-br from-slate-950 via-[#0d2430] to-[#123323] p-8 text-white shadow-2xl shadow-slate-900/20 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">See it in action</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Built to be used, not just sold.</h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                The best way to understand the platform is to open it. Create a workspace, add your first product, raise an invoice, and watch the numbers connect in real time.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button className="h-12 bg-white px-6 text-slate-950 hover:bg-cyan-100">
                    Start free trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" className="h-12 border-white/20 bg-white/8 px-6 text-white hover:bg-white/14">
                    View pricing
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-white/[0.04]">
              <Code2 className="h-8 w-8 text-cyan-700 dark:text-cyan-300" />
              <h3 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">Open to feedback</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                This is an actively developed product. If something breaks, slows down, or does not work the way your business needs, we want to know. Our roadmap is shaped by the teams using it.
              </p>
              <div className="mt-6 space-y-3">
                {['WhatsApp: +250 780 936 645', 'Email: uwinezajd2@gmail.com', 'Based in Kigali, Rwanda'].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-10 dark:border-white/10 dark:bg-[#080b12] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Layers3 className="h-5 w-5" />
              </span>
              <span className="text-base font-semibold tracking-[0.18em] text-slate-950 dark:text-white">KUBIKA system</span>
            </Link>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Stock, sales, purchasing, accounting, payroll and reporting — built for Rwandan businesses and compliant with RRA requirements.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navItems.map((item) =>
              item.href.startsWith('#') ? (
                <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} to={item.href} className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
                  {item.label}
                </Link>
              )
            )}
            <Link to="/login" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
              Login
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} KUBIKA system. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5" />
            Proudly built in Rwanda.
          </span>
        </div>
      </footer>
    </div>
  );
}
