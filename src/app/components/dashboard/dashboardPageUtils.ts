import { formatDashboardDelta, formatDashboardPercent } from "@/lib/dashboardMetrics";

export function formatDashboardDateTime(value?: string | Date | null): string {
  if (!value) return "Not updated yet";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDashboardDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDashboardError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("no token") || lower.includes("not authorized")) {
    return "Your session expired or you are not signed in. Please log in again and retry.";
  }
  if (lower.includes("403") || lower.includes("forbidden") || lower.includes("permission")) {
    return "You do not have permission to view this dashboard. Ask an admin for Reports access.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return message || "Failed to load dashboard data.";
}

export function computeProfitMarginPercent(revenue: number, profit: number): number | null {
  if (revenue === 0) return null;
  return (profit / revenue) * 100;
}

export function formatHeroProfitValue(
  revenue: number,
  profit: number,
  formatCurrency: (value: number) => string,
): string {
  if (revenue === 0) {
    return formatCurrency(profit);
  }
  const margin = computeProfitMarginPercent(revenue, profit);
  return formatDashboardPercent(margin ?? 0, { decimals: 1 });
}

export function formatHeroCashValue(
  revenue: number,
  cashBalance: number,
  formatCurrency: (value: number) => string,
): string {
  if (revenue === 0) {
    return formatCurrency(cashBalance);
  }
  return formatDashboardPercent((cashBalance / revenue) * 100);
}

export function formatProfitMargin(revenue: number, profit: number): string {
  const margin = computeProfitMarginPercent(revenue, profit);
  if (margin !== null) {
    return formatDashboardPercent(margin, { decimals: 1 });
  }
  return formatDashboardPercent(0, { decimals: 1 });
}

export function formatExpenseLoad(revenue: number, expenses: number, formatCurrency: (value: number) => string): string {
  if (revenue === 0) {
    return formatCurrency(expenses);
  }
  return formatDashboardPercent((Math.abs(expenses) / Math.abs(revenue)) * 100);
}

export function formatCashToRevenueRatio(revenue: number, cashBalance: number, formatCurrency: (value: number) => string): string {
  if (revenue === 0) {
    return formatCurrency(cashBalance);
  }
  return formatDashboardPercent((cashBalance / revenue) * 100);
}

export function formatMetricComparison(
  current: number,
  change: number | null | undefined,
  labels: { newActivity: string; noComparison: string },
): string {
  if (change !== null && change !== undefined && Number.isFinite(change)) {
    return formatDashboardDelta(change);
  }
  if (Math.abs(current) > 0.0001) {
    return labels.newActivity;
  }
  return labels.noComparison;
}

const JOURNAL_SOURCE_LABELS: Record<string, string> = {
  petty_cash_expense: "Petty cash expense",
  petty_cash_float_opening: "Petty cash opening",
  petty_cash_topup: "Petty cash top-up",
  petty_cash_replenishment: "Petty cash replenishment",
  payment_received: "Payment received",
  credit_note: "Credit note",
  invoice: "Invoice",
  sales_invoice: "Sales invoice",
  cogs: "Cost of goods sold",
  purchase: "Purchase",
  expense: "Expense",
  opening_balance: "Opening balance",
  journal: "Manual journal",
  bank_transfer: "Bank transfer",
  payroll: "Payroll",
  loan_repayment: "Loan repayment",
};

export function formatJournalSourceType(sourceType?: string | null): string {
  if (!sourceType) return "Journal";
  const normalized = sourceType.toLowerCase();
  return JOURNAL_SOURCE_LABELS[normalized] ?? sourceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatJournalDescription(description?: string | null): string {
  if (!description) return "";
  return description.replace(/\bPatty Cash\b/gi, "Petty Cash").trim();
}
