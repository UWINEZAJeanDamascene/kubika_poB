import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Bluetooth, Cable, Printer, Wifi } from 'lucide-react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useCompanyStore } from '@/store/companyStore';

export default function PosPrinterSetupPage() {
  const companyId = useAuthStore((state) => state.activeCompanyId) || 'workspace';
  const company = useCompanyStore((state) => state.company);
  const storageKey = `kubika:pos-paper-width:${companyId}`;
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>(() => localStorage.getItem(storageKey) === '58' ? '58' : '80');

  useEffect(() => {
    localStorage.setItem(storageKey, paperWidth);
  }, [paperWidth, storageKey]);

  return (
    <Layout>
      <style>{`
        @page { size: ${paperWidth}mm auto; margin: 3mm; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; }
          body * { visibility: hidden !important; }
          #pos-printer-test, #pos-printer-test * { visibility: visible !important; }
          #pos-printer-test { position: absolute !important; inset: 0 auto auto 0 !important; width: ${Number(paperWidth) - 6}mm !important; max-width: ${Number(paperWidth) - 6}mm !important; margin: 0 !important; padding: 0 !important; color: #000 !important; background: #fff !important; }
          #pos-printer-test * { color: #000 !important; }
          .printer-setup-chrome { display: none !important; }
        }
      `}</style>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-6 lg:py-8">
        <header className="printer-setup-chrome flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" aria-label="Back to POS"><Link to="/sales-legacy"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600">Point of Sale</p>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Printer setup</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={paperWidth} onValueChange={(value: '58' | '80') => setPaperWidth(value)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="58">58 mm paper</SelectItem><SelectItem value="80">80 mm paper</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print test slip</Button>
          </div>
        </header>

        <section className="printer-setup-chrome grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <Cable className="mb-3 h-5 w-5 text-cyan-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">USB printer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Connect it to the device and install the manufacturer driver or operating system printer service. It will appear in the print window.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <Bluetooth className="mb-3 h-5 w-5 text-cyan-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Bluetooth printer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Pair it in device settings and enable its printer service or vendor print service before opening the print window.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <Wifi className="mb-3 h-5 w-5 text-cyan-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Ethernet / Wi-Fi printer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Add the printer by its network address in the operating system or mobile print service. Use the same network as the POS device.</p>
          </div>
        </section>

        <section className="printer-setup-chrome rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <strong>Device-managed printing:</strong> KUBIKA sends receipt pages to the browser’s print service. Your selected printer and connection stay on this POS device; printer discovery does not send device or network details to the tenant server. Automatic silent printer selection is blocked by browsers, so choose the printer in the system print window.
        </section>

        <div id="pos-printer-test" className="mx-auto hidden w-full max-w-[460px] rounded-lg border border-slate-300 bg-white p-5 font-mono text-sm text-black print:block">
          <div className="text-center">
            <h2 className="text-lg font-bold">{company?.name || 'KUBIKA POS'}</h2>
            <p>PRINTER CONNECTION TEST</p>
            <p className="my-3 border-y border-dashed py-2 font-bold">TEST SLIP — NOT A FISCAL RECEIPT</p>
          </div>
          <div className="space-y-1">
            <p>Paper profile: {paperWidth} mm</p>
            <p>Time: {new Date().toLocaleString()}</p>
            <p>Test text: 0123456789 ABCDEFG abcdefg</p>
            <p>Character test: Rwanda — KUBIKA — RWF</p>
          </div>
          <p className="mt-4 border-t border-dashed pt-3 text-center">Printer test complete</p>
        </div>
      </main>
    </Layout>
  );
}
