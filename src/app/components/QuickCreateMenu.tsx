import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Plus,
  Package,
  FileText,
  Receipt,
  ShoppingCart,
  ClipboardList,
  Users,
  Building2,
  Truck,
  CreditCard,
  ArrowRightLeft,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
}

interface QuickGroup {
  label: string;
  items: QuickAction[];
}

const GROUPS: QuickGroup[] = [
  {
    label: 'Sales',
    items: [
      { label: 'Invoice', href: '/invoices/new', icon: FileText },
      { label: 'Quotation', href: '/quotations/new', icon: FileText },
      { label: 'Sales Order', href: '/sales-orders/create', icon: ShoppingCart },
      { label: 'Delivery Note', href: '/delivery-notes/new', icon: Truck },
      { label: 'Client', href: '/clients/new', icon: Users },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { label: 'Purchase Order', href: '/purchase-orders/new', icon: ClipboardList },
      { label: 'Purchase', href: '/purchases/new', icon: ShoppingCart },
      { label: 'GRN', href: '/grn/new', icon: Truck },
      { label: 'Purchase Return', href: '/purchase-returns/new', icon: ArrowRightLeft },
      { label: 'Supplier', href: '/suppliers/new', icon: Building2 },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Product', href: '/products/new', icon: Package },
      { label: 'Stock Transfer', href: '/stock-transfers/new', icon: ArrowRightLeft },
      { label: 'Stock Audit', href: '/stock-audits/new', icon: ClipboardList },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Expense', href: '/expenses/new', icon: Receipt },
      { label: 'Receipt (AR)', href: '/ar-receipts', icon: Receipt },
      { label: 'Payment (AP)', href: '/ap-payments', icon: CreditCard },
      { label: 'Journal Entry', href: '/journal', icon: BookOpen },
    ],
  },
];

interface QuickCreateMenuProps {
  compact?: boolean; // icon-only on mobile
}

export function QuickCreateMenu({ compact = false }: QuickCreateMenuProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            compact
              ? 'flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
              : 'flex h-10 min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
          }
          title="Create new"
          aria-label="Create new"
        >
          <Plus className="h-4 w-4" />
          {!compact && <span>New</span>}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="max-h-[min(34rem,calc(100vh-5.5rem))] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border-border bg-popover p-1 shadow-xl"
      >
        <div className="px-3 pb-2 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            Quick create
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Jump straight into a new record
          </div>
        </div>

        {GROUPS.map((g, gi) => (
          <div key={g.label}>
            {gi > 0 && <DropdownMenuSeparator className="my-1" />}
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <DropdownMenuItem
                    key={it.href + it.label}
                    onSelect={(e) => {
                      e.preventDefault();
                      navigate(it.href);
                    }}
                    className="group/qc-item flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground outline-none transition focus:bg-accent focus:text-accent-foreground"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-inset ring-border transition group-focus/qc-item:bg-primary group-focus/qc-item:text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{it.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default QuickCreateMenu;
