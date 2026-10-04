import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { posReceiptApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type ReceiptLine = {
  itemName?: string;
  quantity?: number | string;
  unit?: string;
  unitPriceRwf?: string;
  taxableAmountRwf?: string;
  vatAmountRwf?: string;
  lineTotalRwf?: string;
};

const money = (value: unknown, currency = 'RWF') => {
  if (value == null || value === '') return `${currency} 0`;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? `${currency} ${numeric.toLocaleString('en-RW', { maximumFractionDigits: 2 })}` : String(value);
};

export default function PosReceiptPage() {
  const { invoiceId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = useAuthStore((state) => state.activeCompanyId) || 'workspace';
  const printKey = `kubika:pos-paper-width:${companyId}`;
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>(() => {
    const saved = localStorage.getItem(printKey);
    return saved === '58' ? '58' : '80';
  });
  const autoPrintStarted = useRef(false);
  const receiptQuery = useQuery({
    queryKey: ['pos', 'receipt', companyId, invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const response = await posReceiptApi.get(invoiceId);
      if (!response.success || !response.data) throw new Error('Receipt could not be loaded.');
      return response.data;
    },
  });

  const receipt = receiptQuery.data;
  const receiptLines: ReceiptLine[] = useMemo(() => {
    const rows = receipt?.receiptLines;
    return Array.isArray(rows) ? rows : [];
  }, [receipt]);
  const currency = receipt?.currencyCode || 'RWF';
  const invoiceNumber = receipt?.invoiceNumber || receipt?.referenceNo || invoiceId;
  const customerName = receipt?.client?.name || receipt?.clientInfo?.name || 'Walk-in Customer';
  const fiscalStatus = String(receipt?.ebm?.ebmStatus || 'not_submitted').toLowerCase();
  const fiscalLabel = fiscalStatus === 'submitted' || fiscalStatus === 'success'
    ? 'Fiscal receipt certified'
    : fiscalStatus === 'failed'
      ? 'Fiscal receipt not certified'
      : 'Fiscal submission pending';

  useEffect(() => {
    localStorage.setItem(printKey, paperWidth);
  }, [paperWidth, printKey]);

  useEffect(() => {
    if (!receipt || searchParams.get('print') !== '1' || autoPrintStarted.current) return;
    autoPrintStarted.current = true;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [receipt, searchParams]);

  const handlePrint = () => {
    if (!receipt) return;
    window.print();
  };

  return (
    <Layout>
      <style>{`
        @page { size: ${paperWidth}mm auto; margin: 3mm; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; min-width: 0 !important; }
          body * { visibility: hidden !important; }
          #pos-thermal-receipt, #pos-thermal-receipt * { visibility: visible !important; }
          #pos-thermal-receipt { position: absolute !important; inset: 0 auto auto 0 !important; width: ${Number(paperWidth) - 6}mm !important; max-width: ${Number(paperWidth) - 6}mm !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; color: #000 !important; background: #fff !important; }
          #pos-thermal-receipt * { color: #000 !important; border-color: #777 !important; }
          .pos-receipt-controls, .pos-receipt-page-chrome { display: none !important; }
          .pos-receipt-line { break-inside: avoid; }
        }
      `}</style>
      <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:py-8">
        <header className="pos-receipt-controls flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Back to POS" onClick={() => navigate('/sales-legacy')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-950 dark:text-white">POS receipt</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Select a printer in your device’s print window.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={paperWidth} onValueChange={(value: '58' | '80') => setPaperWidth(value)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58 mm paper</SelectItem>
                <SelectItem value="80">80 mm paper</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePrint} disabled={!receipt}>
              <Printer className="mr-2 h-4 w-4" /> Print receipt
            </Button>
          </div>
        </header>

        {receiptQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading receipt…</div>
        ) : receiptQuery.isError ? (
          <section className="rounded-xl border border-rose-300 bg-white p-6 dark:border-rose-900 dark:bg-slate-900">
            <p className="font-semibold text-rose-600">{receiptQuery.error.message}</p>
            <Button className="mt-4" variant="outline" onClick={() => void receiptQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
          </section>
        ) : receipt ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <article id="pos-thermal-receipt" className="mx-auto w-full max-w-[460px] rounded-lg border border-slate-200 bg-white p-5 font-mono text-[13px] text-slate-950 shadow-sm dark:border-slate-700 dark:bg-white dark:text-slate-950">
              <div className="text-center">
                <h2 className="text-lg font-bold uppercase">{receipt.companyReceipt?.name || 'Business'}</h2>
                {receipt.companyReceipt?.tin && <p>TIN: {receipt.companyReceipt.tin}</p>}
                {receipt.companyReceipt?.address && <p>{receipt.companyReceipt.address}</p>}
                {receipt.companyReceipt?.phone && <p>{receipt.companyReceipt.phone}</p>}
                <p className="my-3 border-y border-dashed py-2 text-sm font-bold">SALES RECEIPT</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between gap-2"><span>Receipt</span><span className="text-right">{invoiceNumber}</span></div>
                <div className="flex justify-between gap-2"><span>Date</span><span className="text-right">{receipt.invoiceDate ? new Date(receipt.invoiceDate).toLocaleString() : '—'}</span></div>
                <div className="flex justify-between gap-2"><span>Customer</span><span className="max-w-[65%] text-right">{customerName}</span></div>
                {receipt.customerTinDisplay && <div className="flex justify-between gap-2"><span>Customer TIN</span><span>{receipt.customerTinDisplay}</span></div>}
                {receipt.createdBy?.name && <div className="flex justify-between gap-2"><span>Served by</span><span>{receipt.createdBy.name}</span></div>}
              </div>

              <div className="my-3 border-y border-dashed py-2">
                <div className="mb-2 grid grid-cols-[1fr_auto] gap-2 font-bold"><span>Item</span><span>Total</span></div>
                {receiptLines.map((line, index) => (
                  <div className="pos-receipt-line mb-3" key={`${line.itemName || 'item'}-${index}`}>
                    <p className="break-words font-semibold">{line.itemName || 'Item'}</p>
                    <div className="flex justify-between gap-2"><span>{line.quantity ?? 0} {line.unit || ''} × {line.unitPriceRwf || money(0, currency)}</span><span>{line.lineTotalRwf || money(0, currency)}</span></div>
                  </div>
                ))}
                {!receiptLines.length && <p>No item lines were returned for this receipt.</p>}
              </div>

              <div className="space-y-1">
                {(receipt.rraTotals?.taxableByType || []).map((row: any) => (
                  <div className="flex justify-between gap-2" key={row.code}><span>{row.label || `Taxable ${row.code}`}</span><span>{row.amountRwf || money(row.amount, currency)}</span></div>
                ))}
                <div className="flex justify-between gap-2"><span>Taxable total</span><span>{receipt.rraTotals?.totalTaxableAmountRwf || money(receipt.subtotal, currency)}</span></div>
                <div className="flex justify-between gap-2"><span>VAT</span><span>{receipt.rraTotals?.totalVatRwf || money(receipt.totalTax, currency)}</span></div>
                <div className="mt-2 flex justify-between gap-2 border-t border-dashed pt-2 text-base font-bold"><span>TOTAL</span><span>{receipt.rraTotals?.grandTotalRwf || money(receipt.grandTotal || receipt.totalAmount, currency)}</span></div>
              </div>

              <div className="mt-3 space-y-1 border-t border-dashed pt-2">
                <p className="font-bold">Payment</p>
                {(receipt.paymentReceipt?.methods || []).map((payment: any, index: number) => (
                  <div className="flex justify-between gap-2" key={`${payment.method}-${index}`}><span className="capitalize">{payment.method}</span><span>{payment.amountRwf}</span></div>
                ))}
                <div className="flex justify-between gap-2"><span>Paid</span><span>{receipt.paymentReceipt?.amountPaidRwf || money(receipt.amountPaid, currency)}</span></div>
                {Number(receipt.paymentReceipt?.changeGivenRwf?.replace?.(/[^0-9.-]/g, '') || 0) > 0 && <div className="flex justify-between gap-2"><span>Change</span><span>{receipt.paymentReceipt.changeGivenRwf}</span></div>}
              </div>

              <div className="mt-3 border-t border-dashed pt-2 text-center">
                <p className="font-bold">{fiscalLabel}</p>
                {receipt.ebm?.rcptNoDisplay && <p>RRA receipt: {receipt.ebm.rcptNoDisplay}</p>}
                {receipt.ebm?.sdcId && <p>SDC: {receipt.ebm.sdcId}</p>}
                {receipt.ebm?.rcptSignDisplay && <p className="break-all text-[10px]">Signature: {receipt.ebm.rcptSignDisplay}</p>}
                {receipt.ebm?.qrCodeDataUrl && <img src={receipt.ebm.qrCodeDataUrl} alt="RRA receipt QR code" className="mx-auto mt-2 h-28 w-28 object-contain" />}
                <p className="mt-3 font-bold">Thank you for your business</p>
              </div>
            </article>

            <aside className="pos-receipt-controls h-fit space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-900 dark:text-white">Printer setup</h2>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Connect or pair the printer in your device settings first. In the print window, choose that printer and set paper width, scale, and margins.</p>
              <ul className="list-disc space-y-2 pl-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                <li>USB and Bluetooth printers must appear in your device’s printer list.</li>
                <li>Ethernet printers must be added to the operating system or mobile print service.</li>
                <li>On iPhone and iPad, choose an AirPrint printer or an installed manufacturer print service.</li>
              </ul>
              <Button asChild variant="outline" className="w-full"><Link to={`/invoices/${invoiceId}`}><FileText className="mr-2 h-4 w-4" />Open invoice</Link></Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/sales-legacy')}><ArrowLeft className="mr-2 h-4 w-4" />Return to POS</Button>
            </aside>
          </div>
        ) : null}
      </main>
    </Layout>
  );
}
