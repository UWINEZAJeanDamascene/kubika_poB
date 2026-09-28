import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ChartColumn,
  Check,
  ClipboardList,
  Coins,
  CreditCard,
  Database,
  FileBarChart,
  FileClock,
  FileText,
  Landmark,
  Layers3,
  Loader2,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Repeat2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tags,
  Truck,
  Users,
  Warehouse,
  Zap,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { companyService } from '@/services';

const PLAN_ACCENTS = [
  'from-cyan-400 to-emerald-300',
  'from-amber-300 to-cyan-300',
  'from-emerald-300 to-white',
  'from-violet-400 to-fuchsia-300',
  'from-rose-300 to-orange-300',
];

const PLAN_BADGES = ['Entry tier', 'Most popular', 'Full access', 'Advanced', 'Custom'];

const CARD_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Boxes,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Zap,
  Building2,
  Check,
  Layers3,
  ArrowRight,
  ArrowLeft,
};

const FEATURE_ICON_MAP: Array<[RegExp, ComponentType<{ className?: string }>]> = [
  [/product|categor/i, Tags],
  [/warehouse/i, Warehouse],
  [/stock level/i, ChartColumn],
  [/stock movement/i, Repeat2],
  [/pos/i, ShoppingCart],
  [/quotation|sales order/i, FileText],
  [/invoice|receivable|payable/i, ReceiptText],
  [/delivery/i, Truck],
  [/batch|serial/i, PackageCheck],
  [/client|employee/i, Users],
  [/pick pack/i, PackageOpen],
  [/credit note/i, FileClock],
  [/supplier/i, Building2],
  [/purchase/i, ClipboardList],
  [/bank/i, Landmark],
  [/journal/i, FileText],
  [/petty cash|cash flow/i, Coins],
  [/expense|budget/i, CreditCard],
  [/period/i, CalendarDays],
  [/chart of accounts|balance sheet|ratio/i, Banknote],
  [/liabilities|fixed assets/i, Database],
  [/report|profit|loss|debt/i, FileBarChart],
];

const GROUP_LABELS: Record<string, string> = {
  inventory: 'Inventory Core',
  sales: 'Revenue Flow',
  purchases: 'Supply Chain',
  finance: 'Finance Control',
  payroll: 'Finance Control',
  reports: 'Intelligence',
  projects: 'Finance Control',
  fixed_assets: 'Finance Control',
  ai_assistant: 'Intelligence',
};

const FEATURE_LABELS: Record<string, string> = {
  inventory: 'Products & Categories',
  sales: 'Quotations & Sales Orders',
  purchases: 'Purchase Orders',
  finance: 'Bank Accounts',
  payroll: 'Payroll & Payroll Runs',
  reports: 'Reports Hub',
  projects: 'Projects',
  fixed_assets: 'Liabilities & Fixed Assets',
  ai_assistant: 'Stacy AI Assistant included',
};

interface PlanData {
  key: string;
  name: string;
  description: string;
  features: string[];
  modules: string[];
  outcomes: string[];
  badge: string;
  icon: string;
  featured: boolean;
  button_label: string;
  default_billing_amount: number;
  default_billing_cycle: string;
  sort_order: number;
}

function titleFromKey(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function featureIcon(label: string) {
  return FEATURE_ICON_MAP.find(([pattern]) => pattern.test(label))?.[1] || Check;
}

function formatPrice(amount: number) {
  if (!amount) return 'Custom';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseGroupedModules(plan: PlanData) {
  const source = plan.modules?.length
    ? plan.modules
    : plan.features.map((feature) => `${GROUP_LABELS[feature] || 'Included Modules'}|${FEATURE_LABELS[feature] || titleFromKey(feature)}`);

  const groups: Array<{ title: string; items: string[] }> = [];
  source.forEach((rawItem) => {
    const divider = rawItem.includes('|') ? '|' : rawItem.includes(':') ? ':' : null;
    const [rawGroup, ...rest] = divider ? rawItem.split(divider) : ['Included Modules', rawItem];
    const title = rawGroup.trim();
    const label = rest.join(divider || '').trim();
    if (!label) return;
    const existing = groups.find((group) => group.title.toLowerCase() === title.toLowerCase());
    if (existing) existing.items.push(label);
    else groups.push({ title, items: [label] });
  });
  return groups;
}

function parseIncludedPills(outcomes: string[]) {
  const pills = outcomes
    .filter((item) => item.toLowerCase().startsWith('included|'))
    .map((item) => {
      const [, tone = 'control', label = 'Control Room included'] = item.split('|');
      return {
        label,
        tone,
        Icon: tone === 'ai' ? Sparkles : ShieldCheck,
      };
    });
  return pills.length ? pills : [{ label: 'Control Room included', tone: 'control', Icon: ShieldCheck }];
}

function visiblePricingPlans(plans: PlanData[]) {
  return plans
    .filter((plan) => plan.key !== 'trial' && plan.default_billing_amount > 0)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3);
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getPublicSubscriptionPlans()
      .then((res) => {
        if (res.success) {
          setPlans(visiblePricingPlans(res.data));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const uiPlans = plans.map((plan, index) => ({
    key: plan.key,
    name: plan.name,
    priceAmount: formatPrice(plan.default_billing_amount),
    pricePeriod: '/ month',
    accent: PLAN_ACCENTS[index % PLAN_ACCENTS.length],
    badge: plan.badge || PLAN_BADGES[index % PLAN_BADGES.length],
    summary: plan.description || '',
    groups: parseGroupedModules(plan),
    includedPills: parseIncludedPills(plan.outcomes || []),
    icon: CARD_ICON_MAP[plan.icon] || Boxes,
    featured: plan.featured,
    buttonLabel: plan.button_label || (plan.featured ? 'Get started' : 'Learn more'),
  }));

  const moduleMatrix = plans.length > 0
    ? Array.from(new Set(plans.flatMap((plan) => parseGroupedModules(plan).flatMap((group) => group.items)))).map((mod) => ({
        key: mod,
        title: mod,
        tiers: plans.filter((plan) => parseGroupedModules(plan).some((group) => group.items.includes(mod))).map((plan) => plan.key),
      }))
    : [];
  const tierKeys = uiPlans.map((p) => p.key);

  return (
    <div className="pricing-page min-h-screen bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
      <section className="relative overflow-hidden px-4 pb-12 pt-6 sm:px-6 sm:pb-16 lg:px-8 xl:px-12 2xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(16,185,129,0.18),transparent_24%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(74,222,128,0.12),transparent_24%)]" />
        <div className="relative mx-auto max-w-[2400px]">
          <header className="flex h-16 items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Layers3 className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold tracking-[0.18em]">KUBIKA SYSTEM</span>
            </Link>
            <nav className="hidden items-center gap-5 lg:flex">
              <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Home</Link>
              <Link to="/platform" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Platform</Link>
              <Link to="/operations" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Operations</Link>
              <Link to="/trust" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Security</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/" className="lg:hidden">
                <Button variant="ghost" size="sm" className="gap-1 px-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm" className="hidden bg-white/70 dark:bg-white/8 sm:inline-flex">Log in</Button>
                <Button variant="outline" size="icon" className="h-9 w-9 bg-white/70 dark:bg-white/8 sm:hidden">
                  <span className="text-xs font-semibold">In</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                  <span className="hidden sm:inline">Start free</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </Link>
            </div>
          </header>

          <div className="pricing-hero grid gap-10 py-10 sm:py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-end xl:gap-16 xl:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Subscription Pricing
              </div>
              <h1 className="pricing-hero__title mt-6 text-[clamp(2.75rem,5.5vw,5rem)] font-bold leading-[1.02] tracking-tight">
                <span className="bg-gradient-to-r from-slate-950 via-cyan-700 to-emerald-600 bg-clip-text text-transparent dark:from-white dark:via-cyan-300 dark:to-emerald-400">
                  Scale your
                </span>
                <br />
                <span className="text-slate-950 dark:text-white">operations</span>
                <span className="bg-gradient-to-r from-cyan-600 to-emerald-500 bg-clip-text text-transparent">.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">
                No per-seat fees. No hidden charges. Pick the modules your business actually needs and grow into the next tier when you are ready.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(plans.length > 0 ? [
                { value: String(plans.length), label: 'Plans available' },
                { value: String(moduleMatrix.length), label: 'Modules available' },
                { value: '0%', label: 'Hidden fees ever' }
              ] : [
                { value: '3', label: 'Plans available' },
                { value: '12+', label: 'Modules available' },
                { value: '0%', label: 'Hidden fees ever' }
              ]).map((metric) => (
                <div key={metric.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400" />
                  <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white 2xl:text-5xl">{metric.value}</p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="pricing-main px-4 pb-20 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {loading ? (
          <div className="pricing-grid mx-auto grid max-w-[2400px] gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex h-[520px] items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 sm:h-[600px] 2xl:h-[680px]">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ))}
          </div>
        ) : (
          <div className="pricing-grid mx-auto grid max-w-[2400px] gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {uiPlans.map((plan) => (
              <article
                key={plan.key}
                className={`relative flex min-h-[560px] flex-col overflow-hidden rounded-lg border bg-white p-5 shadow-sm dark:bg-white/[0.04] sm:min-h-[600px] sm:p-6 2xl:p-10 ${
                  plan.featured
                    ? 'border-slate-950 shadow-2xl shadow-cyan-900/10 dark:border-cyan-300/60'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${plan.accent}`} />
                {plan.featured && (
                  <div className="absolute right-4 top-4 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                    Most popular
                  </div>
                )}
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <plan.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300 2xl:text-base">{plan.badge}</p>
                <h2 className="mt-2 text-2xl font-semibold 2xl:text-3xl">{plan.name}</h2>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight sm:text-5xl 2xl:text-6xl">{plan.priceAmount}</span>
                  <span className="text-base font-medium text-slate-500 dark:text-slate-400 sm:text-lg 2xl:text-2xl">{plan.pricePeriod}</span>
                </div>
                <p className="mt-5 min-h-[48px] text-sm leading-6 text-slate-600 dark:text-slate-300 2xl:text-base 2xl:leading-7">{plan.summary}</p>

                <div className="mt-6 space-y-5 border-t border-slate-200 pt-5 dark:border-white/10">
                  {plan.groups.map((group) => (
                    <section key={group.title}>
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{group.title}</h3>
                      <div className="mt-3 grid gap-2">
                        {group.items.map((item) => {
                          const Icon = featureIcon(item);
                          return (
                            <div key={`${group.title}-${item}`} className="flex gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 2xl:text-base">
                              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                              <span>{item}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>

                <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
                  {plan.includedPills.map(({ label, tone, Icon }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold ${
                        tone === 'ai'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6">
                  <Link to="/register">
                    <Button className={`h-11 w-full ${plan.featured ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                      {plan.buttonLabel}
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && moduleMatrix.length > 0 && (
        <section className="mx-auto mt-10 max-w-[2400px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Module matrix</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">What unlocks at each level</h2>
              </div>
              <div className="flex gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {uiPlans.map((plan) => (
                  <span key={plan.key} className="rounded-full border border-slate-200 px-3 py-1 dark:border-white/10">{plan.key}</span>
                ))}
              </div>
            </div>

            <div className="pricing-matrix mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {moduleMatrix.map((module) => (
                <div key={module.key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm dark:bg-slate-950 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">{module.title}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {tierKeys.map((tier) => (
                      <span
                        key={tier}
                        className={`grid h-7 w-9 place-items-center rounded-md text-[11px] font-bold ${
                          module.tiers.includes(tier)
                            ? 'bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950'
                            : 'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-600'
                        }`}
                      >
                        {tier.slice(0, 2)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto mt-10 grid max-w-[2400px] gap-5 lg:grid-cols-[1fr_0.62fr] 2xl:gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Need a different setup for each branch?</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Every tier maps to real modules in the system. You can mix permissions by branch, assign roles per user, and adjust access without touching the core configuration.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 p-8 text-white dark:bg-white dark:text-slate-950">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-emerald-400 dark:bg-slate-100 dark:text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-2xl font-bold tracking-tight">No hidden fees</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300 dark:text-slate-600">
              The price covers the modules listed. No per-user charges, no transaction fees. You can move between tiers or cancel at any time.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
