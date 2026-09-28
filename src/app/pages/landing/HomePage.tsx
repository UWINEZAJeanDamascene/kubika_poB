import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import {
  ArrowUpRight,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ArrowRight,
  Check,
  Search,
  Wallet,
  MapPin,
  MoveUpRight,
  Scale,
} from 'lucide-react';
import { createMuiTheme } from '@/theme/muiTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicHeader } from '@/app/components/public/PublicHeader';
import { PublicSiteFooter } from '@/app/components/public/PublicSiteFooter';
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
    { label: t('landing.home.nav.covers'), href: '#product-tour' },
    { label: t('landing.home.nav.branches'), href: '#branches' },
    { label: 'About us', href: '/about' },
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
                  <span>{t('landing.home.moduleLine')}</span>
                </div>
              </div>

              <div className="home-preview" role="img" aria-label="Illustrative KUBIKA company overview">
                <div className="home-preview__topbar">
                  <div className="home-preview__brand"><span className="home-preview__brand-dot" /> KUBIKA <span>WORKSPACE</span></div>
                  <div className="home-preview__branch"><MapPin aria-hidden="true" /> Kigali Main branch <ChevronDown aria-hidden="true" /></div>
                </div>
                <div className="home-preview__body">
                  <div className="home-preview__heading">
                    <div>
                      <span className="home-preview__eyebrow">COMPANY OVERVIEW</span>
                      <h2>Today at a glance</h2>
                    </div>
                    <span className="home-preview__date">KIGALI, RWANDA</span>
                  </div>
                  <div className="home-preview__metrics">
                    <div className="home-preview__metric">
                      <span>STOCK VALUE</span><strong>RWF 28.4m</strong>
                      <small><ArrowUpRight aria-hidden="true" /> Across 3 locations</small>
                    </div>
                    <div className="home-preview__metric">
                      <span>TO REVIEW</span><strong>8 <i>records</i></strong>
                      <small><span className="home-preview__status" /> 3 purchase orders</small>
                    </div>
                    <div className="home-preview__chart" aria-hidden="true">
                      <div className="home-preview__chart-label"><span>STOCK MOVEMENT</span><b>THIS WEEK</b></div>
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
                    <div className="home-preview__row"><span className="home-preview__row-icon"><Boxes /></span><span><b>Goods received</b><small>Kigali warehouse</small></span><strong>24 units</strong><time>Today</time></div>
                    <div className="home-preview__row"><span className="home-preview__row-icon home-preview__row-icon--warm"><ClipboardCheck /></span><span><b>Purchase order approved</b><small>Supplier purchase</small></span><strong>Ready to receive</strong><time>Today</time></div>
                  </div>
                </div>
                <div className="home-preview__rail"><span>ILLUSTRATIVE WORKSPACE</span><span>COMPANY OVERVIEW</span></div>
              </div>
            </div>
          </section>

          <section id="operations" className="home-operations scroll-mt-20" aria-labelledby="operations-title">
            <div className="mx-auto max-w-[2400px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 xl:px-14 2xl:px-16">
              <div className="home-operations__intro">
                <RuleLabel>{t('landing.home.platformLabel')}</RuleLabel>
                <h2 id="operations-title">{t('landing.home.recordTitle')}</h2>
                <p>{t('landing.home.platformSubtitle')}</p>
              </div>
              <div className="home-operation-list">
                {operations.map(({ icon: Icon, label, detail }) => (
                  <article className="home-operation" key={label}>
                    <Icon aria-hidden="true" className="home-operation__icon" />
                    <div><h3>{label}</h3><p>{detail}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="product-tour" className="home-showcase scroll-mt-20" aria-labelledby="showcase-title">
            <div className="mx-auto max-w-[2400px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 xl:px-14 2xl:px-16">
              <div className="home-showcase__intro">
                <RuleLabel>{t('landing.home.showcase.eyebrow')}</RuleLabel>
                <h2 id="showcase-title">{t('landing.home.showcase.title')}</h2>
                <p>{t('landing.home.showcase.subtitle')}</p>
              </div>

              <div className="home-showcase__grid">
                <article className="home-showcase-card">
                  <div className="home-showcase-card__copy">
                    <span className="home-showcase-card__index">INVENTORY</span>
                    <div className="home-showcase-card__icon"><Boxes aria-hidden="true" /></div>
                    <h3>{t('landing.home.showcase.inventory.title')}</h3>
                    <p>{t('landing.home.showcase.inventory.copy')}</p>
                    <ul>
                      <li><Check aria-hidden="true" />{t('landing.home.showcase.inventory.pointOne')}</li>
                      <li><Check aria-hidden="true" />{t('landing.home.showcase.inventory.pointTwo')}</li>
                      <li><Check aria-hidden="true" />{t('landing.home.showcase.inventory.pointThree')}</li>
                    </ul>
                  </div>
                  <div className="product-screen product-screen--inventory" role="img" aria-label={t('landing.home.showcase.inventory.previewLabel')}>
                    <div className="product-screen__bar"><span><Boxes aria-hidden="true" /> {t('landing.home.showcase.inventory.screenTitle')}</span><span className="product-screen__period">{t('landing.home.showcase.inventory.location')}</span></div>
                    <div className="product-screen__metrics">
                      <div><small>{t('landing.home.showcase.inventory.stockValue')}</small><strong>RWF 28.4m</strong><span>{t('landing.home.showcase.inventory.acrossLocations')}</span></div>
                      <div><small>{t('landing.home.showcase.inventory.products')}</small><strong>1,284</strong><span>{t('landing.home.showcase.inventory.activeItems')}</span></div>
                    </div>
                    <div className="product-screen__table-head"><span>{t('landing.home.showcase.inventory.item')}</span><span>{t('landing.home.showcase.inventory.onHand')}</span><span>{t('landing.home.showcase.inventory.status')}</span></div>
                    <div className="product-screen__table-row"><span><i className="product-screen__swatch product-screen__swatch--green" />{t('landing.home.showcase.inventory.freshProduce')}</span><strong>248 {t('landing.home.showcase.inventory.units')}</strong><em className="product-screen__tag product-screen__tag--good">{t('landing.home.showcase.inventory.inStock')}</em></div>
                    <div className="product-screen__table-row"><span><i className="product-screen__swatch product-screen__swatch--blue" />{t('landing.home.showcase.inventory.packagedGoods')}</span><strong>86 {t('landing.home.showcase.inventory.units')}</strong><em className="product-screen__tag product-screen__tag--watch">{t('landing.home.showcase.inventory.reorder')}</em></div>
                    <div className="product-screen__footer"><span><Search aria-hidden="true" /> {t('landing.home.showcase.inventory.search')}</span><span>{t('landing.home.showcase.inventory.viewStock')} <ArrowRight aria-hidden="true" /></span></div>
                  </div>
                </article>

                <article className="home-showcase-card home-showcase-card--accounting">
                  <div className="home-showcase-card__copy">
                    <span className="home-showcase-card__index">ACCOUNTING</span>
                    <div className="home-showcase-card__icon home-showcase-card__icon--accounting"><CircleDollarSign aria-hidden="true" /></div>
                    <h3>{t('landing.home.showcase.accounting.title')}</h3>
                    <p>{t('landing.home.showcase.accounting.copy')}</p>
                    <ul>
                      <li><Check aria-hidden="true" />{t('landing.home.showcase.accounting.pointOne')}</li>
                      <li><Check aria-hidden="true" />{t('landing.home.showcase.accounting.pointTwo')}</li>
                      <li><Check aria-hidden="true" />{t('landing.home.showcase.accounting.pointThree')}</li>
                    </ul>
                  </div>
                  <div className="product-screen product-screen--accounting" role="img" aria-label={t('landing.home.showcase.accounting.previewLabel')}>
                    <div className="product-screen__bar"><span><Scale aria-hidden="true" /> {t('landing.home.showcase.accounting.screenTitle')}</span><span className="product-screen__period">{t('landing.home.showcase.accounting.period')}</span></div>
                    <div className="product-screen__ledger-title"><div><small>{t('landing.home.showcase.accounting.entry')}</small><strong>JE-2026-00481</strong></div><span className="product-screen__balanced"><Check aria-hidden="true" /> {t('landing.home.showcase.accounting.balanced')}</span></div>
                    <div className="product-screen__ledger-head"><span>{t('landing.home.showcase.accounting.account')}</span><span>{t('landing.home.showcase.accounting.debit')}</span><span>{t('landing.home.showcase.accounting.credit')}</span></div>
                    <div className="product-screen__ledger-row"><span><i className="product-screen__ledger-dot" />{t('landing.home.showcase.accounting.inventoryAccount')}</span><strong>840,000</strong><span>0</span></div>
                    <div className="product-screen__ledger-row"><span><i className="product-screen__ledger-dot product-screen__ledger-dot--muted" />{t('landing.home.showcase.accounting.payablesAccount')}</span><span>0</span><strong>840,000</strong></div>
                    <div className="product-screen__ledger-total"><span>{t('landing.home.showcase.accounting.totals')}</span><strong>840,000</strong><strong>840,000</strong></div>
                    <div className="product-screen__footer"><span><Wallet aria-hidden="true" /> {t('landing.home.showcase.accounting.postedToLedger')}</span><span>{t('landing.home.showcase.accounting.viewEntry')} <ArrowRight aria-hidden="true" /></span></div>
                  </div>
                </article>
              </div>
              <p className="home-showcase__note">{t('landing.home.showcase.note')}</p>
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

        <PublicSiteFooter />
      </div>
    </MuiThemeProvider>
  );
}
