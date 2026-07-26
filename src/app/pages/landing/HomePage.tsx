import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  Facebook,
  FileText,
  Github,
  Globe2,
  Instagram,
  Layers3,
  Linkedin,
  LineChart,
  LockKeyhole,
  Mail,
  Menu,
  Moon,
  PackageCheck,
  Phone,
  Radar,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Users2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { useChatPanelStore } from "@/store/chatPanelStore";

const worldNodes = ["Kigali", "Musanze", "Rubavu", "Huye", "Nyagatare", "Muhanga"];

const socialLinks = [
  { label: "Instagram", icon: Instagram, href: "https://www.instagram.com/kubikasystem" },
  { label: "Facebook", icon: Facebook, href: "https://www.facebook.com/kubikasystem" },
  { label: "X", icon: X, href: "https://x.com/kubikasystem" },
  { label: "GitHub", icon: Github, href: "https://github.com/kubikasystem" },
  { label: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/company/kubikasystem" },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const isDark = theme === "dark";
  const systemHref = user?.role === "platform_admin" ? "/platform-admin" : "/dashboard";
  const { open: chatOpen, toggle: toggleChat } = useChatPanelStore();

  const navItems = useMemo(
    () => [
      { label: t("landing.home.nav.platform"), href: "/platform" },
      { label: t("landing.home.nav.operations"), href: "/operations" },
      { label: t("landing.home.nav.security"), href: "/trust" },
      { label: t("landing.home.nav.pricing"), href: "/pricing" },
    ],
    [t],
  );

  const operatingMetrics = useMemo(
    () => [
      { value: t("landing.home.metrics.modules.value"), label: t("landing.home.metrics.modules.label"), detail: t("landing.home.metrics.modules.detail") },
      { value: t("landing.home.metrics.platform.value"), label: t("landing.home.metrics.platform.label"), detail: t("landing.home.metrics.platform.detail") },
      { value: t("landing.home.metrics.reports.value"), label: t("landing.home.metrics.reports.label"), detail: t("landing.home.metrics.reports.detail") },
      { value: t("landing.home.metrics.company.value"), label: t("landing.home.metrics.company.label"), detail: t("landing.home.metrics.company.detail") },
    ],
    [t],
  );

  const commandModules = useMemo(
    () => [
      { icon: Boxes, name: t("landing.home.modules.inventory.name"), copy: t("landing.home.modules.inventory.copy") },
      { icon: ReceiptText, name: t("landing.home.modules.sales.name"), copy: t("landing.home.modules.sales.copy") },
      { icon: ClipboardCheck, name: t("landing.home.modules.purchasing.name"), copy: t("landing.home.modules.purchasing.copy") },
      { icon: Banknote, name: t("landing.home.modules.finance.name"), copy: t("landing.home.modules.finance.copy") },
      { icon: Users2, name: t("landing.home.modules.hr.name"), copy: t("landing.home.modules.hr.copy") },
      { icon: ShieldCheck, name: t("landing.home.modules.admin.name"), copy: t("landing.home.modules.admin.copy") },
    ],
    [t],
  );

  const timeline = useMemo(
    () => [
      { title: t("landing.home.operations.timeline.record.title"), copy: t("landing.home.operations.timeline.record.copy") },
      { title: t("landing.home.operations.timeline.connect.title"), copy: t("landing.home.operations.timeline.connect.copy") },
      { title: t("landing.home.operations.timeline.decide.title"), copy: t("landing.home.operations.timeline.decide.copy") },
    ],
    [t],
  );

  const signalRows = useMemo(
    () => [
      { label: t("landing.home.signals.cashRunway.label"), value: "148 days", status: t("landing.home.signals.cashRunway.status"), width: "86%" },
      { label: t("landing.home.signals.stockValue.label"), value: "RWF 1.84M", status: t("landing.home.signals.stockValue.status"), width: "62%" },
      { label: t("landing.home.signals.paidSuppliers.label"), value: "12.7%", status: t("landing.home.signals.paidSuppliers.status"), width: "74%" },
      { label: t("landing.home.signals.payrollVariance.label"), value: "1.3%", status: t("landing.home.signals.payrollVariance.status"), width: "91%" },
    ],
    [t],
  );

  const heroBadges = useMemo(
    () => [
      t("landing.home.badges.multiBranch"),
      t("landing.home.badges.rraReady"),
      t("landing.home.badges.payrollIncluded"),
      t("landing.home.badges.worksOffline"),
    ],
    [t],
  );

  const securityFeatures = useMemo(
    () =>
      [
        [Building2, t("landing.home.security.features.multiCompany")],
        [Globe2, t("landing.home.security.features.multiBranch")],
        [FileText, t("landing.home.security.features.auditReporting")],
        [WalletCards, t("landing.home.security.features.bankControls")],
        [CircleDollarSign, t("landing.home.security.features.budgetTracking")],
        [BadgeCheck, t("landing.home.security.features.roleAccess")],
      ] as const,
    [t],
  );

  const pricingFeatures = useMemo(
    () => [
      t("landing.home.pricing.features.mobileDashboard"),
      t("landing.home.pricing.features.stockAlerts"),
      t("landing.home.pricing.features.vatReports"),
      t("landing.home.pricing.features.whatsappSupport"),
    ],
    [t],
  );

  const priorityItems = useMemo(
    () => [
      [t("landing.home.operations.priorities.items.approvePo.title"), t("landing.home.operations.priorities.items.approvePo.copy")],
      [t("landing.home.operations.priorities.items.lowStock.title"), t("landing.home.operations.priorities.items.lowStock.copy")],
      [t("landing.home.operations.priorities.items.payroll.title"), t("landing.home.operations.priorities.items.payroll.copy")],
      [t("landing.home.operations.priorities.items.reconcile.title"), t("landing.home.operations.priorities.items.reconcile.copy")],
    ],
    [t],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      delete (window as any).openLoginModal;
      delete (window as any).openRegisterModal;
    }
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
      <style>{`
        @keyframes home-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -14px, 0); } }
        @keyframes home-scan { 0% { transform: translateX(-115%); } 100% { transform: translateX(115%); } }
        @keyframes home-pulse { 0%, 100% { opacity: .38; transform: scale(.96); } 50% { opacity: .9; transform: scale(1.04); } }
        @keyframes home-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .home-drift { animation: home-drift 7s ease-in-out infinite; }
        .home-scan { animation: home-scan 5.5s linear infinite; }
        .home-pulse { animation: home-pulse 3.8s ease-in-out infinite; }
        .home-marquee { animation: home-marquee 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .home-drift, .home-scan, .home-pulse, .home-marquee { animation: none; }
        }
      `}</style>

      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-slate-200/80 bg-white/86 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#080b12]/84"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="KUBIKA system home">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-slate-950">
              <Layers3 className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-[0.18em] text-slate-950 dark:text-white">KUBIKA SYSTEM</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
                {t("landing.home.brandTagline")}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector variant="landing" />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={toggleChat}
              className={`h-9 gap-2 rounded-xl px-3 transition-all ${
                chatOpen
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:brightness-110"
                  : "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:from-indigo-100 hover:to-violet-100 hover:shadow-md dark:from-indigo-500/15 dark:to-violet-500/15 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:from-indigo-500/25 dark:hover:to-violet-500/25"
              }`}
              title={chatOpen ? t("landing.home.ai.close") : t("landing.home.ai.open")}
            >
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${chatOpen ? "bg-white" : "bg-emerald-400"}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${chatOpen ? "bg-white" : "bg-emerald-500"}`} />
              </span>
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">{t("landing.home.ai.label")}</span>
            </Button>
            {isAuthenticated ? (
              <Link to={systemHref}>
                <Button className="bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                  {t("landing.home.backToDashboard")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                    {t("landing.home.logIn")}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                    {t("landing.home.startNow")}
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
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen((value) => !value)} className="text-slate-800 dark:text-white">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-xl dark:border-white/10 dark:bg-[#080b12] lg:hidden">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <LanguageSelector variant="landing" className="justify-center rounded-md border border-input bg-background px-3 py-2" />
                <Button onClick={() => { toggleChat(); setMobileOpen(false); }} className={`gap-2 transition-all ${chatOpen ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md" : "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30"}`}>
                  <Sparkles className="h-4 w-4" />
                  {t("landing.home.ai.label")}
                </Button>
                {isAuthenticated ? (
                  <Link to={systemHref} onClick={() => setMobileOpen(false)} className="col-span-2">
                    <Button className="w-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                      {t("landing.home.backToDashboard")}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">{t("landing.home.logIn")}</Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="col-span-2">
                      <Button className="w-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                        {t("landing.home.createWorkspace")}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative min-h-[92vh] overflow-hidden pt-24 lg:pt-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(16,185,129,0.18),transparent_24%),linear-gradient(135deg,#f8fbff_0%,#edf7f4_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(74,222,128,0.13),transparent_24%),linear-gradient(135deg,#05070c_0%,#08111a_48%,#07100d_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#f7f9fb] to-transparent dark:from-[#06080d]" />
          <div className="absolute left-0 right-0 top-24 overflow-hidden border-y border-slate-900/5 bg-white/40 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="home-marquee flex w-[200%] gap-8 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {[...worldNodes, ...worldNodes, ...worldNodes, ...worldNodes].map((node, index) => (
                <span key={`${node}-${index}`} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  {t("landing.home.branchOnline", { city: node })}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <Sparkles className="h-4 w-4" />
                {t("landing.home.badge")}
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                {t("landing.home.heroTitle")}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">{t("landing.home.heroSubtitle")}</p>
              {isAuthenticated && (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-4 w-4" />
                  {t("landing.home.signedIn", { name: user?.name ? t("landing.home.signedInAs", { name: user.name }) : "" })}
                </div>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={isAuthenticated ? systemHref : "/register"}>
                  <Button className="h-12 bg-slate-950 px-6 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                    {isAuthenticated ? t("landing.home.returnToDashboard") : t("landing.home.startFreeTrial")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/login">
                    <Button variant="outline" className="h-12 border-slate-300 bg-white/70 px-6 text-slate-900 hover:bg-white dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12">
                      {t("landing.home.signIn")}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                {heroBadges.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/6">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="home-drift relative">
              <div className="absolute -inset-6 rounded-[8px] bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10" />
              <div className="relative overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-slate-900/20 dark:border-white/10">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent home-scan" />
                <div className="rounded-lg border border-white/10 bg-[#071018] p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{t("landing.home.preview.businessOverview")}</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{t("landing.home.preview.liveDashboard")}</h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <span className="home-pulse h-2 w-2 rounded-full bg-emerald-300" />
                      {t("landing.home.preview.live")}
                    </div>
                  </div>
                  <div className="grid gap-3 py-4 sm:grid-cols-3">
                    {[
                      [t("landing.home.preview.netCash"), "RWF 4.82M", "+12.4%"],
                      [t("landing.home.preview.sales"), "1,284", "+8.1%"],
                      [t("landing.home.preview.monthEnd"), t("landing.home.preview.onTrack"), t("landing.home.preview.itemsPending", { count: 2 })],
                    ].map(([label, value, delta]) => (
                      <div key={String(label)} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                        <p className="mt-1 text-xs font-medium text-emerald-300">{delta}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{t("landing.home.preview.operatingSignals")}</p>
                        <BarChart3 className="h-4 w-4 text-cyan-300" />
                      </div>
                      <div className="space-y-4">
                        {signalRows.map((row) => (
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
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{t("landing.home.preview.controlMesh")}</p>
                        <Radar className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div className="relative mx-auto aspect-square max-w-[230px] rounded-full border border-cyan-300/20 bg-[radial-gradient(circle,rgba(34,211,238,.18)_0%,rgba(34,211,238,.06)_34%,transparent_35%),conic-gradient(from_30deg,rgba(34,211,238,.34),rgba(16,185,129,.32),rgba(250,204,21,.24),rgba(34,211,238,.34))]">
                        <div className="absolute inset-[17%] rounded-full border border-white/15" />
                        <div className="absolute inset-[34%] rounded-full border border-white/15 bg-slate-950/70" />
                        {[0, 1, 2, 3, 4, 5].map((node) => (
                          <span key={node} className="home-pulse absolute h-3 w-3 rounded-full bg-cyan-200 shadow-lg shadow-cyan-300/40" style={{ left: `${50 + 42 * Math.cos((node * Math.PI) / 3)}%`, top: `${50 + 42 * Math.sin((node * Math.PI) / 3)}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative -mt-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] md:grid-cols-4">
            {operatingMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{metric.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{metric.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">{t("landing.home.platform.eyebrow")}</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t("landing.home.platform.title")}</h2>
              </div>
              <p className="text-lg leading-8 text-slate-600 dark:text-slate-300">{t("landing.home.platform.subtitle")}</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {commandModules.map((module) => (
                <article key={module.name} className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-900/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-300/40">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{module.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{module.copy}</p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-cyan-700 opacity-0 transition group-hover:opacity-100 dark:text-cyan-300">
                    {t("landing.home.platform.seeModule")}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="operations" className="bg-slate-100 px-4 py-20 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">{t("landing.home.operations.eyebrow")}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t("landing.home.operations.title")}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">{t("landing.home.operations.subtitle")}</p>
              <div className="mt-8 grid gap-4">
                {timeline.map((item, index) => (
                  <div key={item.title} className="grid grid-cols-[44px_1fr] gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-slate-200 text-sm font-bold text-emerald-700 dark:border-white/10 dark:bg-white/8 dark:text-emerald-300">{index + 1}</div>
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-white p-5 text-slate-950">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{t("landing.home.operations.priorities.title")}</p>
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {priorityItems.map(([title, copy]) => (
                      <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs text-slate-500">{copy}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-lg border border-slate-200 bg-cyan-300 p-5 text-slate-950 dark:border-white/10">
                    <LineChart className="h-5 w-5" />
                    <p className="mt-8 text-3xl font-semibold">RWF 850K</p>
                    <p className="mt-2 text-sm font-medium">{t("landing.home.operations.cashUnlocked")}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-emerald-300 p-5 text-slate-950 dark:border-white/10">
                    <PackageCheck className="h-5 w-5" />
                    <p className="mt-8 text-3xl font-semibold">37%</p>
                    <p className="mt-2 text-sm font-medium">{t("landing.home.operations.fewerStockouts")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <div className="inline-grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{t("landing.home.security.title")}</h2>
                <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">{t("landing.home.security.subtitle")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {securityFeatures.map(([Icon, label]) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg bg-gradient-to-br from-slate-950 via-[#0d2430] to-[#123323] p-8 text-white shadow-2xl shadow-slate-900/20 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">{t("landing.home.pricing.eyebrow")}</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{t("landing.home.pricing.title")}</h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{t("landing.home.pricing.subtitle")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button className="h-12 bg-white px-6 text-slate-950 hover:bg-cyan-100">
                    {t("landing.home.startFreeTrial")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" className="h-12 border-white/20 bg-white/8 px-6 text-white hover:bg-white/14">
                    {t("landing.home.pricing.seeDashboard")}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-white/[0.04]">
              <Factory className="h-8 w-8 text-cyan-700 dark:text-cyan-300" />
              <h3 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">{t("landing.home.pricing.builtForRwanda")}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{t("landing.home.pricing.builtForRwandaCopy")}</p>
              <div className="mt-6 space-y-3">
                {pricingFeatures.map((item) => (
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

      <footer className="border-t border-slate-200 bg-white px-4 py-10 dark:border-white/10 dark:bg-[#080b12] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Layers3 className="h-5 w-5" />
              </span>
              <span className="text-base font-semibold tracking-[0.18em] text-slate-950 dark:text-white">KUBIKA SYSTEM</span>
            </Link>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{t("landing.home.footer.tagline")}</p>
            <div className="mt-5 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <a href="mailto:hello@kubika.rw" className="inline-flex items-center gap-2 hover:text-slate-950 dark:hover:text-white">
                <Mail className="h-4 w-4" />
                jayfcode@gmail.com
              </a>
              <a href="tel:+250780936645" className="inline-flex items-center gap-2 hover:text-slate-950 dark:hover:text-white">
                <Phone className="h-4 w-4" />
                +250 780 936 645
              </a>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 lg:justify-end">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
                  {item.label}
                </Link>
              ))}
              <Link to="/login" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white">
                {t("landing.home.footer.login")}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-cyan-300/40 dark:hover:text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("landing.home.footer.copyright", { year: new Date().getFullYear() })}</span>
          <span className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            {t("landing.home.footer.builtInRwanda")}
          </span>
        </div>
      </footer>
    </div>
  );
}
