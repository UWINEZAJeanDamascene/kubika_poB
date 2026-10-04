import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Bluetooth, Cable, Check, ChevronRight, CircleHelp, Info, Network, Printer, ShieldCheck } from 'lucide-react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useCompanyStore } from '@/store/companyStore';

const connectionOptions = [
  {
    title: 'USB connection',
    icon: Cable,
    number: '01',
    description: 'Connect the printer to this device, then add it in your operating system printer settings.',
    detail: 'If it is not listed, install the driver from the printer manufacturer.',
    tag: 'Direct connection',
  },
  {
    title: 'Bluetooth connection',
    icon: Bluetooth,
    number: '02',
    description: 'Pair the printer in Bluetooth settings on this device before opening the print dialog.',
    detail: 'Some receipt printers need a vendor print service to appear as a printer.',
    tag: 'Pair this device',
  },
  {
    title: 'Network connection',
    icon: Network,
    number: '03',
    description: 'Add the Ethernet or Wi-Fi printer in your operating system or mobile print settings.',
    detail: 'Keep the printer and POS device on a network that can reach each other.',
    tag: 'Ethernet or Wi-Fi',
  },
];

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

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:space-y-8 lg:py-8">
        <div className="printer-setup-chrome flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="outline" size="icon" className="shrink-0 rounded-xl" aria-label="Back to POS">
              <Link to="/sales-legacy"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-500">
                <Printer className="h-3.5 w-3.5" /> Point of sale
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Printer setup</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Set up a printer on this device and check it with a sample receipt.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select value={paperWidth} onValueChange={(value: '58' | '80') => setPaperWidth(value)}>
              <SelectTrigger className="h-11 w-full rounded-xl sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="58">58 mm paper</SelectItem><SelectItem value="80">80 mm paper</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => window.print()} className="h-11 rounded-xl">
              <Printer className="mr-2 h-4 w-4" /> Print test slip
            </Button>
          </div>
        </div>

        <section className="printer-setup-chrome relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-cyan-500/10 to-transparent lg:block" />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Device-based printing
              </span>
              <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white sm:text-2xl">Your printer is managed by this device</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                KUBIKA prepares the receipt. Your browser opens the system print window, where you choose an available printer and confirm the paper settings.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60 lg:min-w-64">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300"><ShieldCheck className="h-5 w-5" /></div>
              <div><p className="text-sm font-semibold text-slate-900 dark:text-white">Private to this device</p><p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Printer discovery stays in your system settings.</p></div>
            </div>
          </div>
        </section>

        <section className="printer-setup-chrome space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">Before you print</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Connect your printer</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose the connection type you use</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {connectionOptions.map(({ title, icon: Icon, number, description, detail, tag }) => (
              <article key={title} className="group rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-cyan-400/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300"><Icon className="h-5 w-5" /></div>
                  <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-600">{number}</span>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
                <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />{detail}
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Check className="h-3 w-3 text-emerald-500" />{tag}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="printer-setup-chrome grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="font-semibold text-slate-950 dark:text-white">Run a test print</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Use a sample slip to confirm the printer, paper width, and character output.</p>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {['Connect and add the printer in device settings', 'Choose the receipt paper width above', 'Print the test slip and select your printer'].map((step, index) => (
                <li key={step} className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">{index + 1}</span>
                  <span className="text-xs leading-5 text-slate-600 dark:text-slate-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/70 dark:bg-amber-950/20 sm:p-6">
            <div className="flex gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"><CircleHelp className="h-4 w-4" /></div>
              <div>
                <h2 className="font-semibold text-amber-950 dark:text-amber-100">Printer not listed?</h2>
                <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75">Install the manufacturer driver or enable its print service, then reopen the test print window. KUBIKA cannot silently find or select printers from the browser.</p>
                <Button variant="link" className="mt-2 h-auto p-0 text-amber-900 dark:text-amber-200" onClick={() => window.print()}>
                  Open print window <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div id="pos-printer-test" className="mx-auto hidden w-full max-w-[460px] rounded-lg border border-slate-300 bg-white p-5 font-mono text-sm text-black print:block">
          <div className="text-center">
            <h2 className="text-lg font-bold">{company?.name || 'KUBIKA POS'}</h2>
            <p>PRINTER CONNECTION TEST</p>
            <p className="my-3 border-y border-dashed py-2 font-bold">TEST SLIP - NOT A FISCAL RECEIPT</p>
          </div>
          <div className="space-y-1">
            <p>Paper profile: {paperWidth} mm</p>
            <p>Time: {new Date().toLocaleString()}</p>
            <p>Test text: 0123456789 ABCDEFG abcdefg</p>
            <p>Character test: Rwanda - KUBIKA - RWF</p>
          </div>
          <p className="mt-4 border-t border-dashed pt-3 text-center">Printer test complete</p>
        </div>
      </main>
    </Layout>
  );
}
