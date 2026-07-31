import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { AuthFrame } from './AuthFrame';

const fieldSx = {
  '& .MuiInputLabel-root': { color: 'var(--industrial-muted)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--industrial-copper)' },
  '& .MuiInput-root:before': { borderBottomColor: 'rgba(240, 240, 240, 0.18)' },
  '& .MuiInput-root:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(240, 240, 240, 0.36)' },
  '& .MuiInput-root:after': { borderBottomColor: 'var(--industrial-copper)' },
  '& .MuiInputBase-input': { color: 'var(--industrial-ink)', fontFamily: '"Work Sans", sans-serif', paddingTop: '12px', paddingBottom: '10px' },
  '& .MuiInputBase-input::placeholder': { color: 'var(--industrial-muted)', opacity: 0.8 },
};

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) { toast.error(t('auth.login.enterCredentials')); return; }
    setIsLoading(true);
    setErrorCode(null);
    try {
      const response = await authService.login({ email, password });
      if (response.success) {
        const token = response.token || '';
        if (token) localStorage.setItem('token', token);
        // Login now includes the user and permissions, avoiding a second
        // blocking request before the dashboard can render.
        const userResponse = response.user
          ? { success: true, data: response.user }
          : await authService.getMe();

        if (userResponse.success && userResponse.data) {
          const user = userResponse.data;
          login({ _id: user._id, name: user.name, email: user.email, role: user.role, company: user.company, permissions: user.permissions, lastLogin: user.lastLogin, mustChangePassword: user.mustChangePassword }, token, response.refreshToken || '', response.memberships || []);
          toast.success(t('auth.login.welcomeBack'));
          if (user.mustChangePassword) { navigate('/change-password', { replace: true }); return; }
          if (user.role === 'platform_admin') { navigate('/platform-admin', { replace: true }); return; }
          if (response.memberships && response.memberships.length > 1) navigate('/company', { replace: true });
          else navigate(from, { replace: true });
        } else { toast.error(t('auth.login.userDetailsFailed')); }
      } else if (response.errorCode === 'INVALID_CREDENTIALS') { setErrorCode('INVALID_CREDENTIALS'); toast.error(t('auth.login.invalidCredentials')); }
      else if (response.errorCode === 'ACCOUNT_LOCKED') { setErrorCode('ACCOUNT_LOCKED'); const minutesLeft = response.lockedUntil ? Math.ceil((response.lockedUntil - Date.now()) / 60000) : 30; toast.error(t('auth.login.accountLockedToast', { minutes: minutesLeft })); }
      else { setErrorCode('LOGIN_FAILED'); toast.error(response.error || t('auth.login.loginFailed')); }
    } catch (error) { console.error('Login error:', error); setErrorCode('LOGIN_FAILED'); toast.error(t('auth.login.loginError')); }
    finally { setIsLoading(false); }
  };

  return <AuthFrame eyebrow={t('auth.login.eyebrow')} title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} sideItems={[t('auth.login.sideItems.liveContext'), t('auth.login.sideItems.secureSession'), t('auth.login.sideItems.fastAccess')]}> 
    <Stack component="form" onSubmit={handleSubmit} spacing={3}>
      {errorCode && <div role="alert" className="border border-[var(--industrial-danger)]/50 bg-[var(--industrial-danger)]/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--industrial-danger)]">{errorCode === 'ACCOUNT_LOCKED' ? t('auth.login.accountLocked') : t('auth.login.invalidCredentials')}</div>}
      <TextField id="email" type="email" label={t('auth.login.emailLabel')} placeholder={t('auth.login.emailPlaceholder')} value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} fullWidth variant="standard" sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><Mail className="h-4 w-4 text-[var(--industrial-muted)]" /></InputAdornment> }} />
      <div><div className="mb-1 flex items-center justify-between gap-4"><span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--industrial-muted)]">{t('auth.login.passwordLabel')}</span><Link to="/forgot-password" className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--industrial-copper)] hover:text-[var(--industrial-ink)]">{t('auth.login.forgotPassword')}</Link></div><TextField id="password" type={showPassword ? 'text' : 'password'} placeholder={t('auth.login.passwordPlaceholder')} value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} fullWidth variant="standard" sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><LockKeyhole className="h-4 w-4 text-[var(--industrial-muted)]" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} edge="end" size="small" className="!text-[var(--industrial-muted)] hover:!text-[var(--industrial-copper)]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconButton></InputAdornment> }} /></div>
      <Button type="submit" variant="contained" color="primary" fullWidth disabled={isLoading} endIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} className="!mt-3 !min-h-12 !justify-between !px-5 !text-[10px] sm:!justify-center">{isLoading ? t('auth.login.signingIn') : t('auth.login.signIn')}</Button>
      <p className="border-t border-white/10 pt-5 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--industrial-muted)]">{t('auth.login.newWorkspace')} <Link to="/register" className="text-[var(--industrial-copper)] hover:text-[var(--industrial-ink)]">{t('auth.login.createAccount')}</Link></p>
    </Stack>
  </AuthFrame>;
}
