import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InputAdornment, Stack } from '@mui/material';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/config/routes';
import { AuthFrame } from './AuthFrame';
import {
  CopperActionButton,
  InlineStateNotice,
  QuietActionLink,
  UnderlinedField,
} from '@/app/components/public/PublicPrimitives';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.forgotPassword(data.email);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error || t('auth.forgotPassword.error'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow={t('auth.forgotPassword.eyebrow')}
      title={t('auth.forgotPassword.title')}
      subtitle={t('auth.forgotPassword.subtitle')}
      sideTitle={t('auth.forgotPassword.sideTitle')}
      sideCopy={t('auth.forgotPassword.sideCopy')}
      sideItems={[
        t('auth.forgotPassword.sideItems.workspace'),
        t('auth.forgotPassword.sideItems.roles'),
        t('auth.forgotPassword.sideItems.history'),
      ]}
      mobilePromise={t('auth.forgotPassword.mobilePromise')}
    >
      {success ? (
        <Stack spacing={3} className="public-submitted-state">
          <span className="public-success-marker" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <div>
            <h3 className="public-submitted-state__title">{t('auth.forgotPassword.successTitle')}</h3>
            <p className="public-body mt-3 text-base leading-7 text-(--public-ink-muted)">
              {t('auth.forgotPassword.successCopy')}
            </p>
          </div>
          <QuietActionLink to={PUBLIC_ROUTES.LOGIN}>
            {t('auth.forgotPassword.returnToSignIn')}
          </QuietActionLink>
        </Stack>
      ) : (
        <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
          {error && <InlineStateNotice tone="danger">{error}</InlineStateNotice>}
          <UnderlinedField
            id="email"
            type="email"
            label={t('auth.forgotPassword.emailLabel')}
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message as string | undefined}
            autoComplete="email"
            {...register('email')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </InputAdornment>
              ),
            }}
          />
          <CopperActionButton
            type="submit"
            fullWidth
            disabled={isLoading}
            endIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          >
            {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.submit')}
          </CopperActionButton>
          <p className="public-form-footer text-sm text-(--public-ink-muted)">
            <Link to={PUBLIC_ROUTES.LOGIN} className="public-inline-link">{t('auth.forgotPassword.returnToSignIn')}</Link>
          </p>
        </Stack>
      )}
    </AuthFrame>
  );
}
