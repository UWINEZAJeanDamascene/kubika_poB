import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Calculator,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Layers3,
  LineChart,
  Menu,
  Moon,
  Package,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  Sun,
  Truck,
  Users2,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LanguageSelector } from '@/app/components/LanguageSelector';

const workflowSteps = [
  {
    icon: Boxes,
    title: 'Stock comes in',
    copy: 'Receive goods against purchase orders. Record batches, serials, and warehouse locations. Stock levels update automatically.',
  },
  {
    icon: ShoppingCart,
    title: 'Sales go out',
    copy: 'Create quotations, convert to invoices, track deliveries. Stock deducts in real time. Credit notes handle returns cleanly.',
  },
  {
    icon: Banknote,
    title: 'Money is tracked',
    copy: 'Record customer payments, supplier bills, bank transfers and petty cash. Know who owes you and who you owe at any moment.',
  },
  {
    icon: Calculator,
    title: 'Books stay balanced',
    copy: 'Journal entries, trial balance, profit and loss, balance sheet — generated from the same transactions your team already entered.',
  },
  {
    icon: Users2,
    title: 'Staff gets paid',
    copy: 'Employee records, monthly payroll runs, statutory deductions, and payslip generation. No retyping data into a separate payroll tool.',
  },
  {
    icon: FileText,
    title: 'Reports are ready',
    copy: 'Daily, weekly, monthly and annual reports. Sales by customer, stock valuation, cash position, VAT returns, and budget vs actual.',
  },
];

const dailyCards = [
  { label: 'Stock in', value: 'RWF 2.4M', delta: 'Today', accent: 'bg-cyan-300' },
  { label: 'Invoices out', value: 'RWF 3.1M', delta: 'Today', accent: 'bg-emerald-300' },
  { label: 'Cash collected', value: 'RWF 1.8M', delta: 'Today', accent: 'bg-amber-200' },
  { label: 'Payroll due', value: 'RWF 850K', delta: 'In 3 days', accent: 'bg-slate-200' },
];

const realMetrics = [
  { value: 'One entry', label: 'Per transaction', detail: 'Record a sale once. Stock, revenue, tax and customer records update automatically.' },
  { value: '18 modules', label: 'Connected', detail: 'Inventory, sales, purchasing, finance, payroll, reports, budgets and projects share one database.' },
  { value: 'Daily / weekly / monthly / annual', label: 'Report cycles', detail: 'From a morning cash position check to year-end financial statements and tax filing.' },
  { value: 'Multi-branch', label: 'Out of the box', detail: 'Run separate warehouses, shops or companies. Roll up numbers or drill into each branch.' },
];

const moduleGrid = [
  { icon: Package, name: 'Products & Stock', items: ['Categories, SKUs, variants', 'Batches and serial numbers', 'Stock transfers between warehouses', 'Reorder alerts and low-stock warnings'] },
  { icon: ClipboardCheck, name: 'Purchasing', items: ['Purchase orders to suppliers', 'Goods received notes (GRN)', 'Purchase returns', 'Supplier payment tracking'] },
  { icon: ReceiptText, name: 'Sales', items: ['Quotations and invoices', 'Delivery notes and credit notes', 'Recurring invoices', 'Customer aging and payment history'] },
  { icon: WalletCards, name: 'Finance', items: ['Bank accounts and reconciliation', 'Accounts receivable & payable', 'Petty cash and expenses', 'Chart of accounts and journals'] },
  { icon: Calculator, name: 'Reporting', items: ['Profit & loss, balance sheet', 'Cash flow and trial balance', 'VAT returns for RRA', 'Budget vs actual tracking'] },
  { icon: Users2, name: 'People', items: ['Employee master data', 'Monthly payroll runs', 'Statutory deductions', 'Payslip generation'] },
];

export default function OperationsLandingPage() {
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
    { label: 'Security', href: '/trust' },
    { label: 'Operations', href: '#workflow' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
      <style>{`
        @keyframes ops-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -14px, 0); } }
        @keyframes ops-scan { 0% { transform: translateX(-115%); } 100% { transform: translateX(115%); } }
        @keyframes ops-pulse { 0%, 100% { opacity: .35; transform: scale(.94); } 50% { opacity: .95; transform: scale(1.06); } }
        @keyframes ops-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-16px) rotate(4deg); } }
        @keyframes ops-float-delay { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(-3deg); } }
        .ops-drift { animation: ops-drift 7s ease-in-out infinite; }
        .ops-scan { animation: ops-scan 5.5s linear infinite; }
        .ops-pulse { animation: ops-pulse 3.8s ease-in-out infinite; }
        .ops-float { animation: ops-float 8s ease-in-out infinite; }
        .ops-float-delay { animation: ops-float-delay 10s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ops-drift, .ops-scan, .ops-pulse, .ops-float, .ops-float-delay { animation: none; }
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
            <div className="absolute top-[16%] left-[8%] ops-float opacity-20">
              <Package className="w-16 h-16 text-cyan-500" />
            </div>
            <div className="absolute top-[26%] right-[10%] ops-float-delay opacity-20">
              <ShoppingCart className="w-18 h-18 text-emerald-500" />
            </div>
            <div className="absolute bottom-[22%] left-[10%] ops-float-delay opacity-20">
              <Banknote className="w-16 h-16 text-cyan-400" />
            </div>
            <div className="absolute bottom-[18%] right-[16%] ops-float opacity-25">
              <FileText className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="absolute top-[46%] left-[5%] ops-float opacity-20">
              <Truck className="w-14 h-14 text-cyan-300" />
            </div>
            <div className="absolute top-[40%] right-[5%] ops-float-delay opacity-20">
              <Calculator className="w-14 h-14 text-emerald-300" />
            </div>
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <PackageCheck className="h-4 w-4" />
                Stock, sales, purchasing, finance and payroll — connected end to end
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                Run the full business cycle without switching apps.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                From the moment stock arrives to the day payroll goes out, everything lives in one system. No double entry. No lost invoices. No guessing your cash position.
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
                {['Inventory tracking', 'Invoicing', 'Bank reconciliation', 'Payroll included'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/6">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="ops-drift relative hidden lg:block">
              <div className="absolute -inset-6 rounded-[8px] bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10" />
              <div className="relative overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-slate-900/20 dark:border-white/10">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent ops-scan" />
                <div className="rounded-lg border border-white/10 bg-[#071018] p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Business Pulse</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">Today's Numbers</h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <span className="ops-pulse h-2 w-2 rounded-full bg-emerald-300" />
                      Live
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {dailyCards.map((card) => (
                      <div key={card.label} className={`rounded-lg p-4 ${card.accent} text-slate-950`}>
                        <p className="text-xs font-semibold opacity-70">{card.label}</p>
                        <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                        <p className="mt-1 text-xs font-medium opacity-70">{card.delta}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      { label: 'Low stock items', val: '14 SKUs', bar: '62%', color: 'from-amber-300 to-orange-300' },
                      { label: 'Unpaid invoices', val: 'RWF 420K', bar: '34%', color: 'from-cyan-300 to-emerald-300' },
                      { label: 'Payroll coverage', val: '100%', bar: '100%', color: 'from-emerald-300 to-cyan-300' },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="font-semibold text-white">{row.val}</span>
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

        {/* Metrics */}
        <section className="relative -mt-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] md:grid-cols-4">
            {realMetrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{m.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{m.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{m.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">How it actually works</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  Six steps. One system. No workarounds.
                </h2>
              </div>
              <p className="text-lg leading-8 text-slate-600 dark:text-slate-300">
                This is not a marketing funnel. It is the actual path your stock, money and paperwork follow inside KUBIKA system. Each step feeds the next automatically.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflowSteps.map((step, i) => (
                <article
                  key={step.title}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.12), transparent 70%)' }}
                  />
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Step {i + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{step.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Dark feature grid */}
        <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">What you can do</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">The modules that make it happen.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                These are the actual menu items in your sidebar. Each module is built to handle a real business task, not a buzzword.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {moduleGrid.map((mod) => (
                <div key={mod.name} className="rounded-lg border border-white/10 bg-white/[0.04] p-6 transition hover:border-cyan-300/30">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-300 text-slate-950">
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{mod.name}</h3>
                  <ul className="mt-4 space-y-2">
                    {mod.items.map((it) => (
                      <li key={it} className="flex items-start gap-2 text-sm text-slate-300">
                        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-300" />
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
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Start operating</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">See how your numbers connect.</h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                Create a workspace, add a few products, raise an invoice, and watch the stock count, revenue dashboard and cash position update in real time.
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
              <LineChart className="h-8 w-8 text-cyan-700 dark:text-cyan-300" />
              <h3 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">What users actually say</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                "Before KUBIKA system I had stock in a spreadsheet, invoices in WhatsApp, and payroll in another tool. Now I log in once and see everything."
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">— Retail shop owner, Kigali</p>
              <div className="mt-6 space-y-3">
                {['14-day free trial', 'No credit card needed', 'Local support on WhatsApp'].map((item) => (
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
            <Package className="h-3.5 w-3.5" />
            Proudly built in Rwanda.
          </span>
        </div>
      </footer>
    </div>
  );
}
