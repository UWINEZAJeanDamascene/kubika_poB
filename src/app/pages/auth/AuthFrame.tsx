import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { Activity, ArrowLeft, Check, Layers3, LockKeyhole } from 'lucide-react';
import muiTheme from '@/theme/muiTheme';
import { LanguageSelector } from '@/app/components/LanguageSelector';

interface AuthFrameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  sideTitle?: string;
  sideCopy?: string;
  sideItems?: string[];
}

const systemLog = [
  '[07:42:15] SECURE CHANNEL / READY',
  '[07:42:16] TENANT BOUNDARY / VERIFIED',
  '[07:42:17] AUDIT STREAM / LISTENING',
  '[07:42:18] OPERATIONS CORE / NOMINAL',
];

export function AuthFrame({ eyebrow, title, subtitle, children, sideTitle, sideCopy, sideItems }: AuthFrameProps) {
  const { t } = useTranslation();
  const resolvedSideTitle = sideTitle ?? t('auth.secureAccessTitle');
  const resolvedSideCopy = sideCopy ?? t('auth.secureAccessCopy');
  const resolvedSideItems = sideItems ?? [t('auth.secureAccessItems.tenantSecurity'), t('auth.secureAccessItems.rolePermissions'), t('auth.secureAccessItems.auditSessions')];

  return (
    <MuiThemeProvider theme={muiTheme}>
      <div className="industrial-auth min-h-screen bg-[var(--industrial-bg)] text-[var(--industrial-ink)]">
      <header className="border-b border-[var(--industrial-copper)]/45 bg-[var(--industrial-bg)]">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link to="/" className="inline-flex items-center gap-3" aria-label={t('auth.brandName')}>
            <span className="grid h-10 w-10 place-items-center border border-[var(--industrial-copper)] bg-[var(--industrial-copper)] text-[var(--industrial-bg)]"><Layers3 className="h-5 w-5" strokeWidth={1.8} /></span>
            <span className="leading-none"><span className="block font-mono text-sm font-bold tracking-[0.18em]">{t('auth.brandName')}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--industrial-muted)]">{t('auth.accessConsole')}</span></span>
          </Link>
          <Stack direction="row" alignItems="center" spacing={1}>
            <div className="hidden sm:block"><LanguageSelector variant="landing" className="!text-[var(--industrial-muted)] hover:!bg-white/10 hover:!text-[var(--industrial-ink)]" /></div>
            <Button component={Link} to="/" variant="text" color="inherit" startIcon={<ArrowLeft className="h-4 w-4" />} className="!px-2 !text-[10px] !text-[var(--industrial-muted)] hover:!text-[var(--industrial-ink)]">{t('auth.home')}</Button>
          </Stack>
        </div>
      </header>

      <main className="industrial-grid mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch lg:px-12 lg:py-12">
        <section className="relative hidden overflow-hidden border border-white/10 bg-[var(--industrial-panel)] p-8 lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between xl:p-12">
          <div><p className="industrial-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--industrial-copper)]">ACCESS / CONTEXT</p><h1 className="industrial-display mt-7 max-w-xl text-7xl leading-[0.82] text-[var(--industrial-ink)]">{resolvedSideTitle}</h1><p className="mt-7 max-w-md text-sm leading-7 text-[var(--industrial-muted)]">{resolvedSideCopy}</p></div>
          <div className="mt-12 border border-white/10 bg-[var(--industrial-bg)] p-5"><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--industrial-muted)]"><Activity className="h-4 w-4 text-[var(--industrial-copper)]" />SYSTEM ACTIVITY</span><span className="h-2 w-2 bg-[var(--industrial-olive)]" /></div><Stack spacing={1.75} className="mt-5">{systemLog.map((line) => <p key={line} className="font-mono text-[10px] text-[var(--industrial-muted)]"><span className="mr-2 text-[var(--industrial-olive)]">›</span>{line}</p>)}</Stack></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">{resolvedSideItems.map((item) => <div key={item} className="flex items-center gap-3 border border-white/10 p-3"><Check className="h-4 w-4 shrink-0 text-[var(--industrial-copper)]" /><span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--industrial-muted)]">{item}</span></div>)}</div>
        </section>

        <section className="self-center border border-white/10 bg-[var(--industrial-panel)] p-6 sm:p-9 lg:min-h-[680px] lg:p-12">
          <div className="mb-9 border-b border-white/10 pb-7"><div className="flex items-center justify-between gap-4"><p className="industrial-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--industrial-copper)]">{eyebrow}</p><LockKeyhole className="h-4 w-4 text-[var(--industrial-muted)]" /></div><h2 className="industrial-display mt-4 text-6xl leading-[0.84] text-[var(--industrial-ink)] sm:text-7xl">{title}</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[var(--industrial-muted)]">{subtitle}</p></div>
          {children}
        </section>
      </main>
      </div>
    </MuiThemeProvider>
  );
}
