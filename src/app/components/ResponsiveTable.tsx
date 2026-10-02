import { type ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface ResponsiveTableProps {
  /** Render this on screens >= xl (the actual <Table>...</Table>). */
  table: ReactNode;
  /** Render this on screens < xl (a vertical list of `<MobileCardRow>` items). */
  mobile: ReactNode;
  /** Apply a sticky first column on md+ (useful for wide tables). Default: true. */
  stickyFirstCol?: boolean;
  className?: string;
}

/**
 * Container that swaps between a wide-screen table and touch-friendly cards.
 *
 * @example
 * <ResponsiveTable
 *   table={<Table>...desktop columns...</Table>}
 *   mobile={items.map((item) => (
 *     <MobileCardRow
 *       key={item.id}
 *       title={item.name}
 *       subtitle={item.sku}
 *       fields={[{ label: 'Stock', value: item.qty }]}
 *       actions={<Button>Edit</Button>}
 *     />
 *   ))}
 * />
 */
export function ResponsiveTable({
  table,
  mobile,
  stickyFirstCol = true,
  className,
}: ResponsiveTableProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: stacked cards */}
      <div className="space-y-2 xl:hidden">{mobile}</div>

      {/* Desktop: scrollable table with optional sticky first column */}
      <div
        className={cn(
          'hidden xl:block overflow-x-auto rounded-lg bg-card shadow-sm',
          stickyFirstCol && '[&_table_th:first-child]:sticky [&_table_td:first-child]:sticky [&_table_th:first-child]:left-0 [&_table_td:first-child]:left-0 [&_table_th:first-child]:z-10 [&_table_td:first-child]:bg-inherit [&_table_th:first-child]:bg-muted',
        )}
      >
        {table}
      </div>
    </div>
  );
}

interface MobileCardRowProps {
  /** Primary heading (e.g. product name). */
  title: ReactNode;
  /** Sub-heading shown below the title (e.g. SKU, code, email). */
  subtitle?: ReactNode;
  /** Optional small status badge displayed at the top-right. */
  badge?: ReactNode;
  /** Key/value pairs displayed in a compact two-column grid. */
  fields?: Array<{ label: string; value: ReactNode }>;
  /** Actions row at the bottom (Edit / View / Delete buttons). */
  actions?: ReactNode;
  /** Make the card itself clickable (e.g. navigate to detail). */
  onClick?: () => void;
  className?: string;
}

/**
 * Card representation of a single table row on mobile.
 * Use inside the `mobile` slot of `<ResponsiveTable>`.
 */
export function MobileCardRow({
  title,
  subtitle,
  badge,
  fields,
  actions,
  onClick,
  className,
}: MobileCardRowProps) {
  const interactive = !!onClick;
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm transition',
        interactive &&
          'cursor-pointer hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/50',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </div>
          )}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      {fields && fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {fields.map((f, i) => (
            <div key={i} className="min-w-0">
              <dt className="text-slate-400 dark:text-slate-500">{f.label}</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {actions && (
        <div
          className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

export default ResponsiveTable;
