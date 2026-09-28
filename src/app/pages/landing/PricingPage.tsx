import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ArrowRight, Boxes, Check, CircleHelp, Layers3, Loader2, Sparkles } from 'lucide-react';
import { PublicHeader } from '@/app/components/public/PublicHeader';
import { RuleLabel } from '@/app/components/public/PublicPrimitives';
import { useTheme } from '@/contexts/ThemeContext';
import { createMuiTheme } from '@/theme/muiTheme';
import { companyService } from '@/services';

interface PlanData {
  key: string;
  name: string;
  description: string;
  features: string[];
  modules: string[];
  outcomes: string[];
  badge: string;
  icon: string;
  featured: boolean;
  button_label: string;
  default_billing_amount: number;
  default_billing_cycle: string;
  sort_order: number;
}

const featureNames: Record<string, string> = {
  inventory: 'Inventory',
  sales: 'Sales and POS',
  purchases: 'Purchasing',
  finance: 'Accounting',
  payroll: 'Payroll',
  reports: 'Reporting',
  projects: 'Projects',
  fixed_assets: 'Fixed assets',
  ai_assistant: 'Stacy AI',
  integrations: 'Integrations',
};

function formatPrice(amount: number) {
  if (!amount) return 'Custom';
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCycle(cycle: string) {
  if (cycle === 'monthly') return 'per month';
  if (cycle === 'quarterly') return 'per quarter';
  if (cycle === 'yearly' || cycle === 'annually') return 'per year';
  return `per ${cycle.replace(/_/g, ' ')}`;
}

function getHighlights(plan: PlanData) {
  const capabilities = Array.from(new Set((plan.features || []).map((feature) => featureNames[feature] || feature.replace(/_/g, ' '))));
  return {
    visible: capabilities.slice(0, 4),
    remaining: Math.max(0, capabilities.length - 4),
  };
}

function getIncludedItems(plan: PlanData) {
  return (plan.outcomes || [])
    .filter((outcome) => outcome.toLowerCase().startsWith('included|'))
    .map((outcome) => outcome.split('|').slice(2).join('|').trim())
    .filter(Boolean)
    .slice(0, 2);
}

function visiblePricingPlans(plans: PlanData[]) {
  return plans
    .filter((plan) => plan.key !== 'trial')
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3);
}

export default function PricingPage() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pageTheme = useMemo(() => createMuiTheme(theme), [theme]);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await companyService.getPublicSubscriptionPlans();
      if (!response.success || !Array.isArray(response.data)) {
        setPlans([]);
        setLoadError(true);
        return;
      }
      setPlans(visiblePricingPlans(response.data));
    } catch {
      setPlans([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  return (
    <MuiThemeProvider theme={pageTheme}>
      <div className="public-shell pricing-page min-h-screen">
        <PublicHeader
          navItems={[{ label: 'Home', href: '/' }]}
          primaryHref="/register"
          primaryLabel={t('landing.home.createWorkspace')}
        />

        <main>
          <section className="pricing-intro">
            <div className="pricing-container pricing-intro__inner">
              <div className="pricing-intro__copy">
                <RuleLabel>KUBIKA / PRICING</RuleLabel>
                <h1>Plans for the work you do today, with room to grow.</h1>
                <p>Choose a plan for your team. Add more capability as your operation expands.</p>
              </div>
              <aside className="pricing-note">
                <span className="pricing-note__icon"><Layers3 aria-hidden="true" /></span>
                <div>
                  <span className="pricing-note__label">STRAIGHTFORWARD PRICING</span>
                  <p>Prices in Rwandan francs.<br />No per-user charges.</p>
                </div>
              </aside>
            </div>
          </section>

          <section className="pricing-plans" aria-labelledby="plans-heading">
            <div className="pricing-container">
              <div className="pricing-plans__heading">
                <div>
                  <RuleLabel>CHOOSE YOUR PLAN</RuleLabel>
                  <h2 id="plans-heading">One clear step at a time.</h2>
                </div>
                <span className="pricing-plans__count">{loading ? 'Loading plans' : `${plans.length} plans`}</span>
              </div>

              {loading ? (
                <div className="pricing-card-grid" aria-label="Loading plans">
                  {[0, 1, 2].map((item) => <div className="pricing-card-skeleton" key={item}><Loader2 aria-hidden="true" /></div>)}
                </div>
              ) : plans.length ? (
                <div className="pricing-card-grid">
                  {plans.map((plan, index) => {
                    const highlights = getHighlights(plan);
                    const included = getIncludedItems(plan);
                    const PlanIcon = plan.icon === 'Sparkles' ? Sparkles : Boxes;

                    return (
                      <article className={`pricing-card${plan.featured ? ' pricing-card--featured' : ''}`} key={plan.key}>
                        <div className="pricing-card__topline">
                          <span className="pricing-card__number">0{index + 1}</span>
                          {plan.featured && <span className="pricing-card__popular">MOST CHOSEN</span>}
                        </div>
                        <span className="pricing-card__icon"><PlanIcon aria-hidden="true" /></span>
                        <p className="pricing-card__badge">{plan.badge || 'KUBIKA PLAN'}</p>
                        <h3>{plan.name}</h3>
                        <p className="pricing-card__description">{plan.description || 'The essential tools for running your business.'}</p>

                        <div className="pricing-card__price">
                          <strong>{formatPrice(plan.default_billing_amount)}</strong>
                          {plan.default_billing_amount > 0 && <span>{formatCycle(plan.default_billing_cycle || 'monthly')}</span>}
                        </div>

                        <div className="pricing-card__features">
                          <span className="pricing-card__section-label">IN THIS PLAN</span>
                          {highlights.visible.map((feature) => (
                            <div className="pricing-card__feature" key={feature}>
                              <Check aria-hidden="true" />
                              <span>{feature}</span>
                            </div>
                          ))}
                          {highlights.remaining > 0 && (
                            <span className="pricing-card__more">Plus {highlights.remaining} more capabilities</span>
                          )}
                          {highlights.visible.length === 0 && (
                            <span className="pricing-card__more">Configured for your operation</span>
                          )}
                        </div>

                        {included.length > 0 && (
                          <div className="pricing-card__included">
                            {included.map((item) => <span key={item}><Check aria-hidden="true" />{item}</span>)}
                          </div>
                        )}

                        <Link className="pricing-card__action" to="/register">
                          {plan.button_label || 'Choose this plan'}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="pricing-empty">
                  <div className="pricing-empty__icon"><CircleHelp aria-hidden="true" /></div>
                  <div>
                    <h3>{loadError ? 'Pricing is temporarily unavailable.' : 'Plans are being updated.'}</h3>
                    <p>{loadError ? 'Please try again, or contact our team for current plan availability.' : 'Contact our team for current plan options.'}</p>
                  </div>
                  <div className="pricing-empty__actions">
                    {loadError && <button type="button" onClick={() => void loadPlans()}>Try again</button>}
                    <a href="mailto:jayfcode@gmail.com">Contact KUBIKA</a>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="pricing-assurance">
            <div className="pricing-container pricing-assurance__inner">
              <span className="pricing-assurance__mark"><Check aria-hidden="true" /></span>
              <p>Your company records stay together as your team and branches grow.</p>
              <Link to="/register">Set up your workspace <ArrowRight aria-hidden="true" /></Link>
            </div>
          </section>
        </main>

        <footer className="pricing-footer">
          <div className="pricing-container">
            <Link to="/" className="pricing-footer__brand"><span><Layers3 aria-hidden="true" /></span>KUBIKA</Link>
            <div className="pricing-footer__links">
              <address>Kicukiro, Kigali, Rwanda</address>
              <Link to="/">Home</Link>
              <a href="mailto:jayfcode@gmail.com">Contact</a>
              <span>© {new Date().getFullYear()} KUBIKA SYSTEM</span>
            </div>
          </div>
        </footer>
      </div>
    </MuiThemeProvider>
  );
}
