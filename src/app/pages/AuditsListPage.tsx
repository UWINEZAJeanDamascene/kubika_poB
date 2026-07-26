import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Paper,
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Chip,
  TablePagination,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Plus as PlusIcon,
  Eye as EyeIcon,
  CheckCircle as CheckCircleIcon,
  ClipboardList as ClipboardListIcon,
  FilterX as FilterXIcon,
} from 'lucide-react';
import { EmptyState } from '@/app/components/EmptyState';
import { stockAuditApi, StockAudit, warehousesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default',
  counting: 'warning',
  posted: 'success',
  cancelled: 'error',
};

export default function AuditsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [audits, setAudits] = useState<StockAudit[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<StockAudit | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark());

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load warehouses
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

  // Load audits
  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await stockAuditApi.getAll(params);
      if (response.success) {
        setAudits(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: response.total || 0,
          pages: response.pages || 0,
        }));
      } else {
        setError(t('common.stockAudits.loadError'));
      }
    } catch (err) {
      console.error('Failed to load audits:', err);
      setError(t('common.stockAudits.loadError'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, warehouseFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  // Handle page change
  const handlePageChange = (_: unknown, newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage + 1 }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination((prev) => ({ ...prev, limit: parseInt(event.target.value, 10), page: 1 }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setStatusFilter('');
    setWarehouseFilter('');
    setDateFrom('');
    setDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle view action
  const handleView = (audit: StockAudit) => {
    navigate(`/stock-audits/${audit._id}`);
  };

  // Handle post action
  const handlePostClick = (audit: StockAudit) => {
    setSelectedAudit(audit);
    setPostDialogOpen(true);
  };

  // Confirm post
  const handleConfirmPost = async () => {
    if (!selectedAudit) return;

    setPostLoading(true);
    try {
      const response = await stockAuditApi.post(selectedAudit._id);
      if (response.success) {
        setPostDialogOpen(false);
        setSelectedAudit(null);
        loadAudits();
      } else {
        setError(response.message || t('common.stockAudits.postError'));
      }
    } catch (err) {
      console.error('Failed to post audit:', err);
      setError(t('common.stockAudits.postError'));
    } finally {
      setPostLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  // Check if has active filters
  const hasActiveFilters = statusFilter || warehouseFilter || dateFrom || dateTo;
  const auditCounts = audits.reduce(
    (acc, audit) => {
      acc[audit.status] = (acc[audit.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalVariance = audits.reduce((sum, audit) => sum + (parseFloat(audit.totalVarianceValue || '0') || 0), 0);
  const fieldSx = {
    '& .MuiInputBase-root': {
      backgroundColor: dark ? '#0f172a' : 'white',
      color: dark ? '#e2e8f0' : '#1e293b',
    },
    '& .MuiInputLabel-root': {
      color: dark ? '#94a3b8' : '#64748b',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: dark ? '#334155' : '#cbd5e1',
    },
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Box sx={{ p: { xs: 2, sm: 3 } }} className="dark:text-white">
          {/* Header - Responsive */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: { sm: 'space-between' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ClipboardListIcon size={24} className="dark:text-white flex-shrink-0" />
              <Typography variant="h5" component="h1" className="dark:text-white text-xl sm:text-2xl">
                {t('common.stockAudits.title')}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<PlusIcon />}
              onClick={() => navigate('/stock-audits/new')}
            >
              {t('common.stockAudits.newAudit')}
            </Button>
          </Box>

          <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {[
              { label: 'Audits in View', value: pagination.total || audits.length, detail: 'Current filtered register' },
              { label: t('common.stockAudits.statuses.counting'), value: auditCounts.counting || 0, detail: 'Open counts awaiting posting' },
              { label: t('common.stockAudits.statuses.posted'), value: auditCounts.posted || 0, detail: 'Completed audit records' },
              { label: t('common.stockAudits.totalVarianceValue'), value: formatCurrency(String(totalVariance)), detail: 'Net variance in view' },
            ].map((metric) => (
              <Paper key={metric.label} sx={{ p: 3, backgroundColor: dark ? '#111827' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none' }}>
                <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{metric.label}</Typography>
                <Typography variant="h5" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 700, mt: 1 }}>{metric.value}</Typography>
                <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>{metric.detail}</Typography>
              </Paper>
            ))}
          </div>

          {/* Filters */}
          <Paper sx={{ p: 3, mb: 3, backgroundColor: dark ? '#111827' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150, ...fieldSx }}>
                <InputLabel className="dark:text-slate-400">{t('common.stockAudits.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('common.stockAudits.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  MenuProps={{
                    PaperProps: {
                      className: 'dark:!bg-slate-800 dark:!border-slate-700'
                    }
                  }}
                >
                  <MenuItem value="" className="dark:text-white">{t('common.all')}</MenuItem>
                  <MenuItem value="draft" className="dark:text-white">{t('common.stockAudits.statuses.draft')}</MenuItem>
                  <MenuItem value="counting" className="dark:text-white">{t('common.stockAudits.statuses.counting')}</MenuItem>
                  <MenuItem value="posted" className="dark:text-white">{t('common.stockAudits.statuses.posted')}</MenuItem>
                  <MenuItem value="cancelled" className="dark:text-white">{t('common.stockAudits.statuses.cancelled')}</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180, ...fieldSx }}>
                <InputLabel className="dark:text-slate-400">{t('common.stockAudits.warehouse')}</InputLabel>
                <Select
                  value={warehouseFilter}
                  label={t('common.stockAudits.warehouse')}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  MenuProps={{
                    PaperProps: {
                      className: 'dark:!bg-slate-800 dark:!border-slate-700'
                    }
                  }}
                >
                  <MenuItem value="" className="dark:text-white">{t('common.all')}</MenuItem>
                  {warehouses.map((wh) => (
                    <MenuItem key={wh._id} value={wh._id} className="dark:text-white">
                      {wh.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                type="date"
                size="small"
                label={t('common.stockAudits.dateFrom')}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160, ...fieldSx }}
                className="dark:text-white"
              />

              <TextField
                type="date"
                size="small"
                label={t('common.stockAudits.dateTo')}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160, ...fieldSx }}
                className="dark:text-white"
              />

              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterXIcon size={16} />}
                  onClick={handleClearFilters}
                  className="dark:border-slate-600 dark:text-white"
                >
                  {t('common.clearFilters')}
                </Button>
              )}
            </Box>
          </Paper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Paper sx={{ backgroundColor: dark ? '#111827' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
              <Typography variant="subtitle1" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 850 }}>Audit Register</Typography>
              <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>
                Cycle counts, variance exposure, posting status, warehouse scope, and review actions.
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}>
                  <CircularProgress />
                </Box>
              ) : audits.length === 0 ? (
                <EmptyState
                  compact
                  icon={ClipboardListIcon}
                  title={t('common.stockAudits.noAudits', 'No stock audits yet')}
                  description={t('common.stockAudits.noAuditsHint', 'Create an audit to compare system stock with physical count and track variances.')}
                />
              ) : (
                <div className="grid gap-3">
                  {audits.map((audit) => {
                    const variance = parseFloat(audit.totalVarianceValue || '0') || 0;
                    return (
                      <div
                        key={audit._id}
                        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-blue-800 lg:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_auto]"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-black text-slate-950 dark:text-white">{audit.referenceNo}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('common.stockAudits.auditDate')}: {formatDate(audit.auditDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('common.stockAudits.warehouse')}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{audit.warehouse?.name || '-'}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('common.stockAudits.postedBy')}: {audit.postedBy?.name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('common.stockAudits.status')}</p>
                          <Chip
                            label={t(`common.stockAudits.statuses.${audit.status}`)}
                            color={STATUS_COLORS[audit.status] || 'default'}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </div>
                        <div className="rounded-md bg-slate-50 p-3 text-right dark:bg-slate-900">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('common.stockAudits.totalVarianceValue')}</p>
                          <p className={`mt-1 font-mono text-lg font-black ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-emerald-500' : 'text-slate-950 dark:text-white'}`}>
                            {formatCurrency(audit.totalVarianceValue)}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <IconButton
                            size="small"
                            onClick={() => handleView(audit)}
                            title={t('common.view')}
                            sx={{ border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`, color: dark ? '#e2e8f0' : '#334155' }}
                          >
                            <EyeIcon size={18} />
                          </IconButton>
                          {audit.status === 'counting' && (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handlePostClick(audit)}
                              title={t('common.stockAudits.post')}
                              sx={{ border: `1px solid ${dark ? '#14532d' : '#bbf7d0'}` }}
                            >
                              <CheckCircleIcon size={18} />
                            </IconButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Box>
              <TablePagination
                component="div"
                count={pagination.total}
                page={pagination.page - 1}
                onPageChange={handlePageChange}
                rowsPerPage={pagination.limit}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{
                  backgroundColor: dark ? '#0f172a' : '#f8fafc',
                  color: dark ? '#e2e8f0' : '#334155',
                  borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                }}
              />
            </Paper>

          {/* Post Confirmation Dialog */}
          <Dialog open={postDialogOpen} onClose={() => setPostDialogOpen(false)}>
            <DialogTitle>{t('common.stockAudits.postConfirmTitle')}</DialogTitle>
            <DialogContent>
              <Typography>
                {t('common.stockAudits.postConfirmMessage', {
                  reference: selectedAudit?.referenceNo,
                  variance: formatCurrency(selectedAudit?.totalVarianceValue || '0'),
                })}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPostDialogOpen(false)} disabled={postLoading}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleConfirmPost}
                variant="contained"
                color="success"
                disabled={postLoading}
              >
                {postLoading ? <CircularProgress size={20} /> : t('common.stockAudits.post')}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </div>
    </Layout>
  );
}
