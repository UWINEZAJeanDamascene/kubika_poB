import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel,
} from '@mui/material';
import {
  ArrowLeft as ArrowLeftIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  ClipboardList as ClipboardListIcon,
  AlertTriangle as AlertTriangleIcon,
} from 'lucide-react';
import { stockAuditApi, StockAudit, StockAuditLine } from '@/lib/api';
import { Layout } from '../layout/Layout';

type SortField = 'product' | 'qtySystem' | 'qtyCounted' | 'qtyVariance' | 'unitCost' | 'varianceValue';
type SortOrder = 'asc' | 'desc';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default',
  counting: 'warning',
  posted: 'success',
  cancelled: 'error',
};

export default function AuditDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [audit, setAudit] = useState<StockAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Local state for edited quantities
  const [editedLines, setEditedLines] = useState<Record<string, string>>({});

  // Post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('product');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Load audit
  const loadAudit = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await stockAuditApi.getById(id);
      if (response.success) {
        setAudit(response.data);

        // Initialize edited lines with current values
        const initialEdited: Record<string, string> = {};
        (response.data as StockAudit).items.forEach((item) => {
          initialEdited[item._id] = item.qtyCounted || '';
        });
        setEditedLines(initialEdited);
      } else {
        setError(t('common.stockAudits.loadError'));
      }
    } catch (err) {
      console.error('Failed to load audit:', err);
      setError(t('common.stockAudits.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  // Handle quantity change
  const handleQuantityChange = (lineId: string, value: string) => {
    setEditedLines((prev) => ({
      ...prev,
      [lineId]: value,
    }));
  };

  // Save counts
  const handleSaveCounts = async () => {
    if (!audit) return;

    setSaving(true);
    try {
      const linesToUpdate = Object.entries(editedLines)
        .filter(([lineId, qty]) => {
          const originalLine = audit.items.find((item) => item._id === lineId);
          return originalLine && originalLine.qtyCounted !== qty && qty !== '';
        })
        .map(([lineId, qty]) => ({
          productId: audit.items.find((item) => item._id === lineId)?.product._id || '',
          qtyCounted: parseFloat(qty) || 0,
        }));

      if (linesToUpdate.length === 0) {
        setSaving(false);
        return;
      }

      const response = await stockAuditApi.bulkUpdateLines(audit._id, linesToUpdate);
      if (response.success) {
        setAudit(response.data);
        // Reinitialize edited lines
        const initialEdited: Record<string, string> = {};
        response.data.items.forEach((item: StockAuditLine) => {
          initialEdited[item._id] = item.qtyCounted || '';
        });
        setEditedLines(initialEdited);
      } else {
        setError(response.message || t('common.stockAudits.saveError'));
      }
    } catch (err) {
      console.error('Failed to save counts:', err);
      setError(t('common.stockAudits.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Post audit
  const handlePostClick = () => {
    setPostDialogOpen(true);
  };

  const handleConfirmPost = async () => {
    if (!audit) return;

    setPostLoading(true);
    try {
      const response = await stockAuditApi.post(audit._id);
      if (response.success) {
        setPostDialogOpen(false);
        setAudit(response.data);
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

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort items
  const getSortedItems = () => {
    if (!audit) return [];

    const items = [...audit.items];
    items.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'product':
          aVal = a.product?.name || '';
          bVal = b.product?.name || '';
          break;
        case 'qtySystem':
          aVal = parseFloat(a.qtySystem) || 0;
          bVal = parseFloat(b.qtySystem) || 0;
          break;
        case 'qtyCounted':
          aVal = parseFloat(a.qtyCounted || '0');
          bVal = parseFloat(b.qtyCounted || '0');
          break;
        case 'qtyVariance':
          aVal = parseFloat(a.qtyVariance) || 0;
          bVal = parseFloat(b.qtyVariance) || 0;
          break;
        case 'unitCost':
          aVal = parseFloat(a.unitCost) || 0;
          bVal = parseFloat(b.unitCost) || 0;
          break;
        case 'varianceValue':
          aVal = parseFloat(a.varianceValue) || 0;
          bVal = parseFloat(b.varianceValue) || 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return items;
  };

  // Format currency
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  // Check if counting mode
  const isCountingMode = audit?.status === 'counting';

  // Calculate totals
  const totalVarianceValue = audit?.items.reduce((sum, item) => {
    return sum + (parseFloat(item.varianceValue) || 0);
  }, 0) || 0;

  const itemsWithVariance = audit?.items.filter((item) => parseFloat(item.qtyVariance) !== 0).length || 0;

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!audit) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{t('common.stockAudits.notFound')}</Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/stock-audits')}>
              <ArrowLeftIcon />
            </IconButton>
            <ClipboardListIcon size={28} />
            <Box>
              <Typography variant="h5" component="h1">
                {audit.referenceNo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {audit.warehouse?.name} - {new Date(audit.auditDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={t(`common.stockAudits.statuses.${audit.status}`)}
              color={STATUS_COLORS[audit.status] || 'default'}
            />
            {isCountingMode && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveCounts}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : t('common.stockAudits.saveCounts')}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handlePostClick}
                >
                  {t('common.stockAudits.postAudit')}
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('common.stockAudits.totalItems')}
            </Typography>
            <Typography variant="h5">{audit.totalItems}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('common.stockAudits.itemsCounted')}
            </Typography>
            <Typography variant="h5">{audit.itemsCounted}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('common.stockAudits.itemsWithVariance')}
            </Typography>
            <Typography variant="h5" color={itemsWithVariance > 0 ? 'warning.main' : 'text.primary'}>
              {itemsWithVariance}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('common.stockAudits.totalVarianceValue')}
            </Typography>
            <Typography
              variant="h5"
              color={totalVarianceValue > 0 ? 'error.main' : totalVarianceValue < 0 ? 'success.main' : 'text.primary'}
            >
              {formatCurrency(totalVarianceValue.toString())}
            </Typography>
          </Paper>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Items Table */}
        <Paper>
          <div className="space-y-2 xl:hidden">
            {getSortedItems().map((item) => {
              const variance = parseFloat(item.qtyVariance) || 0;
              const hasVariance = variance !== 0;
              const isCounted = item.qtyCounted !== null && item.qtyCounted !== '';
              return (
                <article key={item._id} className={`rounded-lg border p-3 dark:border-slate-700 ${hasVariance ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20' : !isCounted && isCountingMode ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:bg-slate-900'}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{item.product?.name || '-'}</h3><p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{item.product?.sku || '-'}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${isCounted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>{isCounted ? t('common.stockAudits.counted', 'Counted') : t('common.stockAudits.notCounted', 'Not counted')}</span></div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('common.stockAudits.systemQty')}</dt><dd className="mt-0.5 font-medium">{formatCurrency(item.qtySystem)}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('common.stockAudits.countedQty')}</dt><dd className="mt-0.5">{isCountingMode ? <TextField type="number" size="small" fullWidth value={editedLines[item._id] ?? ''} onChange={(e) => handleQuantityChange(item._id, e.target.value)} inputProps={{ min: 0, inputMode: 'decimal' }} /> : formatCurrency(item.qtyCounted || '0')}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('common.stockAudits.variance')}</dt><dd className={`mt-0.5 font-semibold ${variance > 0 ? 'text-emerald-600 dark:text-emerald-400' : variance < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{variance > 0 ? '+' : ''}{formatCurrency(item.qtyVariance)}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('common.stockAudits.unitCost')}</dt><dd className="mt-0.5">{formatCurrency(item.unitCost)}</dd></div>
                    <div className="col-span-2 border-t border-slate-200 pt-2 dark:border-slate-700"><dt className="text-slate-500 dark:text-slate-400">{t('common.stockAudits.varianceValue')}</dt><dd className={`mt-0.5 font-semibold ${hasVariance ? parseFloat(item.varianceValue) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(item.varianceValue)}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
          <TableContainer className="hidden xl:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'product'}
                      direction={sortField === 'product' ? sortOrder : 'asc'}
                      onClick={() => handleSort('product')}
                    >
                      {t('common.stockAudits.product')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'qtySystem'}
                      direction={sortField === 'qtySystem' ? sortOrder : 'asc'}
                      onClick={() => handleSort('qtySystem')}
                    >
                      {t('common.stockAudits.systemQty')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'qtyCounted'}
                      direction={sortField === 'qtyCounted' ? sortOrder : 'asc'}
                      onClick={() => handleSort('qtyCounted')}
                    >
                      {t('common.stockAudits.countedQty')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'qtyVariance'}
                      direction={sortField === 'qtyVariance' ? sortOrder : 'asc'}
                      onClick={() => handleSort('qtyVariance')}
                    >
                      {t('common.stockAudits.variance')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'unitCost'}
                      direction={sortField === 'unitCost' ? sortOrder : 'asc'}
                      onClick={() => handleSort('unitCost')}
                    >
                      {t('common.stockAudits.unitCost')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'varianceValue'}
                      direction={sortField === 'varianceValue' ? sortOrder : 'asc'}
                      onClick={() => handleSort('varianceValue')}
                    >
                      {t('common.stockAudits.varianceValue')}
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedItems().map((item) => {
                  const variance = parseFloat(item.qtyVariance) || 0;
                  const hasVariance = variance !== 0;
                  const isCounted = item.qtyCounted !== null && item.qtyCounted !== '';

                  return (
                    <TableRow
                      key={item._id}
                      hover
                      sx={{
                        backgroundColor: hasVariance
                          ? 'rgba(255, 193, 7, 0.1)'
                          : !isCounted && isCountingMode
                          ? 'rgba(244, 67, 54, 0.05)'
                          : 'transparent',
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {item.product?.name || '-'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.product?.sku || '-'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.qtySystem)}</TableCell>
                      <TableCell align="right">
                        {isCountingMode ? (
                          <TextField
                            type="number"
                            size="small"
                            value={editedLines[item._id] || ''}
                            onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                            sx={{ width: 100 }}
                            inputProps={{ min: 0 }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                            {formatCurrency(item.qtyCounted || '0')}
                            {!isCounted && <AlertTriangleIcon size={16} color="orange" />}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: variance > 0 ? 'success.main' : variance < 0 ? 'error.main' : 'text.primary',
                          fontWeight: hasVariance ? 600 : 400,
                        }}
                      >
                        {variance > 0 ? '+' : ''}
                        {formatCurrency(item.qtyVariance)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: hasVariance ? (parseFloat(item.varianceValue) > 0 ? 'success.main' : 'error.main') : 'text.primary',
                          fontWeight: hasVariance ? 600 : 400,
                        }}
                      >
                        {formatCurrency(item.varianceValue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Notes Section */}
        {audit.notes && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('common.stockAudits.notes')}
            </Typography>
            <Typography variant="body2">{audit.notes}</Typography>
          </Paper>
        )}

        {/* Posted Info */}
        {audit.status === 'posted' && audit.postedBy && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('common.stockAudits.postedInfo')}
            </Typography>
            <Typography variant="body2">
              {t('common.stockAudits.postedByName', { name: audit.postedBy.name })} -{' '}
              {audit.postedAt ? new Date(audit.postedAt).toLocaleString() : '-'}
            </Typography>
          </Paper>
        )}

        {/* Post Confirmation Dialog */}
        <Dialog open={postDialogOpen} onClose={() => setPostDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('common.stockAudits.postConfirmTitle')}</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('common.stockAudits.postWarning')}
            </Alert>
            <Typography variant="body1" gutterBottom>
              {t('common.stockAudits.postConfirmMessage', {
                reference: audit.referenceNo,
                variance: formatCurrency(audit.totalVarianceValue),
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('common.stockAudits.itemsWithVariance')}: {itemsWithVariance}
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
    </Layout>
  );
}
