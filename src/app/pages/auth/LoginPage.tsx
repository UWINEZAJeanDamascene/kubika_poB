import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services';
import { Loader2, Eye, EyeOff, Mail, LockKeyhole, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { AuthFrame } from './AuthFrame';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const from = (location.state as { from?: string })?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('auth.login.enterCredentials'));
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    try {
      const response = await authService.login({ email, password });

      if (response.success) {
        const token = response.token || '';

        if (token) {
          localStorage.setItem('token', token);
        }

        const userResponse = await authService.getMe();

        if (userResponse.success && userResponse.data) {
          const user = userResponse.data;

          login(
            {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              company: user.company,
              permissions: user.permissions,
              lastLogin: user.lastLogin,
              mustChangePassword: user.mustChangePassword,
            },
            token,
            response.refreshToken || '',
            response.memberships || [],
          );

          toast.success(t('auth.login.welcomeBack'));

          if (user.mustChangePassword) {
            navigate('/change-password', { replace: true });
            return;
          }

          if (user.role === 'platform_admin') {
            navigate('/platform-admin', { replace: true });
            return;
          }

          if (response.memberships && response.memberships.length > 1) {
            navigate('/company', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        } else {
          toast.error(t('auth.login.userDetailsFailed'));
        }
      } else if (response.errorCode === 'INVALID_CREDENTIALS') {
        setErrorCode('INVALID_CREDENTIALS');
        toast.error(t('auth.login.invalidCredentials'));
      } else if (response.errorCode === 'ACCOUNT_LOCKED') {
        setErrorCode('ACCOUNT_LOCKED');
        const minutesLeft = response.lockedUntil
          ? Math.ceil((response.lockedUntil - Date.now()) / 60000)
          : 30;
        toast.error(t('auth.login.accountLockedToast', { minutes: minutesLeft }));
      } else {
        setErrorCode('LOGIN_FAILED');
        toast.error(response.error || t('auth.login.loginFailed'));
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorCode('LOGIN_FAILED');
      toast.error(t('auth.login.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow={t('auth.login.eyebrow')}
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      sideItems={[
        t('auth.login.sideItems.liveContext'),
        t('auth.login.sideItems.secureSession'),
        t('auth.login.sideItems.fastAccess'),
      ]}
    >
      {errorCode && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {errorCode === 'ACCOUNT_LOCKED'
            ? t('auth.login.accountLocked')
            : t('auth.login.invalidCredentials')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('auth.login.emailLabel')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              placeholder={t('auth.login.emailPlaceholder')}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('auth.login.passwordLabel')}
            </label>
            <Link to="/forgot-password" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              placeholder={t('auth.login.passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('auth.login.signingIn')}
            </>
          ) : (
            <>
              {t('auth.login.signIn')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        {t('auth.login.newWorkspace')}{' '}
        <Link to="/register" className="font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
          {t('auth.login.createAccount')}
        </Link>
      </p>
    </AuthFrame>
  );
}
