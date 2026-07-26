import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Boxes,
  Check,
  ChevronRight,
  Database,
  Eye,
  Fingerprint,
  Globe2,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  UserCog,
  X,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LanguageSelector } from '@/app/components/LanguageSelector';

const securityMetrics = [
  { value: '256-bit', label: 'SSL encryption', detail: 'All data in transit protected with industry-standard TLS.' },
  { value: 'Daily', label: 'Automated backups', detail: 'Snapshots stored securely with point-in-time recovery.' },
  { value: '99.9%', label: 'Uptime SLA', detail: 'Hosted on reliable infrastructure with redundancy built in.' },
  { value: 'Kigali', label: 'Local servers', detail: 'Your data stays in Rwanda. Low latency, full sovereignty.' },
];

const protectionLayers = [
  {
    icon: ShieldCheck,
    name: 'Access Control',
    copy: 'Role-based permissions let you define who sees what. Admin, manager, cashier — each role gets exactly the right access.',
    accent: 'from-cyan-400 to-emerald-300',
    border: 'border-cyan-300/40',
  },
  {
    icon: KeyRound,
    name: 'Authentication',
    copy: 'Enforced password policies, brute-force lockout, and optional TOTP two-factor authentication for every account.',
    accent: 'from-emerald-300 to-cyan-400',
    border: 'border-emerald-300/40',
  },
  {
    icon: Eye,
    name: 'Audit Trails',
    copy: 'Every login, edit, deletion and export is logged with a timestamp and user identity. Review history anytime.',
    accent: 'from-cyan-300 to-slate-200',
    border: 'border-cyan-200/40',
  },
  {
    icon: Database,
    name: 'Data Residency',
    copy: 'Primary storage is in Rwanda. Your stock, financial and payroll records never leave the country without consent.',
    accent: 'from-emerald-400 to-cyan-300',
    border: 'border-emerald-300/40',
  },
  {
    icon: Ban,
    name: 'Threat Defense',
    copy: 'IP whitelisting, session timeouts, account lockout after failed attempts, and the ability to terminate sessions instantly.',
    accent: 'from-cyan-400 to-emerald-300',
    border: 'border-cyan-300/40',
  },
  {
    icon: Globe2,
    name: 'Compliance Ready',
    copy: 'Built with GDPR principles and Rwanda RRA reporting standards in mind. Audit-grade exports for tax and regulatory review.',
    accent: 'from-emerald-300 to-cyan-400',
    border: 'border-emerald-300/40',
  },
];

const complianceItems = [
  { icon: Shield, label: 'Data encryption at rest & in transit' },
  { icon: UserCog, label: 'Role-based access control' },
  { icon: Fingerprint, label: '2FA / TOTP support' },
  { icon: LockKeyhole, label: 'Password policy enforcement' },
  { icon: Boxes, label: 'Daily automated backups' },
  { icon: BadgeCheck, label: 'RRA-ready audit reports' },
];

const liveSignals = [
  { label: 'Encryption', value: 'Active', status: '256-bit TLS', width: '100%' },
  { label: 'Last backup', value: '2 hours ago', status: 'Verified', width: '96%' },
  { label: 'Failed logins', value: '0', status: 'Blocked', width: '100%' },
  { label: 'Active sessions', value: '12', status: 'Monitored', width: '88%' },
];

export default function SecurityLandingPage() {
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
    { label: 'Platform', href: '/platform' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '#layers' },
    { label: 'Operations', href: '/operations' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
      <style>{`
        @keyframes sec-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -14px, 0); } }
        @keyframes sec-scan { 0% { transform: translateX(-115%); } 100% { transform: translateX(115%); } }
        @keyframes sec-pulse { 0%, 100% { opacity: .35; transform: scale(.94); } 50% { opacity: .95; transform: scale(1.06); } }
        @keyframes sec-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes sec-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(6deg); } }
        @keyframes sec-float-delay { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(-4deg); } }
        @keyframes sec-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .sec-drift { animation: sec-drift 7s ease-in-out infinite; }
        .sec-scan { animation: sec-scan 5.5s linear infinite; }
        .sec-pulse { animation: sec-pulse 3.8s ease-in-out infinite; }
        .sec-rotate { animation: sec-rotate 20s linear infinite; }
        .sec-float { animation: sec-float 8s ease-in-out infinite; }
        .sec-float-delay { animation: sec-float-delay 10s ease-in-out infinite; }
        .sec-ring { animation: sec-ring 12s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sec-drift, .sec-scan, .sec-pulse, .sec-rotate, .sec-float, .sec-float-delay, .sec-ring { animation: none; }
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
              <span className="text-base font-semibold tracking-[0.18em] text-slate-950 dark:text-white">KUBIKA SYSTEM</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">best choice for your business</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              item.href.startsWith('#') ? (
                <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} to={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                  {item.label}
                </Link>
              )
            ))}
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
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                    {item.label}
                  </Link>
                )
              ))}
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

          {/* Floating icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[18%] left-[8%] sec-float opacity-25">
              <Shield className="w-16 h-16 text-cyan-500" />
            </div>
            <div className="absolute top-[28%] right-[10%] sec-float-delay opacity-20">
              <LockKeyhole className="w-20 h-20 text-emerald-500" />
            </div>
            <div className="absolute bottom-[22%] left-[12%] sec-float-delay opacity-20">
              <KeyRound className="w-16 h-16 text-cyan-400" />
            </div>
            <div className="absolute bottom-[18%] right-[18%] sec-float opacity-25">
              <Database className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="absolute top-[48%] left-[6%] sec-float opacity-20">
              <Eye className="w-14 h-14 text-cyan-300" />
            </div>
            <div className="absolute top-[42%] right-[6%] sec-float-delay opacity-20">
              <Fingerprint className="w-14 h-14 text-emerald-300" />
            </div>
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                Data protection built for Rwandan businesses
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                Your business data stays safe, local, and under your control.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                KUBIKA system protects stock records, financials, payroll and customer data with encryption, role-based access, audit trails and daily backups — all stored in Rwanda.
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
                {['256-bit TLS', 'Daily backups', 'Role-based access', 'Audit trails'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/6">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Shield visual */}
            <div className="sec-drift relative hidden lg:block">
              <div className="absolute -inset-6 rounded-[8px] bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10" />
              <div className="relative overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-slate-900/20 dark:border-white/10">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent sec-scan" />
                <div className="rounded-lg border border-white/10 bg-[#071018] p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Security Command</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">Protection Status</h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <span className="sec-pulse h-2 w-2 rounded-full bg-emerald-300" />
                      All systems active
                    </div>
                  </div>

                  {/* Animated shield */}
                  <div className="mt-5 flex items-center justify-center">
                    <div className="relative mx-auto aspect-square max-w-[220px]">
                      {/* Outer rotating ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-300/20 sec-rotate" />
                      {/* Inner ring */}
                      <div className="absolute inset-[10%] rounded-full border border-emerald-300/20 sec-ring" style={{ animationDirection: 'reverse' }} />
                      {/* Shield gradient */}
                      <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.18)_0%,rgba(34,211,238,.06)_34%,transparent_35%),conic-gradient(from_30deg,rgba(34,211,238,.34),rgba(16,185,129,.32),rgba(250,204,21,.24),rgba(34,211,238,.34))]" />
                      <div className="absolute inset-[30%] rounded-full border border-white/15 bg-slate-950/80 flex items-center justify-center">
                        <ShieldCheck className="h-12 w-12 text-cyan-200" />
                      </div>
                      {/* Orbital dots */}
                      {[0, 1, 2, 3].map((node) => (
                        <span
                          key={node}
                          className="sec-pulse absolute h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-lg shadow-cyan-300/40"
                          style={{
                            left: `${50 + 46 * Math.cos((node * Math.PI) / 2)}%`,
                            top: `${50 + 46 * Math.sin((node * Math.PI) / 2)}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Signal bars */}
                  <div className="mt-5 space-y-4">
                    {liveSignals.map((row) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="font-semibold text-white">{row.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200" style={{ width: row.width }} />
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{row.status}</p>
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
            {securityMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{metric.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{metric.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Protection layers */}
        <section id="layers" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Defense in depth</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  Six layers between your data and the outside world.
                </h2>
              </div>
              <p className="text-lg leading-8 text-slate-600 dark:text-slate-300">
                Security is not a single switch. It is a stack of controls — from the physical server to the user interface — working together to keep your business records safe.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {protectionLayers.map((layer) => (
                <article
                  key={layer.name}
                  className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04] ${layer.border} hover:border-opacity-100`}
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, rgba(34,211,238,0.12), transparent 70%)`,
                    }}
                  />
                  <div className="relative z-10">
                    <div className={`mb-5 grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br ${layer.accent} text-white shadow-lg`}>
                      <layer.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{layer.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{layer.copy}</p>
                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-cyan-700 opacity-0 transition group-hover:opacity-100 dark:text-cyan-300">
                      How it protects
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Dark feature section */}
        <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Inside the system</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Every action is recorded. Nothing disappears.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                The audit trail captures who did what, when, and from where. Exports, deletions, password changes, stock adjustments — all logged and searchable.
              </p>
              <div className="mt-8 grid gap-4">
                {[
                  { title: 'Login history', copy: 'See every sign-in attempt, successful or failed, with IP and timestamp.' },
                  { title: 'Change tracking', copy: 'Know who modified a product price, invoice or stock quantity.' },
                  { title: 'Session control', copy: 'View active sessions and terminate any device instantly.' },
                ].map((item, index) => (
                  <div key={item.title} className="grid grid-cols-[44px_1fr] gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/8 text-sm font-bold text-emerald-300">{index + 1}</div>
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-white p-5 text-slate-950">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Recent audit events</p>
                    <Eye className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ['Invoice INV-2041 created', 'by Jean D. · 2 min ago'],
                      ['Stock adjustment', 'by Marie K. · 14 min ago'],
                      ['Password changed', 'by Admin · 1 hr ago'],
                      ['Backup completed', 'System · 2 hrs ago'],
                    ].map(([title, copy]) => (
                      <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs text-slate-500">{copy}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-lg border border-white/10 bg-cyan-300 p-5 text-slate-950">
                    <Database className="h-5 w-5" />
                    <p className="mt-8 text-3xl font-semibold">14 days</p>
                    <p className="mt-2 text-sm font-medium">Of rolling backup retention on all plans</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-emerald-300 p-5 text-slate-950">
                    <LockKeyhole className="h-5 w-5" />
                    <p className="mt-8 text-3xl font-semibold">100%</p>
                    <p className="mt-2 text-sm font-medium">Of transactions logged with user identity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance grid */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <div className="inline-grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Built to pass an audit.</h2>
                <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Whether it is an RRA tax review, a bank loan check, or an internal board report, KUBIKA system produces the records and controls auditors expect.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {complianceItems.map(({ icon: Icon, label }) => {
                  const TypedIcon = Icon as typeof Shield;
                  return (
                    <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                        <TypedIcon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg bg-gradient-to-br from-slate-950 via-[#0d2430] to-[#123323] p-8 text-white shadow-2xl shadow-slate-900/20 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Start protected</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Security is not an add-on. It is the foundation.</h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                Every workspace starts with encryption, backups, audit trails and role controls enabled by default. You do not have to configure anything to be protected.
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
              <ShieldCheck className="h-8 w-8 text-cyan-700 dark:text-cyan-300" />
              <h3 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">Questions about security?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Our team can walk you through the architecture, backup policies, and compliance features. Reach out on WhatsApp or email.
              </p>
              <div className="mt-6 space-y-3">
                {['WhatsApp: +250 780 936 645', 'Email: uwinezajd2@gmail.com', 'Response time: under 15 min'].map((item) => (
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
            {navItems.map((item) => (
              item.href.startsWith('#') ? (
                <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} to={item.href} className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
                  {item.label}
                </Link>
              )
            ))}
            <Link to="/login" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
              Login
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} KUBIKA system. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Proudly built in Rwanda.
          </span>
        </div>
      </footer>
    </div>
  );
}
