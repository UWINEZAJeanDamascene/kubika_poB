import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ArrowUpRight, Check } from 'lucide-react';
import { createMuiTheme } from '@/theme/muiTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BrandMark, PublicHeader } from '@/app/components/public/PublicHeader';
import {
  CopperActionButton,
  QuietActionLink,
  RegistrationMark,
  RuleLabel,
} from '@/app/components/public/PublicPrimitives';

interface OperatingRecordRow {
  number: string;
  label: string;
  detail: string;
  artifact: string;
  href?: string;
}

interface OperatingPathStation {
  number: string;
  label: string;
  copy: string;
  artifact: string;
}

interface SecurityControl {
  label: string;
  meaning: string;
}

const rwandaBusinessImage =
  'https://images.unsplash.com/photo-1583225358814-4094d1a8aef2?auto=format&fit=crop&w=1400&q=80';

export default function HomePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const pageTheme = useMemo(() => createMuiTheme(theme), [theme]);
  const systemHref = user?.role === 'platform_admin' ? '/platform-admin' : '/dashboard';

  const navItems = [
    { label: t('landing.home.nav.covers'), href: '#platform' },
    { label: t('landing.home.nav.branches'), href: '#branches' },
    { label: t('landing.home.nav.security'), href: '#security' },
  ];

  const operatingRecord: OperatingRecordRow[] = [
    {
      number: '01',
      label: t('landing.home.record.stock.label'),
      detail: t('landing.home.record.stock.detail'),
      artifact: 'Warehouse KGL-01',
      href: '#platform',
    },
    {
      number: '02',
      label: t('landing.home.record.purchasing.label'),
      detail: t('landing.home.record.purchasing.detail'),
      artifact: 'PO-1048',
      href: '#platform',
    },
    {
      number: '03',
      label: t('landing.home.record.accounting.label'),
      detail: t('landing.home.record.accounting.detail'),
      artifact: t('landing.home.record.accounting.artifact'),
    },
    {
      number: '04',
      label: t('landing.home.record.payroll.label'),
      detail: t('landing.home.record.payroll.detail'),
      artifact: t('landing.home.record.payroll.artifact'),
    },
    {
      number: '05',
      label: t('landing.home.record.reporting.label'),
      detail: t('landing.home.record.reporting.detail'),
      artifact: t('landing.home.record.reporting.artifact'),
    },
    {
      number: '06',
      label: t('landing.home.record.vatRra.label'),
      detail: t('landing.home.record.vatRra.detail'),
      artifact: t('landing.home.record.vatRra.artifact'),
    },
  ];

  const operatingPath: OperatingPathStation[] = [
    {
      number: '01',
      label: t('landing.home.path.stock.label'),
      copy: t('landing.home.path.stock.copy'),
      artifact: 'KGL-01 / reorder levels',
    },
    {
      number: '02',
      label: t('landing.home.path.purchasing.label'),
      copy: t('landing.home.path.purchasing.copy'),
      artifact: 'PO-1048 / goods received',
    },
    {
      number: '03',
      label: t('landing.home.path.accounting.label'),
      copy: t('landing.home.path.accounting.copy'),
      artifact: 'Cash / sales / expenses',
    },
    {
      number: '04',
      label: t('landing.home.path.payroll.label'),
      copy: t('landing.home.path.payroll.copy'),
      artifact: 'Employee records / payroll',
    },
    {
      number: '05',
      label: t('landing.home.path.reporting.label'),
      copy: t('landing.home.path.reporting.copy'),
      artifact: 'Branch / company reports',
    },
    {
      number: '06',
      label: t('landing.home.path.vatRra.label'),
      copy: t('landing.home.path.vatRra.copy'),
      artifact: 'VAT / RRA reporting',
    },
  ];

  const securityControls: SecurityControl[] = [
    {
      label: t('landing.home.security.controls.workspace.label'),
      meaning: t('landing.home.security.controls.workspace.meaning'),
    },
    {
      label: t('landing.home.security.controls.roles.label'),
      meaning: t('landing.home.security.controls.roles.meaning'),
    },
    {
      label: t('landing.home.security.controls.history.label'),
      meaning: t('landing.home.security.controls.history.meaning'),
    },
    {
      label: t('landing.home.security.controls.offline.label'),
      meaning: t('landing.home.security.controls.offline.meaning'),
    },
  ];

  const primaryHref = isAuthenticated ? systemHref : '/register';
  const primaryLabel = isAuthenticated
    ? t('landing.home.openWorkspace')
    : t('landing.home.createWorkspace');

  return (
    <MuiThemeProvider theme={pageTheme}>
      <div className="public-shell min-h-screen overflow-x-hidden">
        <PublicHeader
          navItems={navItems}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
        />

        <main>
          <section className="public-home-hero" aria-labelledby="home-title">
            <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
              <div className="grid items-center gap-14 lg:grid-cols-[5fr_7fr] lg:gap-16">
                <Stack spacing={0} className="max-w-xl">
                  <RuleLabel>{t('landing.home.heroLabel')}</RuleLabel>
                  <h1 id="home-title" className="public-display mt-5 max-w-[12ch] text-[clamp(3.4rem,6.2vw,6.25rem)] leading-[0.94] text-(--public-ink)">
                    {t('landing.home.heroTitle')}
                  </h1>
                  <p className="public-body mt-7 max-w-lg text-base leading-7 text-(--public-ink-muted) sm:text-lg">
                    {t('landing.home.heroSubtitle')}
                  </p>
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2} className="mt-9">
                    <CopperActionButton component={Link} to={primaryHref}>
                      {primaryLabel}
                    </CopperActionButton>
                    {!isAuthenticated && (
                      <QuietActionLink to="/login">
                        {t('landing.home.alreadyHaveWorkspace')}
                      </QuietActionLink>
                    )}
                  </Stack>
                  <p className="public-mono mt-10 max-w-lg border-t border-(--public-rule) pt-5 text-[0.6875rem] leading-6 text-(--public-ink-muted)">
                    {t('landing.home.moduleLine')}
                  </p>
                </Stack>

                <div className="relative lg:pt-6">
                  <RegistrationMark className="absolute -top-1 left-0" />
                  <section className="public-record-surface" aria-labelledby="record-title">
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={3} className="border-b border-(--public-rule-strong) pb-5">
                      <div>
                        <RuleLabel className="text-(--public-ink-muted)">{t('landing.home.recordLabel')}</RuleLabel>
                        <h2 id="record-title" className="public-record-surface__title mt-2">
                          {t('landing.home.recordTitle')}
                        </h2>
                      </div>
                      <span className="public-mono shrink-0 text-[0.6875rem] text-(--public-ink-muted)">RWF / RW</span>
                    </Stack>
                    <Stack component="ol" spacing={0} className="mt-1">
                      {operatingRecord.map((row) => {
                        const rowContent = (
                          <Stack direction="row" alignItems="center" gap={3} className="public-record-row">
                            <span className="public-mono public-record-row__number">{row.number}</span>
                            <Stack spacing={0.5} className="min-w-0 flex-1">
                              <span className="public-record-row__label">{row.label}</span>
                              <span className="public-record-row__detail">{row.detail}</span>
                            </Stack>
                            <span className="public-mono public-record-row__artifact">{row.artifact}</span>
                            {row.href ? <ArrowUpRight className="public-record-row__arrow" aria-hidden="true" /> : <span className="public-record-row__arrow-placeholder" aria-hidden="true" />}
                          </Stack>
                        );

                        return (
                          <li key={row.number}>
                            {row.href ? (
                              <Link to={row.href} className="public-record-row-link">
                                {rowContent}
                              </Link>
                            ) : (
                              rowContent
                            )}
                          </li>
                        );
                      })}
                    </Stack>
                    <p className="public-record-surface__footer public-mono mt-5 border-t border-(--public-rule) pt-4">
                      {t('landing.home.recordFooter')}
                    </p>
                  </section>
                </div>
              </div>
            </div>
          </section>

          <section id="platform" className="scroll-mt-20 border-t border-(--public-rule)" aria-labelledby="platform-title">
            <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
              <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
                <Stack spacing={0} className="max-w-md">
                  <RuleLabel>{t('landing.home.platformLabel')}</RuleLabel>
                  <h2 id="platform-title" className="public-display mt-5 text-[clamp(2.8rem,5vw,5.25rem)] leading-[0.98] text-(--public-ink)">
                    {t('landing.home.platformTitle')}
                  </h2>
                  <p className="public-body mt-6 text-base leading-7 text-(--public-ink-muted)">
                    {t('landing.home.platformSubtitle')}
                  </p>
                </Stack>

                <ol className="public-operating-path">
                  {operatingPath.map((station) => (
                    <li key={station.number} className="public-operating-path__station">
                      <span className="public-mono public-operating-path__number">{station.number}</span>
                      <h3 className="public-operating-path__label">{station.label}</h3>
                      <p className="public-operating-path__copy">{station.copy}</p>
                      <span className="public-mono public-operating-path__artifact">{station.artifact}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section id="branches" className="scroll-mt-20 border-y border-(--public-rule) bg-(--public-surface)" aria-labelledby="branches-title">
            <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
              <div className="grid items-start gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-0">
                <figure className="public-branch-figure">
                  <img
                    src={rwandaBusinessImage}
                    alt="Business owner reviewing work documents in Rwanda — photo by Placide IRANDORA on Unsplash"
                    loading="lazy"
                    decoding="async"
                    className="public-branch-figure__image"
                  />
                  <figcaption className="public-mono mt-4 max-w-xl text-[0.6875rem] leading-5 text-(--public-ink-muted)">
                    {t('landing.home.branches.imageCaption')}
                  </figcaption>
                </figure>
                <Stack spacing={0} className="lg:pl-12">
                  <RuleLabel>{t('landing.home.branchesLabel')}</RuleLabel>
                  <h2 id="branches-title" className="public-display mt-5 text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1] text-(--public-ink)">
                    {t('landing.home.branchesTitle')}
                  </h2>
                  <p className="public-body mt-6 text-base leading-7 text-(--public-ink-muted)">
                    {t('landing.home.branchesSubtitle')}
                  </p>
                  <Stack component="ul" spacing={0} className="mt-8 border-t border-(--public-rule-strong)">
                    {[
                      t('landing.home.branches.items.view'),
                      t('landing.home.branches.items.connected'),
                      t('landing.home.branches.items.separate'),
                      t('landing.home.branches.items.ready'),
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 border-b border-(--public-rule) py-4 text-sm font-semibold text-(--public-ink)">
                        <Check className="h-4 w-4 shrink-0 text-(--public-positive)" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </Stack>
                  <QuietActionLink to="/operations" className="mt-8">
                    {t('landing.home.branches.viewModel')}
                  </QuietActionLink>
                </Stack>
              </div>
            </div>
          </section>

          <section id="security" className="scroll-mt-20" aria-labelledby="security-title">
            <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
              <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
                <Stack spacing={0} className="max-w-md">
                  <RuleLabel>{t('landing.home.securityLabel')}</RuleLabel>
                  <h2 id="security-title" className="public-display mt-5 text-[clamp(2.8rem,5vw,5.25rem)] leading-[0.98] text-(--public-ink)">
                    {t('landing.home.securityTitle')}
                  </h2>
                  <p className="public-body mt-6 text-base leading-7 text-(--public-ink-muted)">
                    {t('landing.home.securitySubtitle')}
                  </p>
                  <div className="public-control-chain public-mono mt-9" aria-label={t('landing.home.security.chainLabel')}>
                    {[t('landing.home.security.chain.workspace'), t('landing.home.security.chain.roles'), t('landing.home.security.chain.history'), t('landing.home.security.chain.backups')].map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </Stack>

                <div className="public-control-register">
                  <table>
                    <caption className="sr-only">{t('landing.home.security.tableCaption')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('landing.home.security.controlHeading')}</th>
                        <th scope="col">{t('landing.home.security.meaningHeading')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityControls.map((control) => (
                        <tr key={control.label}>
                          <th scope="row">{control.label}</th>
                          <td>{control.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="public-home-cta" aria-labelledby="cta-title">
            <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:justify-between lg:px-10">
              <Stack spacing={0} className="max-w-2xl">
                <RuleLabel className="text-(--public-paper)/75">{t('landing.home.ctaLabel')}</RuleLabel>
                <h2 id="cta-title" className="public-display mt-4 text-[clamp(2.8rem,5vw,5.5rem)] leading-[0.98] text-(--public-paper)">
                  {t('landing.home.ctaTitle')}
                </h2>
                <p className="public-body mt-5 max-w-xl text-base leading-7 text-(--public-paper)/80">
                  {t('landing.home.ctaSubtitle')}
                </p>
              </Stack>
              <Stack alignItems={{ xs: 'flex-start', lg: 'flex-end' }} spacing={2}>
                <Button component={Link} to={primaryHref} variant="contained" color="inherit" endIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />} className="public-inverse-action !px-5 !py-3">
                  {primaryLabel}
                </Button>
                <QuietActionLink to="/pricing" className="text-(--public-paper) hover:text-(--public-paper) focus-visible:text-(--public-paper)">
                  {t('landing.home.reviewPricing')}
                </QuietActionLink>
              </Stack>
            </div>
          </section>
        </main>

        <footer className="border-t border-(--public-rule) bg-(--public-paper)">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-5 py-9 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <Link to="/" aria-label="KUBIKA home">
              <BrandMark />
            </Link>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-(--public-ink-muted)">
              <Link to="/pricing" className="public-footer-link">{t('landing.home.footer.pricing')}</Link>
              <Link to="/trust" className="public-footer-link">{t('landing.home.footer.security')}</Link>
              <a href="mailto:jayfcode@gmail.com" className="public-footer-link">{t('landing.home.footer.contact')}</a>
              <span>{t('landing.home.footer.copyright', { year: new Date().getFullYear() })}</span>
            </div>
          </div>
        </footer>
      </div>
    </MuiThemeProvider>
  );
}
