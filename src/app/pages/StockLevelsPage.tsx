import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
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
  InputAdornment,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { productsApi } from '@/lib/api';
import { Layout } from '../layout/Layout';
import { EmptyState } from '@/app/components/EmptyState';
import { Package } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ProductStock {
  _id: string;
  sku: string;
  name: string;
  category?: {
    _id: string;
    name: string;
  };
  unit: string;
  currentStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  lowStockThreshold: number;
  defaultWarehouse?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
}

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function StockLevelsPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark());
  
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch stock data from products API (aggregated stock levels)
  const fetchStockLevels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        isArchived: false,
        forStockLevels: '1',
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (stockStatusFilter) {
        params.status = stockStatusFilter;
      }

      const response = await productsApi.getAll(params);
      
      if (response && response.success) {
        const productData = (response.data as any[]) || [];
        
        // Transform product data to stock format
        const stockData: ProductStock[] = productData.map((product: any) => {
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
            currentStock: currentStock,
            reservedQuantity,
            availableQuantity: Math.max(currentStock - reservedQuantity, 0),
            averageCost: effectiveCost,
            totalValue: currentStock * effectiveCost,
            lowStockThreshold: toNumber(product.lowStockThreshold) || 10,
            defaultWarehouse: product.defaultWarehouse,
            isActive: product.isActive !== false,
          };
        });

        setProducts(stockData);
        
        if (response.pagination && typeof response.pagination === 'object') {
          const pg = response.pagination as Record<string, any>;
          setTotal(pg.total || productData.length);
        } else {
          setTotal(productData.length);
        }
      } else {
        setError(t('stockLevels.fetchFailed'));
      }
    } catch (err) {
      console.error('[StockLevels] Error:', err);
      setError(err instanceof Error ? err.message : t('stockLevels.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockLevels();
  }, [page, rowsPerPage, debouncedSearch, stockStatusFilter]);

  const handlePageChange = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    fetchStockLevels();
  };

  const handleExport = () => {
    const headers = [
      'Product Code',
      'Product Name',
      'Category',
      'Unit',
      'Qty On Hand',
      'Qty Reserved',
      'Qty Available',
      'Avg Cost',
      'Total Value',
      'Status'
    ];
    
    const rows = products.map(item => [
      item.sku,
      item.name,
      item.category?.name || '-',
      item.unit,
      item.currentStock,
      item.reservedQuantity,
      item.availableQuantity,
      item.averageCost.toFixed(2),
      item.totalValue.toFixed(2),
      getStockStatus(item).label
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-levels-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStockStatus = (product: ProductStock) => {
    if (product.currentStock === 0) return { label: t('stockLevels.outOfStock'), color: 'error' as const };
    if (product.currentStock <= product.lowStockThreshold) return { label: t('stockLevels.lowStock'), color: 'warning' as const };
    return { label: t('stockLevels.inStock'), color: 'success' as const };
  };

  // Calculate totals
  const totalValue = products.reduce((sum, item) => sum + item.totalValue, 0);
  const totalQuantity = products.reduce((sum, item) => sum + item.currentStock, 0);
  const totalReserved = products.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const totalAvailable = products.reduce((sum, item) => sum + item.availableQuantity, 0);
  const lowStockCount = products.filter(item => 
    item.currentStock > 0 && item.currentStock <= item.lowStockThreshold
  ).length;
  const outOfStockCount = products.filter(item => item.currentStock === 0).length;
  const valueAtRisk = products
    .filter(item => item.currentStock <= item.lowStockThreshold)
    .reduce((sum, item) => sum + item.totalValue, 0);
  const availabilityRate = totalQuantity > 0 ? (totalAvailable / totalQuantity) * 100 : 0;
  const topValueItem = [...products].sort((a, b) => b.totalValue - a.totalValue)[0];

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, sm: 3 } }} className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
          <InventoryIcon className="text-primary flex-shrink-0" style={{ fontSize: 30 }} />
          <Typography variant="h5" component="h1" className="text-slate-900 dark:text-white text-xl sm:text-2xl font-bold">
            {t('stockLevels.title', 'Stock Levels')}
          </Typography>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('stockLevels.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{
              borderColor: dark ? '#475569' : '#cbd5e1',
              color: dark ? '#e2e8f0' : '#475569',
            }}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              borderColor: dark ? '#475569' : '#cbd5e1',
              color: dark ? '#e2e8f0' : '#475569',
            }}
          >
            {t('common.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <InventoryIcon color="primary" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.totalProducts', 'Total Products')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{total}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <TrendingUpIcon color="success" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.totalQuantity', 'Total Quantity')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{totalQuantity.toLocaleString()}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <WarningIcon color="warning" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.lowStock', 'Low Stock')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{lowStockCount}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <TrendingUpIcon color="success" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.totalValue', 'Total Value')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{formatCurrency(totalValue)}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <WarningIcon color={availabilityRate < 80 ? 'warning' : 'success'} />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              Availability
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{availabilityRate.toFixed(1)}%</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <InventoryIcon color="secondary" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              Reserved
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{totalReserved.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('stockLevels.inventoryExposure')}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(valueAtRisk)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('stockLevels.valueAtRisk')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('stockLevels.topValueSku')}</p>
          <p className="mt-2 truncate text-lg font-bold text-slate-950 dark:text-white">{topValueItem?.name || '-'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{topValueItem ? `${topValueItem.sku} · ${formatCurrency(topValueItem.totalValue)}` : t('stockLevels.noValuation')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('stockLevels.stockHealthMix')}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{products.length ? Math.round(((products.length - lowStockCount - outOfStockCount) / products.length) * 100) : 0}% healthy</p>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="bg-emerald-500" style={{ width: `${products.length ? ((products.length - lowStockCount - outOfStockCount) / products.length) * 100 : 0}%` }} />
            <div className="bg-amber-500" style={{ width: `${products.length ? (lowStockCount / products.length) * 100 : 0}%` }} />
            <div className="bg-red-500" style={{ width: `${products.length ? (outOfStockCount / products.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{lowStockCount} low stock, {outOfStockCount} out of stock</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 mb-4 border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <TextField
            fullWidth
            size="small"
            placeholder={t('stockLevels.searchPlaceholder', 'Search product or SKU...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: dark ? '#1e293b' : 'white',
                color: dark ? '#e2e8f0' : '#1e293b',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: dark ? '#334155' : '#cbd5e1',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: dark ? '#475569' : '#94a3b8',
              },
              '& input::placeholder': {
                color: dark ? '#94a3b8' : '#64748b',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-slate-400" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth size="small" sx={{
            '& .MuiInputBase-root': {
              backgroundColor: dark ? '#1e293b' : 'white',
              color: dark ? '#e2e8f0' : '#1e293b',
            },
            '& .MuiInputLabel-root': {
              color: dark ? '#cbd5e1' : '#475569',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: dark ? '#334155' : '#cbd5e1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: dark ? '#475569' : '#94a3b8',
            },
          }}>
            <InputLabel>{t('stockLevels.stockStatus', 'Stock Status')}</InputLabel>
            <Select
              value={stockStatusFilter}
              label={t('stockLevels.stockStatus', 'Stock Status')}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              sx={{
                color: dark ? '#e2e8f0' : '#1e293b',
              }}
            >
              <MenuItem value="">{t('common.all', 'All')}</MenuItem>
              <MenuItem value="in_stock">{t('stockLevels.inStock', 'In Stock')}</MenuItem>
              <MenuItem value="low_stock">{t('stockLevels.lowStock', 'Low Stock')}</MenuItem>
              <MenuItem value="out_of_stock">{t('stockLevels.outOfStock', 'Out of Stock')}</MenuItem>
            </Select>
          </FormControl>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => {
              setSearch('');
              setStockStatusFilter('');
              setPage(0);
            }}
            sx={{
              borderColor: dark ? '#475569' : '#cbd5e1',
              color: dark ? '#e2e8f0' : '#475569',
            }}
          >
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: dark ? '#1e293b' : '#f1f5f9' }}>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.productCode', 'Product Code')}</TableCell>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.productName', 'Product Name')}</TableCell>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.category', 'Category')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.qtyOnHand', 'Qty On Hand')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.qtyReserved', 'Qty Reserved')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.qtyAvailable', 'Qty Available')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.avgCost', 'Avg Cost')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.totalValue', 'Total Value')}</TableCell>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.status', 'Status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 2, border: 0 }}>
                    <EmptyState
                      compact
                      icon={Package}
                      title={t('stockLevels.noData', 'No stock levels yet')}
                      description={t('stockLevels.noDataHint', 'Stock levels will appear here once products are added and received into inventory.')}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                products.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow 
                      key={item._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <TableCell sx={{ color: 'inherit' }}>{item.sku}</TableCell>
                      <TableCell sx={{ color: 'inherit' }}>
                        <div className="font-medium">{item.name}</div>
                        {item.category && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.category.name}</div>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'inherit' }}>{item.category?.name || '-'}</TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{item.currentStock.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{item.reservedQuantity.toLocaleString()}</TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: item.availableQuantity <= item.lowStockThreshold && item.availableQuantity > 0 ? '#ed6c02' : 
                                 item.availableQuantity === 0 ? '#d32f2f' : 'inherit',
                          fontWeight: item.availableQuantity <= item.lowStockThreshold ? 'bold' : 'normal'
                        }}
                      >
                        <div className="flex min-w-[110px] flex-col items-end gap-1">
                          <span>{item.availableQuantity.toLocaleString()}</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={item.availableQuantity <= item.lowStockThreshold ? 'h-full rounded-full bg-amber-500' : 'h-full rounded-full bg-emerald-500'}
                              style={{ width: `${Math.max(4, Math.min(100, (item.availableQuantity / Math.max(item.currentStock, 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{formatCurrency(item.averageCost)}</TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{formatCurrency(item.totalValue)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={status.label} 
                          color={status.color} 
                          size="small" 
                          variant={item.currentStock === 0 ? 'filled' : 'outlined'}
                          className="dark:border-slate-500"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            borderTop: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
            backgroundColor: dark ? '#1e293b' : 'white',
            color: dark ? '#e2e8f0' : '#1e293b',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: 'inherit',
            },
            '& .MuiSelect-select, & .MuiInputBase-input': {
              color: 'inherit',
            },
          }}
        />
      </div>
    </Box>
    </Layout>
  );
}
