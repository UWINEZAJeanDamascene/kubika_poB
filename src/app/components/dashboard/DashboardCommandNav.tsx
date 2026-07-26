import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  ShoppingCart,
  PieChart,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";

const COMMAND_DASHBOARDS = [
  { href: "/dashboard", nameKey: "nav.dashboard", shortKey: "nav.dashboardShort", icon: LayoutDashboard },
  { href: "/dashboard/inventory", nameKey: "nav.inventoryDashboard", shortKey: "nav.inventoryShort", icon: Boxes },
  { href: "/dashboard/sales", nameKey: "nav.salesDashboard", shortKey: "nav.salesShort", icon: TrendingUp },
  { href: "/dashboard/purchases", nameKey: "nav.purchaseDashboard", shortKey: "nav.purchasesShort", icon: ShoppingCart },
  { href: "/dashboard/finance", nameKey: "nav.financeDashboard", shortKey: "nav.financeShort", icon: PieChart },
] as const;

export function DashboardCommandNav({ className }: { className?: string }) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm dark:border-white/10 dark:bg-slate-950/90",
        className,
      )}
      aria-label="Command dashboards"
    >
      {COMMAND_DASHBOARDS.map((item) => {
        const active =
          location.pathname === item.href ||
          (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            to={item.href}
            title={t(item.nameKey)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t(item.shortKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
