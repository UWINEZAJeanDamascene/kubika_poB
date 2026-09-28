import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  MapPin,
  MoveUpRight,
} from 'lucide-react';
import { createMuiTheme } from '@/theme/muiTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BrandMark, PublicHeader } from '@/app/components/public/PublicHeader';
import { CopperActionButton, RuleLabel } from '@/app/components/public/PublicPrimitives';

export default function HomePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const pageTheme = useMemo(() => createMuiTheme(theme), [theme]);
  const systemHref = user?.role === 'platform_admin' ? '/platform-admin' : '/dashboard';
  const primaryHref = isAuthenticated ? systemHref : '/register';
  const primaryLabel = isAuthenticated
    ? t('landing.home.openWorkspace')
    : t('landing.home.createWorkspace');

  const navItems = [
    { label: t('landing.home.nav.covers'), href: '#operations' },
    { label: t('landing.home.nav.branches'), href: '#branches' },
  ];
  const operations = [
    { icon: Boxes, label: t('landing.home.path.stock.label'), detail: t('landing.home.record.stock.detail') },
    { icon: ClipboardCheck, label: t('landing.home.path.purchasing.label'), detail: t('landing.home.record.purchasing.detail') },
    { icon: CircleDollarSign, label: t('landing.home.path.accounting.label'), detail: t('landing.home.record.accounting.detail') },
  ];

  return (
    <MuiThemeProvider theme={pageTheme}>
      <div className="public-shell public-home min-h-screen overflow-x-hidden">
        <PublicHeader navItems={navItems} primaryHref={primaryHref} primaryLabel={primaryLabel} />

        <main>
          <section className="home-intro" aria-labelledby="home-title">
            <div className="home-intro__inner mx-auto grid max-w-[2400px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-10 lg:py-24 xl:gap-20 xl:px-14 2xl:px-16">
              <div className="home-intro__copy">
                <RuleLabel>{t('landing.home.heroLabel')}</RuleLabel>
                <h1 id="home-title" className="home-intro__title">
                  {t('landing.home.heroTitle')}
                </h1>
                <p className="home-intro__subtitle">{t('landing.home.heroSubtitle')}</p>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2} className="mt-8">
                  <CopperActionButton component={Link} to={primaryHref} endIcon={<ArrowUpRight className="h-4 w-4" />}>
                    {primaryLabel}
                  </CopperActionButton>
                  {!isAuthenticated && (
                    <Link to="/login" className="home-sign-in">{t('landing.home.alreadyHaveWorkspace')}</Link>
                  )}
                </Stack>
                <div className="home-intro__location">
                  <MapPin aria-hidden="true" />
                  <span>Kigali, Rwanda</span>
                  <span className="home-intro__location-rule" />
                  <span>{t('landing.home.moduleLine')}</span>
                </div>
              </div>

              <div className="home-preview" role="img" aria-label="Illustration of the KUBIKA operations dashboard">
                <div className="home-preview__topbar">
                  <div className="home-preview__brand"><span className="home-preview__brand-dot" /> KUBIKA <span>WORKSPACE</span></div>
                  <div className="home-preview__branch"><MapPin aria-hidden="true" /> Kigali / Main branch <ChevronDown aria-hidden="true" /></div>
                </div>
                <div className="home-preview__body">
                  <div className="home-preview__heading">
                    <div>
                      <span className="home-preview__eyebrow">OPERATIONS OVERVIEW</span>
                      <h2>Good morning, team.</h2>
                    </div>
                    <span className="home-preview__date">MON, 27 SEP</span>
                  </div>
                  <div className="home-preview__metrics">
                    <div className="home-preview__metric">
                      <span>STOCK VALUE</span><strong>RWF 28.4m</strong>
                      <small><ArrowUpRight aria-hidden="true" /> Across 3 locations</small>
                    </div>
                    <div className="home-preview__metric">
                      <span>TO REVIEW</span><strong>08 <i>records</i></strong>
                      <small><span className="home-preview__status" /> 3 purchase orders</small>
                    </div>
                    <div className="home-preview__chart" aria-hidden="true">
                      <div className="home-preview__chart-label"><span>WEEKLY MOVEMENT</span><b>+12.8%</b></div>
                      <div className="home-preview__chart-bars">
                        {[34, 47, 39, 62, 49, 76, 57, 88, 68, 100, 74, 91].map((height, index) => (
                          <span key={index} style={{ height: `${height}%` }} />
                        ))}
                      </div>
                      <div className="home-preview__chart-days"><span>MON</span><span>WED</span><span>FRI</span><span>SUN</span></div>
                    </div>
                  </div>
                  <div className="home-preview__activity">
                    <div className="home-preview__activity-head"><span>RECENT ACTIVITY</span><span>VIEW REGISTER <MoveUpRight aria-hidden="true" /></span></div>
                    <div className="home-preview__row"><span className="home-preview__row-icon"><Boxes /></span><span><b>Stock received</b><small>Warehouse / Kigali</small></span><strong>+24 units</strong><time>09:42</time></div>
                    <div className="home-preview__row"><span className="home-preview__row-icon home-preview__row-icon--warm"><ClipboardCheck /></span><span><b>Purchase approved</b><small>PO-1048 / Bralirwa</small></span><strong>RWF 840,000</strong><time>09:18</time></div>
                  </div>
                </div>
                <div className="home-preview__rail"><span>ONE COMPANY RECORD</span><span><i /> SYNCED</span></div>
                <div className="home-preview__corner" aria-hidden="true"><ArrowDownRight /></div>
              </div>
            </div>
            <div className="home-index" aria-hidden="true"><span>01</span><span>BUILT FOR THE DAILY WORK</span><span>RW</span></div>
          </section>

          <section id="operations" className="home-operations scroll-mt-20" aria-labelledby="operations-title">
            <div className="mx-auto max-w-[2400px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 xl:px-14 2xl:px-16">
              <div className="home-operations__intro">
                <RuleLabel>{t('landing.home.platformLabel')}</RuleLabel>
                <h2 id="operations-title">{t('landing.home.recordTitle')}</h2>
                <p>{t('landing.home.platformSubtitle')}</p>
              </div>
              <div className="home-operation-list">
                {operations.map(({ icon: Icon, label, detail }, index) => (
                  <article className="home-operation" key={label}>
                    <span className="home-operation__number">0{index + 1}</span>
                    <Icon aria-hidden="true" className="home-operation__icon" />
                    <div><h3>{label}</h3><p>{detail}</p></div>
                    <ArrowUpRight aria-hidden="true" className="home-operation__arrow" />
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="branches" className="home-reach scroll-mt-20" aria-label={t('landing.home.branchesLabel')}>
            <div className="mx-auto flex max-w-[2400px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10 xl:px-14 2xl:px-16">
              <div><span className="home-reach__eyebrow">{t('landing.home.branchesLabel')}</span><p>{t('landing.home.branchesSubtitle')}</p></div>
              <span className="home-reach__places"><MapPin aria-hidden="true" /> Kigali <i /> Musanze <i /> Beyond</span>
            </div>
          </section>

          <section id="security" className="home-close scroll-mt-20" aria-labelledby="close-title">
            <div className="mx-auto flex max-w-[2400px] flex-col gap-8 px-5 py-14 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-16 lg:px-10 xl:px-14 2xl:px-16">
              <div><RuleLabel>{t('landing.home.securityLabel')}</RuleLabel><h2 id="close-title">{t('landing.home.securityTitle')}</h2></div>
              <div className="flex flex-col items-start gap-3"><Button component={Link} to={primaryHref} variant="contained" color="inherit" endIcon={<ArrowUpRight className="h-4 w-4" />} className="public-inverse-action !px-5 !py-3">{primaryLabel}</Button><Link to="/pricing" className="home-pricing-link">{t('landing.home.reviewPricing')}</Link></div>
            </div>
          </section>
        </main>

        <footer className="home-footer">
          <div className="mx-auto flex max-w-[2400px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10 xl:px-14 2xl:px-16">
            <Link to="/" aria-label="KUBIKA home"><BrandMark /></Link>
            <div className="home-footer__links"><address>Kicukiro, Kigali, Rwanda</address><Link to="/pricing">{t('landing.home.footer.pricing')}</Link><a href="mailto:jayfcode@gmail.com">{t('landing.home.footer.contact')}</a><span>{t('landing.home.footer.copyright', { year: new Date().getFullYear() })}</span></div>
          </div>
        </footer>
      </div>
    </MuiThemeProvider>
  );
}
