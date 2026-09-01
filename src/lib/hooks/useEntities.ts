import { useQuery } from '@tanstack/react-query';
import {
  clientsApi,
  suppliersApi,
  invoicesApi,
  productsApi,
  stockApi,
} from '@/lib/api';
import {
  useListQuery,
  useInvalidate,
  BROWSE_STALE_TIME,
} from './useListQuery';

/**
 * Query hooks for the main list screens.
 *
 * Query keys are namespaced per entity so a write can invalidate exactly that
 * entity — see the useInvalidate* helpers at the bottom.
 */

// ── Clients ─────────────────────────────────────────────────────────────
export interface ClientListParams {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  isActive?: boolean;
}

export function useClients(params: ClientListParams, enabled = true) {
  return useListQuery<any>({
    queryKey: ['clients', 'list', params],
    fetcher: () => clientsApi.getAll(params as any) as any,
    enabled,
  });
}

/** Picker list — small, reused on most transactional forms, so cached longer. */
export function useClientPicker(enabled = true) {
  return useListQuery<any>({
    queryKey: ['clients', 'picker'],
    fetcher: () => clientsApi.getAll({ limit: 100, isActive: true, forPicker: '1' } as any) as any,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

// ── Suppliers ───────────────────────────────────────────────────────────
export interface SupplierListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export function useSuppliers(params: SupplierListParams, enabled = true) {
  return useListQuery<any>({
    queryKey: ['suppliers', 'list', params],
    fetcher: () => suppliersApi.getAll(params as any) as any,
    enabled,
  });
}

export function useSupplierPicker(enabled = true) {
  return useListQuery<any>({
    queryKey: ['suppliers', 'picker'],
    fetcher: () => suppliersApi.getAll({ limit: 100, isActive: true, forPicker: '1' } as any) as any,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

// ── Invoices ────────────────────────────────────────────────────────────
export interface InvoiceListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}

export function useInvoices(params: InvoiceListParams, enabled = true) {
  return useListQuery<any>({
    queryKey: ['invoices', 'list', params],
    fetcher: () => invoicesApi.getAll(params as any) as any,
    enabled,
  });
}

// ── Products ────────────────────────────────────────────────────────────
export interface ProductListParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  supplier?: string;
  status?: string;
  isArchived?: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export function useProductList(params: ProductListParams, enabled = true) {
  return useListQuery<any>({
    queryKey: ['products', 'list', params],
    fetcher: () => productsApi.getAll(params as any) as any,
    enabled,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: async () => {
      const res = await productsApi.getById(id as string);
      if (!res || !res.success) throw new Error('Failed to load product');
      return res.data;
    },
    enabled: !!id,
    staleTime: BROWSE_STALE_TIME,
  });
}

// ── Stock movements ─────────────────────────────────────────────────────
export interface StockMovementParams {
  page: number;
  limit: number;
  product?: string;
  warehouse?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export function useStockMovements(params: StockMovementParams, enabled = true) {
  return useListQuery<any>({
    queryKey: ['stock', 'movements', params],
    fetcher: () => stockApi.getMovements(params as any) as any,
    enabled,
  });
}

// ── Invalidation helpers ────────────────────────────────────────────────
export const useInvalidateClients = () => useInvalidate('clients');
export const useInvalidateSuppliers = () => useInvalidate('suppliers');
export const useInvalidateInvoices = () => useInvalidate('invoices');
export const useInvalidateProducts = () => useInvalidate('products');
export const useInvalidateStock = () => useInvalidate('stock');
