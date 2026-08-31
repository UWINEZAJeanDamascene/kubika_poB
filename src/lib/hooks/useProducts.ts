import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';

/**
 * Product / stock-level queries.
 *
 * These replace the useEffect + axios pattern used across the app. The win is
 * not fewer lines — it is that returning to a screen paints from cache instead
 * of waiting on a round-trip, that two components asking for the same page
 * share one request, and that paging no longer blanks the table.
 */

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...productKeys.lists(), params] as const,
  stockLevels: (params: Record<string, unknown>) =>
    [...productKeys.all, 'stock-levels', params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export interface ProductStock {
  _id: string;
  sku: string;
  name: string;
  category?: { _id: string; name: string };
  unit: string;
  currentStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  lowStockThreshold: number;
  defaultWarehouse?: { _id: string; name: string };
  isActive: boolean;
}

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Map a raw product row into the stock-level shape the table renders. */
export function toProductStock(product: Record<string, any>): ProductStock {
  const currentStock = toNumber(product.currentStock);
  const reservedQuantity = toNumber(product.reservedQuantity);
  const avgCost = toNumber(product.averageCost);
  const costPrice = toNumber(product.costPrice);
  const effectiveCost = avgCost > 0 ? avgCost : costPrice;

  return {
    _id: product._id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit || 'pcs',
    currentStock,
    reservedQuantity,
    availableQuantity: Math.max(currentStock - reservedQuantity, 0),
    averageCost: effectiveCost,
    totalValue: currentStock * effectiveCost,
    lowStockThreshold: toNumber(product.lowStockThreshold) || 10,
    defaultWarehouse: product.defaultWarehouse,
    isActive: product.isActive !== false,
  };
}

export interface StockLevelsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export interface StockLevelsResult {
  items: ProductStock[];
  total: number;
}

/**
 * Paginated stock levels.
 *
 * `staleTime` is 60s, matching the backend's stock cache: fine for browsing.
 * Anything about to transact against these numbers (POS, GRN, stock issue)
 * must read live instead — pass `staleTime: 0` on that query.
 */
export function useStockLevels(params: StockLevelsParams) {
  const query = useQuery({
    queryKey: productKeys.stockLevels(params as unknown as Record<string, unknown>),
    queryFn: async (): Promise<StockLevelsResult> => {
      const request: Record<string, unknown> = {
        page: params.page,
        limit: params.limit,
        isArchived: false,
        forStockLevels: '1',
      };
      if (params.search) request.search = params.search;
      if (params.status) request.status = params.status;

      const response = await productsApi.getAll(request as any);
      if (!response || !response.success) {
        throw new Error('Failed to fetch stock levels');
      }

      const rows = ((response.data as any[]) || []).map(toProductStock);
      const pagination = response.pagination as Record<string, any> | undefined;
      return {
        items: rows,
        total: pagination && typeof pagination === 'object'
          ? (pagination.total ?? rows.length)
          : rows.length,
      };
    },
    staleTime: 60 * 1000,
    // Hold the previous page on screen while the next one loads, instead of
    // flashing an empty table on every page change.
    placeholderData: keepPreviousData,
  });

  return query;
}

/** Invalidate every product-derived cache after a write. */
export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all });
}
