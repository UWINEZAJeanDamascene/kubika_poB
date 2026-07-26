import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Package,
  Loader2,
  Calculator,
  X,
  RefreshCw,
  Tag,
  ArrowUpRight,
  TrendingDown,
  Wallet,
  ScanLine,
  PauseCircle,
  RotateCcw,
  DoorOpen,
  DoorClosed,
} from 'lucide-react';
import { salesLegacyApi, clientsApi, warehouseApi, PosProduct, bankAccountsApi, invoicesApi, creditNotesApi, tillApi } from '@/lib/api';
import { useFormatCurrency } from '@/lib/currencyUtils';
import { useTranslation } from 'react-i18next';
import { EBMStatusBadge } from '@/app/components/EBMStatusBadge';

interface CartItem extends PosProduct {
  cartQuantity: number;
  cartUnitPrice: number;
  cartDiscountPct: number;
}

interface Client {
  _id: string;
  name: string;
  code: string;
  contact?: {
    phone?: string;
    email?: string;
  };
  address?: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface HeldSale {
  id: string;
  heldAt: string;
  label: string;
  cart: CartItem[];
  selectedClientId: string;
  walkInName: string;
  notes: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'cheque';
}

interface TillSession {
  _id?: string;
  openedAt: string;
  openingFloat: number;
  closingCount?: number;
  status: 'open' | 'closed';
}

interface PosInvoice {
  _id: string;
  invoiceNumber?: string;
  referenceNo?: string;
  client?: { name?: string };
  clientInfo?: { name?: string };
  grandTotal?: number;
  totalAmount?: number;
  currencyCode?: string;
  status?: string;
  ebm?: { ebmStatus?: string };
  lines?: Array<{
    _id?: string;
    product?: string | { _id?: string; name?: string; sku?: string };
    productName?: string;
    description?: string;
    quantity?: number;
    qty?: number;
    unitPrice?: number;
    taxRate?: number;
    lineSubtotal?: number;
    lineTax?: number;
    lineTotal?: number;
  }>;
}

const toNumericAmount = (val: number | any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

export default function SalesLegacyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const appFormatCurrency = useFormatCurrency();
  const formatCurrency = useCallback((amount: number | any, overrideCurrency?: string) => {
    return appFormatCurrency(toNumericAmount(amount), overrideCurrency);
  }, [appFormatCurrency]);
  
  // State
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('walk-in');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'cheque'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [bankAccounts, setBankAccounts] = useState<Array<{_id: string; name: string; accountType: string}>>([]);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [tillSession, setTillSession] = useState<TillSession | null>(null);
  const [tillLoading, setTillLoading] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState('');
  const [closingCountInput, setClosingCountInput] = useState('');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<PosInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [posEbmStatusFilter, setPosEbmStatusFilter] = useState('all');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const scannerRef = useRef<any>(null);
  const scanBufferRef = useRef('');
  const lastScanKeyAtRef = useRef(0);
  const scanFlushTimerRef = useRef<number | null>(null);
  
  const fetchActiveTill = useCallback(async () => {
    setTillLoading(true);
    try {
      const response = await tillApi.getActive();
      if (response.success) {
        const active = response.data as any;
        if (active && active.status === 'open') {
          setTillSession({
            _id: active._id,
            openedAt: active.openedAt,
            openingFloat: toNumericAmount(active.openingFloat),
            closingCount: active.closingCount,
            status: active.status,
          });
        } else {
          setTillSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to load till session:', error);
      toast.error('Could not load till status');
    } finally {
      setTillLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadWarehouses();
    loadClients();
    loadBankAccounts();
    fetchActiveTill();
    const storedHeldSales = localStorage.getItem('pos-held-sales');
    if (storedHeldSales) {
      try {
        setHeldSales(JSON.parse(storedHeldSales));
      } catch {
        localStorage.removeItem('pos-held-sales');
      }
    }
  }, [fetchActiveTill]);

  useEffect(() => {
    localStorage.setItem('pos-held-sales', JSON.stringify(heldSales));
  }, [heldSales]);

  
  const loadBankAccounts = async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as Array<{_id: string; name: string; accountType: string}>);
      }
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    }
  };
  
  // Load products when warehouse selected or search changes
  useEffect(() => {
    if (selectedWarehouseId) {
      loadProducts();
    }
  }, [selectedWarehouseId, searchQuery]);
  
  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getAll({ isActive: true, limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setWarehouses(response.data as Warehouse[]);
        // Auto-select first warehouse if available
        if ((response.data as Warehouse[]).length > 0) {
          setSelectedWarehouseId((response.data as Warehouse[])[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };
  
  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };
  
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await salesLegacyApi.getProducts({
        search: searchQuery || undefined,
        warehouseId: selectedWarehouseId,
        limit: 50
      });
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toNumber = (val: number | any): number => {
    return toNumericAmount(val);
  };

  const extractCodeFromScan = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('product:')) {
      return trimmed.slice('product:'.length).trim();
    }

    try {
      const url = new URL(trimmed);
      const code = url.searchParams.get('barcode') || url.searchParams.get('sku') || url.searchParams.get('code');
      if (code) return code.trim();
      const productMatch = url.pathname.match(/\/products\/([^/?#]+)/i);
      if (productMatch?.[1]) return decodeURIComponent(productMatch[1]);
    } catch {
      // Plain barcode/SKU scanners land here.
    }

    return trimmed;
  };

  const findScannedProduct = useCallback(async (rawValue: string) => {
    const code = extractCodeFromScan(rawValue);
    if (!code || !selectedWarehouseId) return;

    setSearchQuery(code);
    try {
      const response = await salesLegacyApi.getProducts({
        search: code,
        warehouseId: selectedWarehouseId,
        limit: 20
      });

      const matches = response.success ? response.data : [];
      setProducts(matches);
      const normalizedCode = code.toLowerCase();
      const exactMatch = matches.find((product) => {
        const sku = product.sku?.toLowerCase();
        const barcode = product.barcode?.toLowerCase();
        const id = product._id?.toLowerCase();
        return sku === normalizedCode || barcode === normalizedCode || id === normalizedCode;
      });
      const product = exactMatch || (matches.length === 1 ? matches[0] : null);

      if (!product) {
        toast.error(`No exact product found for ${code}`);
        return;
      }

      if (!product.isAvailable) {
        toast.error(`${product.name} is out of stock`);
        return;
      }

      addToCart(product);
    } catch (error: any) {
      console.error('Scanner lookup failed:', error);
      toast.error(error?.message || 'Failed to look up scanned product');
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    const finishScannerEntry = () => {
      const value = scanBufferRef.current;
      scanBufferRef.current = '';
      if (value.length >= 3) {
        findScannedProduct(value);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const now = Date.now();
      const gap = now - lastScanKeyAtRef.current;
      lastScanKeyAtRef.current = now;

      if (event.key === 'Enter') {
        if (scanBufferRef.current.length >= 3) {
          event.preventDefault();
          finishScannerEntry();
        }
        return;
      }

      if (event.key.length !== 1) return;

      if (gap > 50) {
        scanBufferRef.current = event.key;
        return;
      }

      scanBufferRef.current += event.key;
      setSearchQuery(scanBufferRef.current);

      if (scanFlushTimerRef.current) {
        window.clearTimeout(scanFlushTimerRef.current);
      }
      scanFlushTimerRef.current = window.setTimeout(finishScannerEntry, 80);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scanFlushTimerRef.current) {
        window.clearTimeout(scanFlushTimerRef.current);
      }
    };
  }, [findScannedProduct]);
  
  // Cart operations
  const addToCart = (product: PosProduct) => {
    if (product.currentStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.cartQuantity >= product.currentStock) {
          toast.error(`Cannot add more ${product.name}. Stock limit reached.`);
          return prev;
        }
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { 
        ...product, 
        cartQuantity: 1, 
        cartUnitPrice: product.sellingPrice,
        cartDiscountPct: 0
      }];
    });
    setShowCart(true);
    toast.success(`${product.name} added to cart`);
  };
  
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === productId) {
        const newQty = Math.max(1, item.cartQuantity + delta);
        if (newQty > item.currentStock) {
          toast.error(`Stock limit reached for ${item.name}`);
          return item;
        }
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };
  
  const updatePrice = (productId: string, price: number) => {
    setCart(prev => prev.map(item => 
      item._id === productId ? { ...item, cartUnitPrice: Math.max(0, price) } : item
    ));
  };
  
  const updateDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => 
      item._id === productId ? { ...item, cartDiscountPct: Math.max(0, Math.min(100, discount)) } : item
    ));
  };
  
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };
  
  const clearCart = () => {
    setCart([]);
    setPaymentAmount(0);
  };

  const holdSale = () => {
    if (cart.length === 0) {
      toast.error('Add items before holding a sale');
      return;
    }
    const heldSale: HeldSale = {
      id: crypto.randomUUID(),
      heldAt: new Date().toISOString(),
      label: walkInName || clients.find((client) => client._id === selectedClientId)?.name || `Sale ${heldSales.length + 1}`,
      cart,
      selectedClientId,
      walkInName,
      notes,
      paymentMethod,
    };
    setHeldSales((prev) => [heldSale, ...prev]);
    clearCart();
    setSelectedClientId('walk-in');
    setWalkInName('');
    setNotes('');
    setPaymentMethod('cash');
    toast.success('Sale held. Fresh cart opened.');
  };

  const recallSale = (heldSale: HeldSale) => {
    if (cart.length > 0) {
      holdSale();
    }
    setCart(heldSale.cart);
    setSelectedClientId(heldSale.selectedClientId);
    setWalkInName(heldSale.walkInName);
    setNotes(heldSale.notes);
    setPaymentMethod(heldSale.paymentMethod);
    setHeldSales((prev) => prev.filter((sale) => sale.id !== heldSale.id));
    setShowCart(true);
    toast.success('Held sale recalled');
  };

  const openTill = async () => {
    const openingFloat = Number(openingFloatInput);
    if (!Number.isFinite(openingFloat) || openingFloat < 0) {
      toast.error('Enter a valid opening float');
      return;
    }
    setTillLoading(true);
    try {
      const response = await tillApi.open(openingFloat);
      if (response.success) {
        const data = response.data as any;
        setTillSession({
          _id: data._id,
          openedAt: data.openedAt,
          openingFloat: toNumericAmount(data.openingFloat),
          closingCount: data.closingCount,
          status: data.status,
        });
        toast.success('Till opened');
      } else {
        toast.error((response as any).message || 'Failed to open till');
      }
    } catch (error: any) {
      console.error('Failed to open till:', error);
      toast.error(error?.message || 'Failed to open till');
    } finally {
      setTillLoading(false);
      setOpeningFloatInput('');
    }
  };

  const closeTill = async () => {
    if (!tillSession) return;
    const closingCount = Number(closingCountInput);
    if (!Number.isFinite(closingCount) || closingCount < 0) {
      toast.error('Enter a valid closing count');
      return;
    }
    setTillLoading(true);
    try {
      const response = await tillApi.close(closingCount);
      if (response.success) {
        setTillSession(null);
        setClosingCountInput('');
        toast.success('Till closed');
      } else {
        toast.error((response as any).message || 'Failed to close till');
      }
    } catch (error: any) {
      console.error('Failed to close till:', error);
      toast.error(error?.message || 'Failed to close till');
    } finally {
      setTillLoading(false);
    }
  };

  const loadRecentInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await invoicesApi.getAll({
        page: 1,
        limit: 15,
        ebmStatus: posEbmStatusFilter !== 'all' ? posEbmStatusFilter : undefined,
      });
      const data = response.data as any;
      setRecentInvoices(Array.isArray(data) ? data : data?.invoices || data?.data || []);
    } catch (error: any) {
      console.error('Failed to load invoices:', error);
      toast.error(error?.message || 'Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const openInvoiceActions = () => {
    setInvoiceDialogOpen(true);
    loadRecentInvoices();
  };

  useEffect(() => {
    if (invoiceDialogOpen) {
      loadRecentInvoices();
    }
  }, [posEbmStatusFilter]);

  const requireManagerPin = () => {
    const pin = window.prompt('Manager PIN required');
    if (!pin) {
      toast.error('Manager PIN required');
      return false;
    }
    return true;
  };

  const voidInvoice = async (invoice: PosInvoice) => {
    if (!requireManagerPin()) return;
    const reason = window.prompt('Reason for voiding this sale') || 'POS manager void';
    try {
      const response = await invoicesApi.cancel(invoice._id, reason);
      if (response.success) {
        toast.success('Sale voided with reversal');
        loadRecentInvoices();
      }
    } catch (error: any) {
      console.error('Void failed:', error);
      toast.error(error?.message || 'Failed to void sale');
    }
  };

  const refundInvoice = async (invoice: PosInvoice) => {
    if (!requireManagerPin()) return;
    try {
      const lines = (invoice.lines || []).map((line) => {
        const quantity = toNumber(line.quantity || line.qty || 1);
        const unitPrice = toNumber(line.unitPrice);
        const taxRate = toNumber(line.taxRate);
        const subtotal = line.lineSubtotal ?? quantity * unitPrice;
        const tax = line.lineTax ?? subtotal * (taxRate / 100);
        return {
          invoiceLineId: line._id,
          product: typeof line.product === 'string' ? line.product : line.product?._id,
          productName: line.productName || line.description || (typeof line.product === 'object' ? line.product?.name : undefined),
          productCode: typeof line.product === 'object' ? line.product?.sku : undefined,
          quantity,
          unitPrice,
          taxRate,
          lineSubtotal: subtotal,
          lineTax: tax,
          lineTotal: line.lineTotal ?? subtotal + tax,
          returnToWarehouse: true,
        };
      });

      const response = await creditNotesApi.create({
        invoice: invoice._id,
        creditDate: new Date().toISOString().slice(0, 10),
        type: 'goods_return',
        reason: 'POS refund',
        notes: 'Refund created from POS invoice actions',
        currencyCode: invoice.currencyCode || 'RWF',
        lines,
      });

      const creditNote = response.data as any;
      if (response.success && creditNote?._id) {
        await creditNotesApi.confirm(creditNote._id);
        toast.success('Refund credit note created and confirmed');
        navigate(`/credit-notes/${creditNote._id}`);
      }
    } catch (error: any) {
      console.error('Refund failed:', error);
      toast.error(error?.message || 'Failed to create refund');
    }
  };

  useEffect(() => {
    if (!qrDialogOpen) {
      scannerRef.current?.stop?.().catch(() => undefined);
      scannerRef.current?.clear?.();
      scannerRef.current = null;
      return;
    }

    let cancelled = false;
    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (cancelled) return;
        const scanner = new Html5Qrcode('pos-qr-reader');
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            setQrDialogOpen(false);
            findScannedProduct(decodedText);
          },
          () => undefined,
        ).catch((error: any) => {
          console.error('QR scanner failed:', error);
          toast.error('Could not start camera scanner');
        });
      })
      .catch((error) => {
        console.error('QR scanner library failed:', error);
        toast.error('QR scanner is not available');
      });

    return () => {
      cancelled = true;
      scannerRef.current?.stop?.().catch(() => undefined);
      scannerRef.current?.clear?.();
      scannerRef.current = null;
    };
  }, [qrDialogOpen, findScannedProduct]);
  
  // Calculations
  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    
    cart.forEach(item => {
      const qty = toNumber(item.cartQuantity);
      const price = toNumber(item.cartUnitPrice);
      const discount = toNumber(item.cartDiscountPct);
      const taxRate = toNumber(item.taxRate);
      
      const itemSubtotal = qty * price;
      const itemDiscount = itemSubtotal * (discount / 100);
      const itemNet = itemSubtotal - itemDiscount;
      const itemTax = itemNet * (taxRate / 100);
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });
    
    const grandTotal = subtotal - totalDiscount + totalTax;
    
    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal
    };
  }, [cart]);
  
  // Update payment amount when grand total changes
  useEffect(() => {
    setPaymentAmount(cartCalculations.grandTotal);
  }, [cartCalculations.grandTotal]);

  // Why checkout is unavailable, so a disabled button is never a dead end.
  const checkoutBlockedReason = cart.length === 0
    ? 'Add at least one product to the cart'
    : !selectedWarehouseId
      ? 'Select a warehouse'
      : !tillSession
        ? 'Open the till before recording a sale'
        : null;
  
  const handleSubmit = async () => {
    // Validation
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }
    
    if (!selectedWarehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const selectedClient = clients.find(c => c._id === selectedClientId);
      
      const requestData = {
        clientId: selectedClientId !== 'walk-in' ? selectedClientId : undefined,
        clientInfo: selectedClientId === 'walk-in' && walkInName ? {
          name: walkInName,
          contact: {}
        } : selectedClient ? {
          name: selectedClient.name,
          contact: selectedClient.contact || {}
        } : {
          name: 'Walk-in Customer',
          contact: {}
        },
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.cartQuantity,
          unitPrice: item.cartUnitPrice,
          discountPct: item.cartDiscountPct,
          taxRate: item.taxRate,
          taxCode: item.taxCode,
          description: item.name,
          unit: item.unit
        })),
        warehouseId: selectedWarehouseId,
        paymentMethod,
        paymentAmount,
        paymentReference,
        notes,
        bankAccountId: (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && bankAccountId ? bankAccountId : undefined,
        tillSession: tillSession ? {
          id: tillSession.openedAt,
          openedAt: tillSession.openedAt,
          openingFloat: Number(tillSession.openingFloat) || 0,
          status: tillSession.status,
        } : undefined,
      };
      
      const response = await salesLegacyApi.createDirectSale(requestData, sendEmail);
      
      if (response.success) {
        toast.success('Sale completed successfully!');
        const saleLog = JSON.parse(localStorage.getItem('pos-sale-log') || '[]');
        saleLog.push({
          invoiceId: response.data && (response.data as any)._id,
          completedAt: new Date().toISOString(),
          paymentMethod,
          total: cartCalculations.grandTotal,
        });
        localStorage.setItem('pos-sale-log', JSON.stringify(saleLog));
        
        // Reset form
        clearCart();
        setNotes('');
        setPaymentReference('');
        setWalkInName('');
        setSelectedClientId('walk-in');
        
        // Navigate to invoice or show receipt
        if (response.data && (response.data as any)._id) {
          navigate(`/invoices/${(response.data as any)._id}`);
        }
      } else {
        toast.error(response.message || 'Failed to complete sale');
      }
    } catch (error: any) {
      console.error('Sale error:', error);
      toast.error(error?.message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {t('salesLegacy.title', 'Direct Sale / POS')}
                  </h1>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('salesLegacy.subtitle', 'Quick cash sale — invoice and payment in one step')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedWarehouseId && (
                    <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                      <Package className="mr-1 h-3 w-3" />
                      {warehouses.find((w) => w._id === selectedWarehouseId)?.name || "Warehouse"}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    {cart.length} {cart.length === 1 ? "item" : "items"}
                  </Badge>
                  {selectedClientId !== 'walk-in' && (
                    <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                      <User className="mr-1 h-3 w-3" />
                      {clients.find((c) => c._id === selectedClientId)?.name || "Customer"}
                    </Badge>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openInvoiceActions}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Receipt className="h-4 w-4" />
                    View Invoices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { loadProducts(); loadClients(); }}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={holdSale}
                    disabled={cart.length === 0}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Hold Sale
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(cartCalculations.subtotal)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Discount</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">-{formatCurrency(cartCalculations.totalDiscount)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tax</p>
                  <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(cartCalculations.totalTax)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Grand Total</p>
                  <p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(cartCalculations.grandTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Items in Cart</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{cart.length}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Products ready to checkout
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subtotal</p>
                    <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(cartCalculations.subtotal)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Before discounts and taxes
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Discount</p>
                    <p className="mt-3 truncate text-2xl font-bold text-emerald-600 dark:text-emerald-400">-{formatCurrency(cartCalculations.totalDiscount)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <Tag className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Total line-item discounts
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Grand Total</p>
                    <p className="mt-3 truncate text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(cartCalculations.grandTotal)}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Calculator className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Total amount to collect
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column - Products */}
            <div className="lg:col-span-2 space-y-6">
              {/* Warehouse Selection */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Warehouse</label>
                      <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                        <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                          {warehouses.map((w) => (
                            <SelectItem key={w._id} value={w._id} className="dark:focus:bg-slate-800 dark:focus:text-white">{w.name} ({w.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <Input
                        placeholder="Search product name, SKU, or barcode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') findScannedProduct(searchQuery);
                        }}
                        className="h-10 bg-white pl-9 text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQrDialogOpen(true)}
                      className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ScanLine className="h-4 w-4" />
                      QR Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {(heldSales.length > 0 || tillSession) && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="space-y-3 p-5">
                    {tillSession && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                        <span className="font-medium text-emerald-800 dark:text-emerald-200">
                          Till open from {new Date(tillSession.openedAt).toLocaleTimeString()} · float {formatCurrency(tillSession.openingFloat)}
                        </span>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Closing count"
                            value={closingCountInput}
                            onChange={(e) => setClosingCountInput(e.target.value)}
                            className="h-9 w-36 bg-white dark:bg-slate-900"
                            disabled={tillLoading}
                          />
                          <Button variant="outline" size="sm" onClick={closeTill} className="h-9 gap-2" disabled={tillLoading}>
                            {tillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorClosed className="h-4 w-4" />}
                            Close Till
                          </Button>
                        </div>
                      </div>
                    )}
                    {heldSales.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recall:</span>
                        {heldSales.map((sale) => (
                          <Button key={sale.id} variant="outline" size="sm" onClick={() => recallSale(sale)} className="h-9 gap-2">
                            <RotateCcw className="h-4 w-4" />
                            {sale.label} · {sale.cart.length}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Products Grid */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="px-5 py-5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <Package className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    Products
                    {products.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">({products.length})</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="mt-2 h-3 w-1/2" />
                          <div className="mt-3 flex items-center justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                      <Package className="mb-2 h-8 w-8 opacity-50" />
                      <p>No products found. Select a warehouse and search.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((product) => (
                        <div
                          key={product._id}
                          className={`cursor-pointer rounded-lg border bg-white p-4 transition-all hover:shadow-md dark:bg-slate-900 ${
                            !product.isAvailable
                              ? 'cursor-not-allowed border-slate-200 opacity-50 dark:border-slate-800'
                              : 'border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-800'
                          }`}
                          onClick={() => product.isAvailable && addToCart(product)}
                        >
                          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{product.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {product.sku}{product.barcode ? ` · ${product.barcode}` : ''}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-950 dark:text-white">{formatCurrency(product.sellingPrice)}</span>
                            <span className={`text-xs font-medium ${toNumber(product.currentStock) > 10 ? 'text-emerald-600 dark:text-emerald-400' : toNumber(product.currentStock) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                              Stock: {toNumber(product.currentStock)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Cart & Checkout */}
            <div className="space-y-6">
              {!tillSession && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="px-5 py-5">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                      <DoorOpen className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      Open Till
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-5 pb-5">
                    <Input
                      type="number"
                      placeholder="Opening cash float"
                      value={openingFloatInput}
                      onChange={(e) => setOpeningFloatInput(e.target.value)}
                      className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                    <Button onClick={openTill} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={tillLoading}>
                      {tillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
                      Open Till
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Cart */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="px-5 py-5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <ShoppingCart className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    Cart ({cart.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {cart.length === 0 ? (
                    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                      <ShoppingCart className="mb-2 h-8 w-8 opacity-50" />
                      <p>Cart is empty. Click products to add.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div key={item._id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-950 dark:text-white">{item.name}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 shrink-0 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => removeFromCart(item._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 dark:border-slate-600 dark:text-slate-200"
                              onClick={() => updateQuantity(item._id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-semibold text-slate-950 dark:text-white">{item.cartQuantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 dark:border-slate-600 dark:text-slate-200"
                              onClick={() => updateQuantity(item._id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">Price</label>
                              <Input
                                type="number"
                                value={toNumber(item.cartUnitPrice)}
                                onChange={(e) => updatePrice(item._id, parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">Disc %</label>
                              <Input
                                type="number"
                                value={toNumber(item.cartDiscountPct)}
                                onChange={(e) => updateDiscount(item._id, parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                min={0}
                                max={100}
                              />
                            </div>
                          </div>

                          <div className="mt-2 text-right text-sm font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(
                              toNumber(item.cartQuantity) * toNumber(item.cartUnitPrice) * (1 - toNumber(item.cartDiscountPct) / 100) * (1 + toNumber(item.taxRate) / 100)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      className="mt-4 w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={clearCart}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear Cart
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Customer */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="px-5 py-5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                      <SelectValue placeholder="Select customer (or walk-in)" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      <SelectItem value="walk-in" className="dark:focus:bg-slate-800 dark:focus:text-white">Walk-in Customer</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c._id} value={c._id} className="dark:focus:bg-slate-800 dark:focus:text-white">{c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedClientId === 'walk-in' && (
                    <Input
                      placeholder="Walk-in customer name (optional)"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Payment */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="px-5 py-5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <CreditCard className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      <SelectItem value="cash" className="dark:focus:bg-slate-800 dark:focus:text-white">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" /> Cash
                        </span>
                      </SelectItem>
                      <SelectItem value="card" className="dark:focus:bg-slate-800 dark:focus:text-white">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Card
                        </span>
                      </SelectItem>
                      <SelectItem value="bank_transfer" className="dark:focus:bg-slate-800 dark:focus:text-white">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money" className="dark:focus:bg-slate-800 dark:focus:text-white">Mobile Money</SelectItem>
                      <SelectItem value="cheque" className="dark:focus:bg-slate-800 dark:focus:text-white">Cheque</SelectItem>
                    </SelectContent>
                  </Select>

                  {(paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Bank Account</label>
                      <Select value={bankAccountId} onValueChange={setBankAccountId}>
                        <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc._id} value={acc._id} className="dark:focus:bg-slate-800 dark:focus:text-white">
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Amount Received</label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="h-11 bg-white text-lg font-bold text-slate-950 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                  </div>

                  <Input
                    placeholder="Payment reference (optional)"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                  />

                  <Input
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                  />
                </CardContent>
              </Card>

              {/* Summary & Submit */}
              <Card className="overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(cartCalculations.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-medium">-{formatCurrency(cartCalculations.totalDiscount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>Tax</span>
                    <span className="font-medium">{formatCurrency(cartCalculations.totalTax)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                    <span className="text-base font-bold text-slate-950 dark:text-white">Grand Total</span>
                    <span className="text-base font-bold text-slate-950 dark:text-white">{formatCurrency(cartCalculations.grandTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {paymentAmount >= cartCalculations.grandTotal ? 'Change Due' : 'Outstanding'}
                    </span>
                    <span className={`font-semibold ${paymentAmount >= cartCalculations.grandTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(Math.abs(paymentAmount - cartCalculations.grandTotal))}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="sendEmailPOS"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <Label htmlFor="sendEmailPOS" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                      Send receipt to customer
                    </Label>
                  </div>

                  <Button
                    className="mt-3 h-12 w-full bg-indigo-600 text-base font-semibold hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !!checkoutBlockedReason}
                    title={checkoutBlockedReason || undefined}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-5 w-5" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                  {checkoutBlockedReason && !isSubmitting && (
                    <p className="mt-2 text-center text-xs font-medium text-amber-600 dark:text-amber-400">
                      {checkoutBlockedReason}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Scan product QR or barcode</DialogTitle>
            <DialogDescription>
              Point the camera at the product code. A successful scan adds the product to the current sale.
            </DialogDescription>
          </DialogHeader>
          <div id="pos-qr-reader" className="min-h-[280px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800" />
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Recent POS invoices</DialogTitle>
            <DialogDescription>
              Void keeps an audit trail through invoice cancellation. Refund creates and confirms a credit note.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Select value={posEbmStatusFilter} onValueChange={setPosEbmStatusFilter}>
              <SelectTrigger className="h-9 w-full bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:w-48">
                <SelectValue placeholder="RRA Status" />
              </SelectTrigger>
              <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                <SelectItem value="all" className="dark:text-slate-200">All RRA Status</SelectItem>
                <SelectItem value="not_submitted" className="dark:text-slate-200">Not Submitted</SelectItem>
                <SelectItem value="pending" className="dark:text-slate-200">Pending RRA</SelectItem>
                <SelectItem value="submitted" className="dark:text-slate-200">Certified</SelectItem>
                <SelectItem value="failed" className="dark:text-slate-200">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-y-auto">
            {loadingInvoices ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading invoices...</div>
            ) : recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No invoices found.</div>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice._id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-950 dark:text-white">
                      {invoice.invoiceNumber || invoice.referenceNo || invoice._id}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {invoice.client?.name || invoice.clientInfo?.name || 'Walk-in Customer'} · {invoice.status || 'unknown'} · {formatCurrency(invoice.grandTotal || invoice.totalAmount || 0, invoice.currencyCode)}
                    </div>
                    <div className="mt-2">
                      <EBMStatusBadge ebmStatus={invoice.ebm?.ebmStatus} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice._id}`)}>
                      Open
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => voidInvoice(invoice)} disabled={invoice.status === 'cancelled'}>
                      Void
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => refundInvoice(invoice)} disabled={invoice.status === 'cancelled'}>
                      Refund
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate('/invoices')}>All invoices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

