import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { Stack } from '@mui/material';
import { createMuiTheme } from '@/theme/muiTheme';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicHeader } from '@/app/components/public/PublicHeader';
import {
  AccessDocket,
  RegistrationMark,
  RuleLabel,
} from '@/app/components/public/PublicPrimitives';

interface AuthFrameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  sideTitle?: string;
  sideCopy?: string;
  sideItems?: string[];
  mobilePromise?: string;
}

export function AuthFrame({
  eyebrow,
  title,
  subtitle,
  children,
  sideTitle,
  sideCopy,
  sideItems,
  mobilePromise,
}: AuthFrameProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const pageTheme = useMemo(() => createMuiTheme(theme), [theme]);
  const resolvedSideTitle = sideTitle ?? t('auth.folio.title');
  const resolvedSideCopy = sideCopy ?? t('auth.folio.copy');
  const resolvedSideItems = sideItems ?? [
    t('auth.folio.items.workspace'),
    t('auth.folio.items.roles'),
    t('auth.folio.items.history'),
  ];
  const resolvedMobilePromise = mobilePromise ?? t('auth.folio.mobilePromise');

  return (
    <MuiThemeProvider theme={pageTheme}>
      <div className="public-shell public-access-shell min-h-screen overflow-x-hidden">
        <PublicHeader mode="access" />
        <main className="public-access-layout mx-auto grid w-full max-w-[1240px] gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[5fr_7fr] lg:gap-12 lg:px-10 lg:py-14">
          <section className="public-access-context" aria-labelledby="access-context-title">
            <RegistrationMark className="mb-8" />
            <RuleLabel>{t('auth.folio.label')}</RuleLabel>
            <h1 id="access-context-title" className="public-display mt-5 max-w-md text-[clamp(2.75rem,4.4vw,4.75rem)] leading-[1] text-(--public-ink)">
              {resolvedSideTitle}
            </h1>
            <p className="public-body mt-6 max-w-md text-base leading-7 text-(--public-ink-muted)">
              {resolvedSideCopy}
            </p>
            <AccessDocket items={resolvedSideItems} />
          </section>

          <section className="public-access-form" aria-labelledby="access-form-title">
            <Stack spacing={0} className="public-access-form__inner">
              <div className="public-access-form__heading">
                <RuleLabel>{eyebrow}</RuleLabel>
                <h2 id="access-form-title" className="public-access-form__title mt-4">
                  {title}
                </h2>
                <p className="public-body mt-5 max-w-xl text-base leading-7 text-(--public-ink-muted)">
                  {subtitle}
                </p>
                <p className="public-access-form__mobile-promise mt-5 border-t border-(--public-rule) pt-4 text-sm leading-6 text-(--public-ink-muted)">
                  {resolvedMobilePromise}
                </p>
              </div>
              <div className="public-access-form__content">{children}</div>
            </Stack>
          </section>
        </main>
      </div>
    </MuiThemeProvider>
  );
}
