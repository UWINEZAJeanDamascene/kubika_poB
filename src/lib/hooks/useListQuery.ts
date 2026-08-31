import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

/**
 * Shared plumbing for paginated list screens.
 *
 * Replaces the useEffect + axios + useState(loading/error/data) pattern that
 * ~204 files still use. The point is not fewer lines: it is that returning to a
 * screen paints from cache instead of waiting on a round-trip, two components
 * asking for the same page share one request, and paging no longer blanks the
 * table.
 *
 * STALENESS
 * `staleTime` defaults to 60s, matching the backend's stock/dashboard cache.
 * That is right for browsing. Any screen reading a number that is about to be
 * transacted against — POS, GRN, stock issue, transfers — must pass
 * `staleTime: 0` and read live. A stale quantity there lets someone commit
 * against stock that is already gone, which is worse than a slow page.
 */

export interface ListResult<T> {
  items: T[];
  total: number;
}

/** Shape every list endpoint in this API returns. */
interface ListResponse {
  success: boolean;
  data: unknown;
  pagination?: unknown;
}

export const BROWSE_STALE_TIME = 60 * 1000;
/** Reads that a write will immediately depend on. Never serve these from cache. */
export const TRANSACTIONAL_STALE_TIME = 0;

export function extractList<T>(
  response: ListResponse | undefined,
  map?: (row: any) => T,
): ListResult<T> {
  if (!response || !response.success) {
    throw new Error('Request failed');
  }
  const rows = (response.data as any[]) || [];
  const items = (map ? rows.map(map) : rows) as T[];
  const pagination = response.pagination as Record<string, any> | undefined;
  const total =
    pagination && typeof pagination === 'object'
      ? pagination.total ?? pagination.totalCount ?? items.length
      : items.length;
  return { items, total };
}

export interface ListQueryOptions<T> {
  queryKey: QueryKey;
  fetcher: () => Promise<ListResponse>;
  /** Row transform, applied once per row. */
  map?: (row: any) => T;
  staleTime?: number;
  enabled?: boolean;
}

export function useListQuery<T>({
  queryKey,
  fetcher,
  map,
  staleTime = BROWSE_STALE_TIME,
  enabled = true,
}: ListQueryOptions<T>) {
  const query = useQuery({
    queryKey,
    queryFn: async () => extractList<T>(await fetcher(), map),
    staleTime,
    enabled,
    // Hold the current page on screen while the next loads, instead of flashing
    // an empty table on every page change.
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    items: query.data?.items ?? ([] as T[]),
    total: query.data?.total ?? 0,
    /** True only on the first load; background refetches keep rows visible. */
    isInitialLoading: query.isPending,
  };
}

/** Invalidate every query under a top-level key after a write. */
export function useInvalidate(rootKey: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [rootKey] });
}
