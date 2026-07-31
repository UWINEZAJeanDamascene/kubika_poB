import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShieldAlert as QuarantineIcon,
  ShieldCheck as UnquarantineIcon,
  RefreshCw as RefreshIcon,
  Boxes,
} from 'lucide-react';
import { EmptyState } from '@/app/components/EmptyState';
import { stockBatchApi, StockBatch, warehousesApi } from '@/lib/api';
import { API_BASE_URL } from '@/lib/apiBase';
import { Layout } from '../layout/Layout';

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

export default function BatchesPage() {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark());

  // Pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [quarantinedFilter, setQuarantinedFilter] = useState<'' | 'true' | 'false'>('');
  const [expiryFilter, setExpiryFilter] = useState('');

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load products for filter
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/products?limit=1000`,
          { credentials: 'include' }
        );
        const data = await response.json();
        if (data.success && data.data) {
          setProducts(data.data);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    loadProducts();
  }, []);

  // Load warehouses for filter
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const response = await warehousesApi.getAll({});
        if (response.success && (response as any).data) {
          const warehousesData = Array.isArray((response as any).data)
            ? (response as any).data
            : [];
          setWarehouses(warehousesData);
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    loadWarehouses();
  }, []);

  // Load batches
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit,
      };

      if (search) params.search = search;
      if (productFilter) params.product = productFilter;
      if (warehouseFilter) params.warehouse = warehouseFilter;

      const response = await stockBatchApi.getAll(params);

      if (response.success && response.data) {
        let filteredBatches = response.data;

        // Client-side filtering for isQuarantined (backend doesn't support this filter)
        if (quarantinedFilter !== '') {
          filteredBatches = filteredBatches.filter(
            (b) => String(b.isQuarantined) === quarantinedFilter
          );
        }

        // Client-side filtering for expiry_before (backend doesn't support this filter)
        if (expiryFilter) {
          const expiryDate = new Date(expiryFilter);
          filteredBatches = filteredBatches.filter((b) => {
            if (!b.expiryDate) return false;
            return new Date(b.expiryDate) <= expiryDate;
          });
        }

        setBatches(filteredBatches);
        setTotal(response.pagination?.total || filteredBatches.length);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page, limit, search, productFilter, warehouseFilter]);

  // Handle page change
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Toggle quarantine
  const handleToggleQuarantine = async (batchId: string) => {
    setUpdating(batchId);
    try {
      const response = await stockBatchApi.toggleQuarantine(batchId);
      if (response.success) {
        // Update the batch in the list
        setBatches((prev) =>
          prev.map((b) =>
            b._id === batchId ? { ...b, isQuarantined: response.data.isQuarantined } : b
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle quarantine:', err);
    } finally {
      setUpdating(null);
    }
  };

  // Format date
  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return '-';
    try {
      const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString();
    } catch {
      return '-';
    }
  };

// Check if batch is expired
  const isExpired = (expiryDate?: string | Date | null) => {
    if (!expiryDate) return false;
    try {
      const date = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
      return date < new Date();
    } catch {
      return false;
    }
  };

  // Check if batch is nearing expiry (within 30 days)
  const isNearingExpiry = (expiryDate?: string | Date | null) => {
    if (!expiryDate) return false;
    
    try {
      const date = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      return date <= thirtyDaysFromNow && date > new Date();
    } catch {
      return false;
    }
  };

  const toNum = (value?: string | number | null) => {
    if (value == null) return 0;
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalQty = batches.reduce((sum, batch) => sum + toNum(batch.qtyOnHand), 0);
  const totalValue = batches.reduce((sum, batch) => sum + (toNum(batch.qtyOnHand) * toNum(batch.unitCost)), 0);
  const quarantinedCount = batches.filter((batch) => batch.isQuarantined).length;
  const expiryRiskCount = batches.filter((batch) => isExpired(batch.expiryDate) || isNearingExpiry(batch.expiryDate)).length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Box sx={{ p: { xs: 2, sm: 3 } }} className="dark:text-white">
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Typography variant="h5" component="h1" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 850 }}>
                  {t('common.batches.title', 'Batches')}
                </Typography>
                <Typography variant="body2" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>
                  {t('common.batches.subtitle')}
                </Typography>
              </div>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon size={18} />}
                onClick={fetchBatches}
                sx={{ borderColor: dark ? '#475569' : '#cbd5e1', color: dark ? '#e2e8f0' : '#334155' }}
              >
                {t('common.refresh', 'Refresh')}
              </Button>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {[
              [t('common.batches.batchesInView'), total.toLocaleString(), t('common.batches.loadedCount', { count: batches.length })],
              [t('common.batches.quantityOnHand'), totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 }), t('common.batches.acrossFilters')],
              [t('common.batches.batchValue'), `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, t('common.batches.qtyTimesCost')],
              [t('common.batches.expiryQuarantineRisk'), `${expiryRiskCount + quarantinedCount}`, t('common.batches.expiryQuarantineDetail', { expiry: expiryRiskCount, quarantine: quarantinedCount })],
            ].map(([label, value, sub]) => (
              <Paper key={label} sx={{ p: 2.75, backgroundColor: dark ? '#111827' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 800 }}>
                  {label}
                </Typography>
                <Typography variant="h5" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 850, mt: 1 }}>
                  {value}
                </Typography>
                <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>{sub}</Typography>
              </Paper>
            ))}
          </div>

          {/* Filters */}
          <Paper sx={{ p: 2.5, mb: 3, backgroundColor: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <TextField
                placeholder={t('common.batches.searchBatch') || 'Search batch...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{
                  minWidth: 220,
                  '& .MuiInputBase-root': { backgroundColor: dark ? '#0f172a' : 'white', color: dark ? '#e2e8f0' : '#0f172a' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#334155' : '#cbd5e1' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon size={18} className="dark:text-slate-400" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Product Filter */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel sx={{ color: dark ? '#94a3b8' : '#64748b' }}>{t('common.batches.product', 'Product')}</InputLabel>
                <Select
                  value={productFilter}
                  label={t('common.batches.product', 'Product')}
                  onChange={(e) => setProductFilter(e.target.value)}
                  sx={{ backgroundColor: dark ? '#0f172a' : 'white', color: dark ? '#e2e8f0' : '#0f172a', '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#334155' : '#cbd5e1' } }}
                  MenuProps={{
                    PaperProps: {
                      className: 'dark:!bg-slate-800 dark:!border-slate-700'
                    }
                  }}
                >
                  <MenuItem value="" className="dark:text-white">{t('common.all', 'All')}</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p._id} value={p._id} className="dark:text-white">
                      {p.name} ({p.sku})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Warehouse Filter */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel sx={{ color: dark ? '#94a3b8' : '#64748b' }}>{t('common.batches.warehouse', 'Warehouse')}</InputLabel>
                <Select
                  value={warehouseFilter}
                  label={t('common.batches.warehouse', 'Warehouse')}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  sx={{ backgroundColor: dark ? '#0f172a' : 'white', color: dark ? '#e2e8f0' : '#0f172a', '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#334155' : '#cbd5e1' } }}
                  MenuProps={{
                    PaperProps: {
                      className: 'dark:!bg-slate-800 dark:!border-slate-700'
                    }
                  }}
                >
                  <MenuItem value="" className="dark:text-white">{t('common.all', 'All')}</MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w._id} value={w._id} className="dark:text-white">
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Quarantined Filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ color: dark ? '#94a3b8' : '#64748b' }}>{t('common.batches.quarantined', 'Quarantined')}</InputLabel>
                <Select
                  value={quarantinedFilter}
                  label={t('common.batches.quarantined', 'Quarantined')}
                  onChange={(e) => setQuarantinedFilter(e.target.value as '' | 'true' | 'false')}
                  sx={{ backgroundColor: dark ? '#0f172a' : 'white', color: dark ? '#e2e8f0' : '#0f172a', '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#334155' : '#cbd5e1' } }}
                  MenuProps={{
                    PaperProps: {
                      className: 'dark:!bg-slate-800 dark:!border-slate-700'
                    }
                  }}
                >
                  <MenuItem value="" className="dark:text-white">{t('common.all', 'All')}</MenuItem>
                  <MenuItem value="true" className="dark:text-white">{t('common.yes', 'Yes')}</MenuItem>
                  <MenuItem value="false" className="dark:text-white">{t('common.no', 'No')}</MenuItem>
                </Select>
              </FormControl>

              {/* Expiry Before Filter */}
              <TextField
                type="date"
                label={t('common.batches.expiryBefore', 'Expiry Before')}
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                size="small"
                sx={{
                  minWidth: 180,
                  '& .MuiInputBase-root': { backgroundColor: dark ? '#0f172a' : 'white', color: dark ? '#e2e8f0' : '#0f172a' },
                  '& .MuiInputLabel-root': { color: dark ? '#94a3b8' : '#64748b' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#334155' : '#cbd5e1' },
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Paper>

          <Paper sx={{ backgroundColor: dark ? '#111827' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
              <Typography variant="subtitle1" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 850 }}>Batch Register</Typography>
              <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>Operational batch cards with expiry, quarantine, value, and warehouse context.</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}>
                  <CircularProgress />
                </Box>
              ) : batches.length === 0 ? (
                <EmptyState
                  compact
                  icon={Boxes}
                  title={t('common.batches.noBatches', 'No batches yet')}
                  description={t('common.batches.noBatchesHint', 'Received batch lots will appear here with expiry tracking and quarantine controls.')}
                />
              ) : (
                <div className="grid gap-3">
                  {batches.map((batch) => {
                    const expired = isExpired(batch.expiryDate);
                    const expiringSoon = isNearingExpiry(batch.expiryDate);
                    const batchValue = toNum(batch.qtyOnHand) * toNum(batch.unitCost);
                    return (
                      <div
                        key={batch._id}
                        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-blue-800 lg:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{batch.batchNo}</span>
                            {batch.isQuarantined && <Chip icon={<QuarantineIcon size={14} />} label={t('common.batches.quarantined', 'Quarantined')} color="error" size="small" />}
                          </div>
                          <p className="mt-2 truncate text-sm font-bold text-slate-950 dark:text-white">{batch.product?.name || '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{batch.product?.sku || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Warehouse</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{batch.warehouse?.name || '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{batch.warehouse?.code || '-'}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">On Hand</p>
                          <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{toNum(batch.qtyOnHand).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">${toNum(batch.unitCost).toFixed(6)} unit cost</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Expiry</p>
                          <p className={`mt-1 text-sm font-bold ${expired ? 'text-red-500' : expiringSoon ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                            {formatDate(batch.expiryDate)}
                          </p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Mfg {formatDate(batch.manufactureDate)}</p>
                          {(expired || expiringSoon) && (
                            <Chip label={expired ? t('common.batches.expired', 'Expired') : t('common.batches.expiringSoon', 'Expiring Soon')} color={expired ? 'error' : 'warning'} size="small" sx={{ mt: 1 }} />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                          <div className="text-left lg:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Value</p>
                            <p className="mt-1 font-mono text-sm font-bold text-slate-950 dark:text-white">${batchValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleQuarantine(batch._id)}
                            disabled={updating === batch._id}
                            title={batch.isQuarantined ? t('common.batches.unquarantine', 'Remove Quarantine') : t('common.batches.quarantine', 'Quarantine')}
                            sx={{ border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`, color: dark ? '#e2e8f0' : '#334155' }}
                          >
                            {updating === batch._id ? <CircularProgress size={18} /> : batch.isQuarantined ? <UnquarantineIcon size={18} /> : <QuarantineIcon size={18} />}
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Box>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={total}
              rowsPerPage={limit}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                backgroundColor: dark ? '#0f172a' : '#f8fafc',
                color: dark ? '#e2e8f0' : '#334155',
                borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
              }}
            />
          </Paper>
        </Box>
      </div>
    </Layout>
  );
}
