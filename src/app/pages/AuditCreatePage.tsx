import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  ArrowLeft as ArrowLeftIcon,
  Save as SaveIcon,
} from 'lucide-react';
import { stockAuditApi, warehousesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

export default function AuditCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark());

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [formData, setFormData] = useState({
    warehouse: '',
    auditDate: new Date().toISOString().split('T')[0],
    type: 'cycle_count',
    notes: '',
  });

  // Load warehouses
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const response = await warehousesApi.getAll({});
        if (response.success && (response as any).data) {
          // Handle both array and object formats
          const warehousesData = Array.isArray((response as any).data) 
            ? (response as any).data 
            : [];
          setWarehouses(warehousesData);
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
        setError(t('common.stockAudits.loadError'));
      } finally {
        setLoading(false);
      }
    };
    loadWarehouses();
  }, [t]);

  // Handle form change
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!formData.warehouse) {
      setError(t('common.stockAudits.warehouseRequired') || 'Please select a warehouse');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await stockAuditApi.create({
        warehouse: formData.warehouse,
        auditDate: formData.auditDate,
        type: formData.type,
        notes: formData.notes || undefined,
      });

      if (response.success) {
        navigate(`/stock-audits/${response.data._id}`);
      } else {
        // Check for existing audit error - backend returns message about audit in progress
        if (response.message?.toLowerCase().includes('audit') && response.message?.toLowerCase().includes('progress')) {
          setError(t('common.stockAudits.auditInProgress') || 'An audit is already in progress for this warehouse');
        } else {
          setError(response.message || t('common.stockAudits.createError') || 'Failed to create audit');
        }
      }
    } catch (err: any) {
      console.error('Failed to create audit:', err);
      const errorMessage = err.response?.data?.message || '';
      if (errorMessage.toLowerCase().includes('audit') && errorMessage.toLowerCase().includes('progress')) {
        setError(t('common.stockAudits.auditInProgress') || 'An audit is already in progress for this warehouse');
      } else {
        setError(t('common.stockAudits.createError') || 'Failed to create audit');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

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
      <Box sx={{ px: { xs: 1, sm: 2, lg: 3 }, py: { xs: 1.5, sm: 3 } }} className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Box sx={{ maxWidth: 860, mx: 'auto' }} className="2xl:!max-w-[1100px]">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/stock-audits')} sx={{ color: dark ? '#93c5fd' : '#2563eb' }}>
            <ArrowLeftIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>
            {t('common.stockAudits.newAudit')}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Paper sx={{ p: { xs: 2, sm: 4 }, backgroundColor: dark ? '#111827' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: 'none' }}>
          <Typography variant="subtitle1" sx={{ color: dark ? '#f8fafc' : '#0f172a', fontWeight: 700, mb: 0.5 }}>
            Audit Setup
          </Typography>
          <Typography variant="body2" sx={{ color: dark ? '#94a3b8' : '#64748b', mb: 3 }}>
            Select the warehouse and count method before opening the physical stock count.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Warehouse */}
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>{t('common.stockAudits.warehouse')}</InputLabel>
              <Select
                value={formData.warehouse}
                label={t('common.stockAudits.warehouse')}
                onChange={(e) => handleChange('warehouse', e.target.value)}
              >
                {warehouses.map((wh) => (
                  <MenuItem key={wh._id} value={wh._id}>
                    {wh.name} ({wh.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Audit Date */}
            <TextField
              type="date"
              label={t('common.stockAudits.auditDate')}
              value={formData.auditDate}
              onChange={(e) => handleChange('auditDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={fieldSx}
            />

            {/* Type */}
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>{t('common.stockAudits.type')}</InputLabel>
              <Select
                value={formData.type}
                label={t('common.stockAudits.type')}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <MenuItem value="full">{t('common.stockAudits.types.full')}</MenuItem>
                <MenuItem value="partial">{t('common.stockAudits.types.partial')}</MenuItem>
                <MenuItem value="cycle_count">{t('common.stockAudits.types.cycle_count')}</MenuItem>
                <MenuItem value="spot_check">{t('common.stockAudits.types.spot_check')}</MenuItem>
              </Select>
            </FormControl>

            {/* Notes */}
            <TextField
              label={t('common.stockAudits.notes')}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              multiline
              rows={3}
              fullWidth
              sx={fieldSx}
            />

            {/* Submit Button */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'flex-end', gap: 1.5, mt: 2, '& > button': { minHeight: 44, width: { xs: '100%', sm: 'auto' } } }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/stock-audits')}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={saving || !formData.warehouse}
              >
                {saving ? <CircularProgress size={20} /> : t('common.stockAudits.create')}
              </Button>
            </Box>
          </Box>
        </Paper>
        </Box>
      </Box>
    </Layout>
  );
}
