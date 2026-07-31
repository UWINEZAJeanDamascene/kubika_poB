import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createMuiTheme } from '@/theme/muiTheme';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Database,
  Gauge,
  Layers3,
  LockKeyhole,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { LanguageSelector } from '@/app/components/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const telemetry = [
  { label: 'SYS.UPTIME', value: '99.99%', tone: 'healthy' },
  { label: 'LATENCY', value: '12ms', tone: 'neutral' },
  { label: 'STOCKOUTS', value: '-42%', tone: 'healthy' },
  { label: 'RRA.READY', value: 'TRUE', tone: 'healthy' },
  { label: 'BRANCHES', value: '06 ONLINE', tone: 'healthy' },
] as const;

const signalRows = [
  { label: 'On-hand value', value: 'RWF 1.84M', status: 'WATCHED', width: '62%', tone: 'bg-[var(--industrial-copper)]' },
  { label: 'Supplier payments', value: '87.3%', status: 'ON TRACK', width: '74%', tone: 'bg-[var(--industrial-olive)]' },
  { label: 'Payroll variance', value: '1.3%', status: 'CONTROLLED', width: '91%', tone: 'bg-[var(--industrial-olive)]' },
];

const featureRows = [
  {
    index: '01',
    code: 'SYS.INVENTORY',
    title: 'Know what is moving before it becomes a problem.',
    copy: 'Live stock, batches, serials, transfers and reorder thresholds across every warehouse — without another spreadsheet handoff.',
    icon: Boxes,
    status: 'STOCK POSITION / LIVE',
  },
  {
    index: '02',
    code: 'SYS.PURCHASING',
    title: 'Turn purchase intent into accountable supply.',
    copy: 'Approve purchase orders, receive goods, reconcile supplier bills and keep committed spend visible from request to settlement.',
    icon: ClipboardList,
    status: 'COMMITMENTS / TRACKED',
  },
  {
    index: '03',
    code: 'SYS.FINANCE',
    title: 'Close the loop from transaction to decision.',
    copy: 'Connect sales, expenses, bank activity, payroll and tax reporting in one operating record your team can trust at month-end.',
    icon: CircleDollarSign,
    status: 'CASH CONTROL / HEALTHY',
  },
];

const metricRows = [
  ['18+', 'CONNECTED MODULES', 'From stock control to payroll.'],
  ['01', 'OPERATING RECORD', 'One version of the number.'],
  ['06', 'BRANCHES ONLINE', 'Multi-company ready.'],
  ['24/7', 'DECISION CONTEXT', 'Reports when you need them.'],
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center border border-[var(--industrial-copper)] bg-[var(--industrial-copper)] text-[var(--industrial-bg)]">
        <Layers3 className="h-5 w-5" strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-mono text-sm font-bold tracking-[0.18em] text-[var(--industrial-ink)]">KUBIKA</span>
          <span className="mt-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--industrial-muted)]">OPERATIONS SYSTEM</span>
        </span>
      )}
    </span>
  );
}

function TelemetryBand({ compact = false }: { compact?: boolean }) {
  const items = [...telemetry, ...telemetry];

  return (
    <div className={`industrial-telemetry relative overflow-hidden border-y border-[var(--industrial-copper)]/35 ${compact ? 'py-2' : 'py-2.5'}`}>
      <div className="industrial-telemetry__fade industrial-telemetry__fade--left" aria-hidden="true" />
      <div className="industrial-telemetry__fade industrial-telemetry__fade--right" aria-hidden="true" />
      <div className="industrial-telemetry__track flex min-w-max animate-[industrial-marquee_36s_linear_infinite] gap-0 pr-8 motion-reduce:animate-none">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} aria-hidden={index >= telemetry.length} className="industrial-telemetry__item inline-flex items-center gap-3 border-r border-white/10 px-5 first:pl-1 sm:px-7 sm:first:pl-2">
            <span className={`industrial-telemetry__dot industrial-telemetry__dot--${item.tone}`} aria-hidden="true" />
            <span className="industrial-telemetry__label">{item.label}</span>
            <span className="industrial-telemetry__value">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const systemHref = user?.role === 'platform_admin' ? '/platform-admin' : '/dashboard';
  const pageTheme = useMemo(() => createMuiTheme(theme), [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: t('landing.home.nav.platform'), href: '#platform' },
    { label: t('landing.home.nav.operations'), href: '#operations' },
    { label: t('landing.home.nav.security'), href: '#security' },
  ];

  return (
    <MuiThemeProvider theme={pageTheme}>
      <div className="industrial-public min-h-screen overflow-x-hidden bg-[var(--industrial-bg)] text-[var(--industrial-ink)]">
      <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-[var(--industrial-copper)]/45 bg-[var(--industrial-bg)]/95 backdrop-blur' : 'border-white/10 bg-[var(--industrial-bg)]'}`}>
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          <Link to="/" aria-label="KUBIKA home"><BrandMark /></Link>
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--industrial-muted)] transition-colors hover:text-[var(--industrial-ink)]">{item.label}</a>
            ))}
            <Link to="/pricing" className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--industrial-muted)] transition-colors hover:text-[var(--industrial-ink)]">PRICING</Link>
          </nav>
          <Stack direction="row" alignItems="center" spacing={1}>
            <div className="hidden sm:block"><LanguageSelector variant="landing" className="!text-[var(--industrial-muted)] hover:!bg-white/10 hover:!text-[var(--industrial-ink)]" /></div>
            <Button aria-label="Toggle theme" onClick={toggleTheme} variant="text" color="inherit" className="!min-w-0 !p-2 !text-[var(--industrial-muted)] hover:!bg-white/10 hover:!text-[var(--industrial-ink)]">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button component={Link} to="/login" variant="outlined" color="primary" className="hidden !h-9 !px-3 !text-[10px] sm:inline-flex">LOG IN</Button>
            <Button component={Link} to={isAuthenticated ? systemHref : '/register'} variant="contained" color="primary" endIcon={<ArrowUpRight className="h-4 w-4" />} className="!h-9 !px-3 !text-[10px]">
              {isAuthenticated ? 'OPEN SYSTEM' : 'OPEN WORKSPACE'}
            </Button>
            <Button aria-label="Toggle navigation" onClick={() => setMobileOpen((value) => !value)} variant="text" color="inherit" className="!min-w-0 !p-2 !text-[var(--industrial-muted)] lg:!hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </Stack>
        </div>
        {mobileOpen && (
          <div className="border-t border-white/10 px-5 py-4 lg:hidden">
            <Stack spacing={1}>
              {navItems.map((item) => <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="border-b border-white/10 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]">{item.label}</a>)}
              <Link to="/pricing" onClick={() => setMobileOpen(false)} className="border-b border-white/10 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]">PRICING</Link>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--industrial-copper)]">LOG IN <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
            </Stack>
          </div>
        )}
      </header>

      <main>
        <section className="industrial-grid border-b border-white/10">
          <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-5 sm:px-8 lg:px-12 lg:pb-16 lg:pt-8">
            <TelemetryBand />
            <div className="grid gap-14 pt-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-12 lg:pt-24">
              <div className="max-w-xl">
                <p className="industrial-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--industrial-copper)]">KUBIKA / CONTROL LAYER 01</p>
                <h1 className="industrial-display mt-5 text-[clamp(4.5rem,9vw,9.5rem)] leading-[0.82] text-[var(--industrial-ink)]">PRECISION<br />IN EVERY<br /><span className="text-[var(--industrial-copper)]">OPERATION.</span></h1>
                <p className="mt-8 max-w-lg text-base leading-7 text-[var(--industrial-muted)] sm:text-lg">{t('landing.home.heroSubtitle')}</p>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} className="mt-9">
                  <Button component={Link} to={isAuthenticated ? systemHref : '/register'} variant="contained" color="primary" endIcon={<ArrowRight className="h-4 w-4" />} className="!justify-between !px-5 !py-3 !text-[10px] sm:!justify-center">{isAuthenticated ? 'RETURN TO SYSTEM' : 'INITIATE WORKSPACE'}</Button>
                  {!isAuthenticated && <Button component={Link} to="/login" variant="outlined" color="primary" endIcon={<ChevronRight className="h-4 w-4" />} className="!justify-between !px-5 !py-3 !text-[10px] sm:!justify-center">ACCESS CONSOLE</Button>}
                </Stack>
                <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--industrial-muted)]">
                  {['Multi-branch', 'RRA-ready', 'Offline capable'].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--industrial-olive)]" />{item}</span>)}
                </div>
              </div>

              <div className="relative lg:pl-8">
                <div className="absolute -left-3 top-10 hidden h-px w-20 bg-[var(--industrial-copper)] lg:block" />
                <div className="industrial-frame overflow-hidden border border-white/15 bg-[var(--industrial-panel)] shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--industrial-muted)] sm:px-5">
                    <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[var(--industrial-olive)]" />LIVE / BUSINESS OVERVIEW</span>
                    <span>07:42:18 UTC</span>
                  </div>
                  <div className="grid gap-5 p-4 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[['NET CASH', 'RWF 4.82M', '+12.4%'], ['SALES / 30D', '1,284', '+8.1%'], ['MONTH END', 'ON TRACK', '02 ACTIONS']].map(([label, value, delta]) => (
                        <div key={label} className="border border-white/10 bg-[var(--industrial-panel-raised)] p-4">
                          <p className="industrial-mono text-[9px] uppercase tracking-[0.13em] text-[var(--industrial-muted)]">{label}</p>
                          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-[var(--industrial-ink)] sm:text-2xl">{value}</p>
                          <p className="mt-2 font-mono text-[10px] text-[var(--industrial-olive)]">{delta}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="border border-white/10 p-4">
                        <div className="mb-5 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--industrial-ink)]">OPERATING SIGNALS</p><BarChart3 className="h-4 w-4 text-[var(--industrial-copper)]" /></div>
                        <Stack spacing={2.5}>
                          {signalRows.map((row) => <div key={row.label}><div className="mb-2 flex items-center justify-between gap-4 font-mono text-[10px]"><span className="text-[var(--industrial-muted)]">{row.label}</span><span className="text-[var(--industrial-ink)]">{row.value}</span></div><div className="h-1.5 bg-white/10"><div className={`h-full ${row.tone}`} style={{ width: row.width }} /></div><p className="mt-1.5 font-mono text-[9px] text-[var(--industrial-muted)]">{row.status}</p></div>)}
                        </Stack>
                      </div>
                      <div className="border border-white/10 p-4">
                        <div className="mb-5 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--industrial-ink)]">CONTROL MESH</p><Gauge className="h-4 w-4 text-[var(--industrial-copper)]" /></div>
                        <div className="relative mx-auto aspect-square max-w-[230px] border border-[var(--industrial-copper)]/35 p-5"><div className="flex h-full items-center justify-center border border-white/15"><div className="flex h-24 w-24 items-center justify-center border border-[var(--industrial-copper)] bg-[var(--industrial-bg)] font-mono text-xs text-[var(--industrial-copper)]">SYNC<br />OK</div></div><span className="absolute -left-1 top-1/2 h-2 w-2 bg-[var(--industrial-copper)]" /><span className="absolute -right-1 top-1/2 h-2 w-2 bg-[var(--industrial-olive)]" /></div>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4"><p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--industrial-muted)]">CURRENTLY MONITORING</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[470px] text-left font-mono text-[10px]"><thead className="text-[var(--industrial-muted)]"><tr><th className="pb-2 font-medium">ENTITY</th><th className="pb-2 font-medium">STATE</th><th className="pb-2 font-medium">OWNER</th><th className="pb-2 text-right font-medium">DELTA</th></tr></thead><tbody className="divide-y divide-white/10 text-[var(--industrial-ink)]"><tr><td className="py-2.5">WAREHOUSE / KGL-01</td><td className="py-2.5"><span className="text-[var(--industrial-olive)]">● HEALTHY</span></td><td className="py-2.5 text-[var(--industrial-muted)]">OPS</td><td className="py-2.5 text-right text-[var(--industrial-olive)]">+4.2%</td></tr><tr><td className="py-2.5">PO / PO-1048</td><td className="py-2.5"><span className="text-[var(--industrial-copper)]">● REVIEW</span></td><td className="py-2.5 text-[var(--industrial-muted)]">PROCURE</td><td className="py-2.5 text-right text-[var(--industrial-copper)]">RWF 240K</td></tr></tbody></table></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[var(--industrial-panel)]">
          <div className="mx-auto grid max-w-[1440px] sm:grid-cols-2 lg:grid-cols-4">
            {metricRows.map(([value, label, detail], index) => <div key={label} className={`border-white/10 p-6 lg:p-8 ${index > 0 ? 'border-t sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'lg:border-l' : ''}`}><p className="font-mono text-4xl text-[var(--industrial-copper)]">{value}</p><p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--industrial-ink)]">{label}</p><p className="mt-2 text-sm leading-6 text-[var(--industrial-muted)]">{detail}</p></div>)}
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-[1440px] scroll-mt-20 px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12 lg:pb-28 lg:pt-16">
          <div className="grid gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:gap-12">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="industrial-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--industrial-copper)]">02 / OPERATING LAYERS</p>
              <h2 className="industrial-display mt-5 text-6xl leading-[0.85] text-[var(--industrial-ink)] sm:text-8xl">ONE<br />RECORD.<br /><span className="text-[var(--industrial-muted)]">EVERY<br />TEAM.</span></h2>
              <p className="mt-7 max-w-xs text-sm leading-6 text-[var(--industrial-muted)]">{t('landing.home.platform.subtitle')}</p>
              <div className="mt-9 hidden border-l border-[var(--industrial-copper)] pl-4 lg:block"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--industrial-copper)]">SCROLL TO INSPECT</p><p className="mt-2 font-mono text-[10px] text-[var(--industrial-muted)]">Inventory / Purchasing / Finance</p></div>
            </div>
            <div className="border-l border-white/10 lg:pl-12">
              <Stack spacing={4}>
                {featureRows.map((feature) => { const Icon = feature.icon; return <article key={feature.code} id={feature.code.toLowerCase()} className="industrial-frame border border-white/12 bg-[var(--industrial-panel)] p-5 transition-colors duration-300 hover:border-[var(--industrial-copper)]/45 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-4"><div className="flex items-center gap-4"><span className="font-mono text-3xl text-[var(--industrial-copper)]">{feature.index}</span><span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--industrial-muted)]">{feature.code}</span></div><Icon aria-hidden="true" className="h-5 w-5 text-[var(--industrial-copper)]" strokeWidth={1.5} /></div><div className="grid gap-7 pt-6 md:grid-cols-[0.75fr_1.25fr] md:items-end"><div><h3 className="industrial-display text-4xl leading-[0.92] text-[var(--industrial-ink)] sm:text-5xl">{feature.title}</h3><p className="mt-4 text-sm leading-7 text-[var(--industrial-muted)]">{feature.copy}</p></div><div className="border border-white/10 bg-[var(--industrial-bg)] p-4"><div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]"><span>{feature.status}</span><span className="text-[var(--industrial-olive)]">NOMINAL</span></div>{feature.index === '01' && <div className="mt-5 flex h-24 items-end gap-2 border-b border-l border-white/10 px-3 pb-0">{[42, 65, 54, 78, 61, 86, 72, 94].map((height, index) => <div key={index} className={`flex-1 ${index === 7 ? 'bg-[var(--industrial-copper)]' : 'bg-[var(--industrial-olive)]/70'}`} style={{ height: `${height}%` }} />)}</div>}{feature.index === '02' && <div className="mt-5 space-y-3 font-mono text-[10px]"><div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-[var(--industrial-muted)]">PO-1048</span><span className="text-[var(--industrial-copper)]">AWAITING APPROVAL</span></div><div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-[var(--industrial-muted)]">GRN-7721</span><span className="text-[var(--industrial-olive)]">RECEIVED</span></div><div className="flex items-center justify-between"><span className="text-[var(--industrial-muted)]">BILL-2990</span><span className="text-[var(--industrial-ink)]">MATCHED</span></div></div>}{feature.index === '03' && <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-[10px]"><div className="border border-white/10 p-3"><p className="text-[var(--industrial-muted)]">CASH RUNWAY</p><p className="mt-3 text-xl text-[var(--industrial-ink)]">148D</p></div><div className="border border-white/10 p-3"><p className="text-[var(--industrial-muted)]">AR COLLECTED</p><p className="mt-3 text-xl text-[var(--industrial-olive)]">92%</p></div></div>}</div></div></article>; })}
              </Stack>
            </div>
          </div>
        </section>

        <section id="operations" className="border-y border-[var(--industrial-copper)]/35 bg-[var(--industrial-panel)]">
          <TelemetryBand compact />
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.45fr_0.55fr] lg:px-12 lg:py-28">
            <div><p className="industrial-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--industrial-copper)]">03 / COMMAND SIGNAL</p><h2 className="industrial-display mt-5 text-6xl leading-[0.84] text-[var(--industrial-ink)] sm:text-8xl">THE<br /><span className="text-[var(--industrial-copper)]">NUMBER</span><br />IS THE<br />MESSAGE.</h2><p className="mt-7 max-w-md text-base leading-7 text-[var(--industrial-muted)]">Record once. Connect everything. Decide with the same operating context across warehouse, office and leadership.</p><Button component={Link} to="/operations" variant="outlined" color="primary" endIcon={<ArrowRight className="h-4 w-4" />} className="mt-8 !px-5 !py-3 !text-[10px]">VIEW OPERATING MODEL</Button></div>
            <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2"><div className="bg-[var(--industrial-bg)] p-6 sm:p-8"><Activity className="h-5 w-5 text-[var(--industrial-copper)]" /><p className="mt-12 font-mono text-4xl text-[var(--industrial-ink)]">12ms</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]">Average response time</p><p className="mt-7 font-mono text-[10px] text-[var(--industrial-olive)]">● SYSTEM NOMINAL</p></div><div className="bg-[var(--industrial-bg)] p-6 sm:p-8"><Database className="h-5 w-5 text-[var(--industrial-copper)]" /><p className="mt-12 font-mono text-4xl text-[var(--industrial-ink)]">99.99%</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]">Platform availability</p><p className="mt-7 font-mono text-[10px] text-[var(--industrial-olive)]">● DATA PROTECTED</p></div><div className="bg-[var(--industrial-bg)] p-6 sm:p-8"><ArrowDownRight className="h-5 w-5 text-[var(--industrial-copper)]" /><p className="mt-12 font-mono text-4xl text-[var(--industrial-ink)]">-42%</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]">Reported stockouts</p><p className="mt-7 font-mono text-[10px] text-[var(--industrial-olive)]">● REORDER CONTROL</p></div><div className="bg-[var(--industrial-bg)] p-6 sm:p-8"><ShieldCheck className="h-5 w-5 text-[var(--industrial-copper)]" /><p className="mt-12 font-mono text-4xl text-[var(--industrial-ink)]">RRA</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]">Ready reporting layer</p><p className="mt-7 font-mono text-[10px] text-[var(--industrial-olive)]">● AUDIT READY</p></div></div>
          </div>
        </section>

        <section id="security" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-12 border-t border-white/10 pt-10 lg:grid-cols-[0.62fr_0.38fr] lg:gap-20"><div><p className="industrial-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--industrial-copper)]">04 / CONTROL BY DESIGN</p><h2 className="industrial-display mt-5 max-w-4xl text-6xl leading-[0.84] text-[var(--industrial-ink)] sm:text-8xl">BUILT FOR<br /><span className="text-[var(--industrial-copper)]">ACCOUNTABILITY.</span></h2><p className="mt-8 max-w-2xl text-base leading-7 text-[var(--industrial-muted)]">Role-based access, company boundaries, approval trails and resilient backups are part of the operating model — not a late-stage add-on.</p></div><div className="border-l border-[var(--industrial-copper)]/60 pl-6 sm:pl-8"><LockKeyhole className="h-6 w-6 text-[var(--industrial-copper)]" /><Stack spacing={2} className="mt-8">{['Tenant-aware security', 'Role-based permissions', 'Audit-ready sessions', 'Offline-ready workflows'].map((item) => <div key={item} className="flex items-center gap-3 border-b border-white/10 pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--industrial-muted)]"><Check className="h-4 w-4 text-[var(--industrial-olive)]" />{item}</div>)}</Stack></div></div>
        </section>

        <section className="border-t border-white/10 bg-[var(--industrial-copper)] text-[var(--industrial-bg)]"><div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20"><div><p className="industrial-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--industrial-bg)]/70">05 / NEXT ACTION</p><h2 className="industrial-display mt-4 text-6xl leading-[0.84] sm:text-8xl">MAKE THE<br />NEXT DECISION<br />VISIBLE.</h2></div><div className="max-w-sm"><p className="text-base leading-7 text-[var(--industrial-bg)]/80">Start with one workspace. Give every department the same number, the same context, and a faster way to act.</p><Button component={Link} to={isAuthenticated ? systemHref : '/register'} variant="contained" color="inherit" endIcon={<ArrowUpRight className="h-4 w-4" />} className="mt-7 !bg-[var(--industrial-bg)] !px-5 !py-3 !text-[10px] !text-[var(--industrial-ink)] hover:!bg-[var(--industrial-panel)]">{isAuthenticated ? 'OPEN SYSTEM' : 'OPEN WORKSPACE'}</Button></div></div></section>
      </main>

      <footer className="border-t border-white/10 bg-[var(--industrial-bg)]"><div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><Link to="/" aria-label="KUBIKA home"><BrandMark /></Link><div className="flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--industrial-muted)]"><Link to="/trust" className="hover:text-[var(--industrial-ink)]">Trust & security</Link><Link to="/pricing" className="hover:text-[var(--industrial-ink)]">Pricing</Link><a href="mailto:jayfcode@gmail.com" className="hover:text-[var(--industrial-ink)]">jayfcode@gmail.com</a><span>© {new Date().getFullYear()} KUBIKA</span></div></div></footer>
      </div>
    </MuiThemeProvider>
  );
}
