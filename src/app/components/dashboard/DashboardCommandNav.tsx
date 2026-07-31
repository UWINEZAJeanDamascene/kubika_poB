import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Boxes, TrendingUp, ShoppingCart, PieChart } from "lucide-react";
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
        "industrial-command-nav flex min-w-max gap-0 border-b border-(--dashboard-rule) bg-(--dashboard-paper)",
        className,
      )}
      aria-label="Command dashboards"
    >
      {COMMAND_DASHBOARDS.map((item) => {
        const active = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            to={item.href}
            title={t(item.nameKey)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-11 items-center gap-2 border-r border-(--dashboard-rule) px-3 text-xs font-semibold text-(--dashboard-muted) transition-colors first:border-l hover:bg-white hover:text-(--dashboard-ink) sm:px-4",
              active && "bg-white text-(--dashboard-ink)",
            )}
          >
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-(--dashboard-amber)" aria-hidden="true" />}
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-(--dashboard-blue-2)" : "text-(--dashboard-muted)")} aria-hidden="true" />
            <span>{t(item.shortKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
