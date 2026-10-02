import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  Box,
  Button,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ArrowLeft as ArrowLeftIcon,
  CheckCircle as CheckCircleIcon,
  Truck as TruckIcon,
  XCircle as XCircleIcon
} from 'lucide-react';
import { stockApi, journalEntriesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';
import { useFormatCurrency } from '@/lib/currencyUtils';

interface TransferItem {
  _id: string;
  product: { _id: string; name: string; sku: string } | string;
  qty: number | string;
  quantity?: number | string;
  unitCost?: number | string | null;
  notes?: string | null;
}

interface Transfer {
  _id: string;
  transferNumber: string;
  fromWarehouse: { _id: string; name: string; code: string } | string;
  toWarehouse: { _id: string; name: string; code: string } | string;
  status: string;
  reason: string;
  notes?: string;
  transferDate: string;
  completedDate?: string;
  createdBy?: { _id: string; name: string } | string;
  confirmedBy?: { _id: string; name: string } | string;
  receivedBy?: { _id: string; name: string } | string;
  confirmedAt?: string;
  receivedDate?: string;
  journalEntry?: string | null;
  items: TransferItem[];
  createdAt: string;
  updatedAt: string;
}

interface JournalEntry {
  _id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType: string;
  status: string;
  lines: Array<{
    accountCode: string;
    accountName?: string;
    description?: string;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}

const getName = (obj: { _id: string; name: string; code?: string } | string | undefined): string => {
  if (!obj) return '-';
  if (typeof obj === 'string') return obj;
  return obj.name || obj._id || '-';
};

const toNum = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await stockApi.getTransfer(id!);
        if (response?.success) {
          setTransfer(response.data as Transfer);

          // Fetch journal entry if linked
          const transferData = response.data as Transfer;
          if (transferData.journalEntry) {
            try {
              const jeResponse = await journalEntriesApi.getById(transferData.journalEntry);
              if (jeResponse?.success) {
                setJournal(jeResponse.data as JournalEntry);
              }
            } catch {
              // Journal not found or no access - not critical
            }
          }
        } else {
          setError('Failed to load transfer');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleApprove = async () => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      const response = await stockApi.approveTransfer(transfer._id);
      if (response?.success) {
        setTransfer(response.data as Transfer);
      } else {
        setError('Failed to approve transfer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      const response = await stockApi.completeTransfer(transfer._id);
      if (response?.success) {
        setTransfer(response.data as Transfer);
      } else {
        setError('Failed to complete transfer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Completion failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      const response = await stockApi.cancelTransfer(transfer._id);
      if (response?.success) {
        setTransfer(response.data as Transfer);
      } else {
        setError('Failed to cancel transfer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
      draft: 'default',
      pending: 'primary',
      in_transit: 'warning',
      confirmed: 'success',
      completed: 'success',
      cancelled: 'error'
    };
    return <Chip label={status.replace('_', ' ').toUpperCase()} color={colors[status] || 'default'} size="small" />;
  };

  const formatCurrency = useFormatCurrency();

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!transfer) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Transfer not found'}</Alert>
          <Button startIcon={<ArrowLeftIcon />} onClick={() => navigate('/stock-transfers')} sx={{ mt: 2 }}>
            {t('common.back', 'Back to Transfers')}
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              startIcon={<ArrowLeftIcon />}
              onClick={() => navigate('/stock-transfers')}
              size="small"
            >
              {t('common.back', 'Back')}
            </Button>
            <TruckIcon size={28} />
            <Typography variant="h5" component="h1">
              {transfer.transferNumber}
            </Typography>
            {getStatusChip(transfer.status)}
          </div>
          <div className="flex gap-2">
            {transfer.status === 'pending' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {t('transfers.approve', 'Approve')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<XCircleIcon />}
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {t('transfers.cancel', 'Cancel')}
                </Button>
              </>
            )}
            {transfer.status === 'in_transit' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                onClick={handleComplete}
                disabled={actionLoading}
              >
                {t('transfers.complete', 'Complete')}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Transfer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('transfers.transferDetails', 'Transfer Details')}
            </Typography>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between">
                <Typography variant="body2" color="text.secondary">{t('transfers.from', 'From')}</Typography>
                <Typography variant="body2" fontWeight="medium">{getName(transfer.fromWarehouse)}</Typography>
              </div>
              <div className="flex justify-between">
                <Typography variant="body2" color="text.secondary">{t('transfers.to', 'To')}</Typography>
                <Typography variant="body2" fontWeight="medium">{getName(transfer.toWarehouse)}</Typography>
              </div>
              <div className="flex justify-between">
                <Typography variant="body2" color="text.secondary">{t('transfers.reason', 'Reason')}</Typography>
                <Typography variant="body2" fontWeight="medium">{transfer.reason}</Typography>
              </div>
              <div className="flex justify-between">
                <Typography variant="body2" color="text.secondary">{t('transfers.date', 'Date')}</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {new Date(transfer.transferDate).toLocaleDateString()}
                </Typography>
              </div>
              {transfer.notes && (
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">{t('common.notes', 'Notes')}</Typography>
                  <Typography variant="body2">{transfer.notes}</Typography>
                </div>
              )}
            </div>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('transfers.auditTrail', 'Audit Trail')}
            </Typography>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between">
                <Typography variant="body2" color="text.secondary">{t('transfers.createdBy', 'Created By')}</Typography>
                <Typography variant="body2" fontWeight="medium">{getName(transfer.createdBy)}</Typography>
              </div>
              <div className="flex justify-between">
                <Typography variant="body2" color="text.secondary">{t('transfers.createdAt', 'Created')}</Typography>
                <Typography variant="body2">{new Date(transfer.createdAt).toLocaleString()}</Typography>
              </div>
              {transfer.confirmedBy && (
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">{t('transfers.approvedBy', 'Approved By')}</Typography>
                  <Typography variant="body2" fontWeight="medium">{getName(transfer.confirmedBy)}</Typography>
                </div>
              )}
              {transfer.confirmedAt && (
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">{t('transfers.approvedAt', 'Approved')}</Typography>
                  <Typography variant="body2">{new Date(transfer.confirmedAt).toLocaleString()}</Typography>
                </div>
              )}
              {transfer.receivedBy && (
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">{t('transfers.receivedBy', 'Received By')}</Typography>
                  <Typography variant="body2" fontWeight="medium">{getName(transfer.receivedBy)}</Typography>
                </div>
              )}
              {transfer.receivedDate && (
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">{t('transfers.completedAt', 'Completed')}</Typography>
                  <Typography variant="body2">{new Date(transfer.receivedDate).toLocaleString()}</Typography>
                </div>
              )}
              {transfer.journalEntry && (
                <div className="flex justify-between">
                  <Typography variant="body2" color="text.secondary">{t('transfers.journalEntry', 'Journal Entry')}</Typography>
                  <Typography variant="body2" fontWeight="medium">{typeof transfer.journalEntry === 'string' ? transfer.journalEntry.slice(-8) : 'Linked'}</Typography>
                </div>
              )}
            </div>
          </Paper>
        </div>

        {/* Items */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('transfers.items', 'Transfer Items')}
          </Typography>
          <div className="space-y-2 xl:hidden">
            {transfer.items.map((item) => {
              const product = typeof item.product === 'object' ? item.product : null;
              const qty = toNum(item.qty || item.quantity);
              const cost = toNum(item.unitCost);
              return <article key={item._id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><h3 className="text-sm font-semibold">{product?.name || '-'}</h3><p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{product?.sku || '-'}</p><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700"><div><dt className="text-slate-500 dark:text-slate-400">{t('transfers.quantity', 'Quantity')}</dt><dd className="mt-0.5 font-medium">{qty}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t('transfers.unitCost', 'Unit Cost')}</dt><dd className="mt-0.5">{formatCurrency(cost)}</dd></div><div className="col-span-2"><dt className="text-slate-500 dark:text-slate-400">{t('transfers.totalCost', 'Total Cost')}</dt><dd className="mt-0.5 font-semibold">{formatCurrency(qty * cost)}</dd></div></dl></article>;
            })}
          </div>
          <TableContainer className="hidden xl:block">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('transfers.product', 'Product')}</TableCell>
                  <TableCell>{t('transfers.sku', 'SKU')}</TableCell>
                  <TableCell align="right">{t('transfers.quantity', 'Quantity')}</TableCell>
                  <TableCell align="right">{t('transfers.unitCost', 'Unit Cost')}</TableCell>
                  <TableCell align="right">{t('transfers.totalCost', 'Total Cost')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfer.items.map((item) => {
                  const product = typeof item.product === 'object' ? item.product : null;
                  const qty = toNum(item.qty || item.quantity);
                  const cost = toNum(item.unitCost);
                  return (
                    <TableRow key={item._id}>
                      <TableCell>{product?.name || '-'}</TableCell>
                      <TableCell>{product?.sku || '-'}</TableCell>
                      <TableCell align="right">{qty}</TableCell>
                      <TableCell align="right">{formatCurrency(cost)}</TableCell>
                      <TableCell align="right">{formatCurrency(qty * cost)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Journal Entry */}
        {journal && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('transfers.journalEntry', 'Journal Entry')} - {journal.entryNumber}
            </Typography>
            <div className="flex justify-between mb-2">
              <Typography variant="body2" color="text.secondary">{journal.description}</Typography>
              <Chip label={journal.status} size="small" color={journal.status === 'posted' ? 'success' : 'default'} />
            </div>
            <div className="space-y-2 xl:hidden">
              {journal.lines.map((line, idx) => <article key={idx} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-xs font-semibold">{line.accountName || '-'}</h3><p className="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">{line.accountCode}</p></div><span className="max-w-[45%] break-words text-right text-xs text-slate-500 dark:text-slate-400">{line.description || '-'}</span></div><div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700"><div><span className="text-slate-500 dark:text-slate-400">{t('journal.debit', 'Debit')}</span><p className="mt-0.5 font-medium">{line.debit ? formatCurrency(line.debit) : '-'}</p></div><div><span className="text-slate-500 dark:text-slate-400">{t('journal.credit', 'Credit')}</span><p className="mt-0.5 font-medium">{line.credit ? formatCurrency(line.credit) : '-'}</p></div></div></article>)}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800"><div><span className="text-slate-500 dark:text-slate-400">{t('journal.totalDebit', 'Total debit')}</span><p className="mt-1 font-semibold">{formatCurrency(journal.totalDebit)}</p></div><div><span className="text-slate-500 dark:text-slate-400">{t('journal.totalCredit', 'Total credit')}</span><p className="mt-1 font-semibold">{formatCurrency(journal.totalCredit)}</p></div></div>
            </div>
            <TableContainer className="hidden xl:block">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('journal.accountCode', 'Account Code')}</TableCell>
                    <TableCell>{t('journal.accountName', 'Account')}</TableCell>
                    <TableCell>{t('journal.description', 'Description')}</TableCell>
                    <TableCell align="right">{t('journal.debit', 'Debit')}</TableCell>
                    <TableCell align="right">{t('journal.credit', 'Credit')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journal.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{line.accountCode}</TableCell>
                      <TableCell>{line.accountName || '-'}</TableCell>
                      <TableCell>{line.description || '-'}</TableCell>
                      <TableCell align="right">{line.debit ? formatCurrency(line.debit) : '-'}</TableCell>
                      <TableCell align="right">{line.credit ? formatCurrency(line.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3}><strong>{t('journal.total', 'Total')}</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(journal.totalDebit)}</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(journal.totalCredit)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {!journal && transfer.journalEntry && (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              {t('transfers.journalNotFound', 'Journal entry is linked but could not be loaded.')}
            </Alert>
          </Paper>
        )}

        {!transfer.journalEntry && transfer.status !== 'pending' && transfer.status !== 'cancelled' && (
          <Paper sx={{ p: 3 }}>
            <Alert severity="warning">
              {t('transfers.noJournal', 'No journal entry was created for this transfer. This may happen when source and destination share the same inventory account.')}
            </Alert>
          </Paper>
        )}
      </Box>
    </Layout>
  );
}
