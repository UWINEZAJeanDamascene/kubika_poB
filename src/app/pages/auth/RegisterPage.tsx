import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Loader2, Mail, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import { companyService } from '@/services';
import { companyApi } from '@/lib/api';
import { PUBLIC_ROUTES } from '@/config/routes';
import { AuthFrame } from './AuthFrame';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyEmail: z.string().email('Please enter a valid company email'),
  companyTin: z.string().optional(),
  companyPhone: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  adminName: z.string().min(2, 'Your name must be at least 2 characters'),
  adminEmail: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

type RegisterFormData = z.infer<typeof registerSchema>;
type Plan = { key: string; name: string; description: string; features: string[]; modules: string[]; badge: string; default_billing_amount: number; default_billing_cycle: string; featured: boolean };

const fieldSx = {
  '& .MuiInputLabel-root': { color: 'var(--industrial-muted)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--industrial-copper)' },
  '& .MuiInput-root:before': { borderBottomColor: 'rgba(240, 240, 240, 0.18)' },
  '& .MuiInput-root:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(240, 240, 240, 0.36)' },
  '& .MuiInput-root:after': { borderBottomColor: 'var(--industrial-copper)' },
  '& .MuiInputBase-input': { color: 'var(--industrial-ink)', fontFamily: '"Work Sans", sans-serif', paddingTop: '12px', paddingBottom: '10px' },
  '& .MuiInputBase-input::placeholder': { color: 'var(--industrial-muted)', opacity: 0.8 },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const { register, handleSubmit, trigger, getValues, setValue, formState: { errors } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema), mode: 'onChange', defaultValues: { subscriptionPlan: 'starter' } });

  useEffect(() => {
    companyApi.getPublicSubscriptionPlans().then((response) => {
      if (response.success && response.data) { const activePlans = response.data.filter((plan) => plan.is_active).sort((a, b) => a.sort_order - b.sort_order) as Plan[]; setPlans(activePlans); if (activePlans.length > 0) { setSelectedPlan(activePlans[0].key); setValue('subscriptionPlan', activePlans[0].key); } }
    }).catch(() => undefined).finally(() => setPlansLoading(false));
  }, [setValue]);

  const handleContinue = async () => { if (await trigger(['companyName', 'companyEmail', 'companyTin', 'companyPhone'])) setStep(2); };
  const handleSelectPlan = (_event: React.MouseEvent<HTMLElement>, value: string | null) => { if (value) { setSelectedPlan(value); setValue('subscriptionPlan', value); } };
  const onSubmit = async () => {
    const data = getValues(); setIsLoading(true); setError(null); setEmailError(null); setSuccessMessage(null);
    try {
      await companyService.register({ name: data.companyName, email: data.companyEmail, tin: data.companyTin || undefined, phone: data.companyPhone || undefined, subscription_plan: data.subscriptionPlan || selectedPlan }, { name: data.adminName, email: data.adminEmail, password: data.password });
      setSuccessMessage('Registration submitted successfully. A platform administrator will review your company application.');
      setTimeout(() => navigate(PUBLIC_ROUTES.LOGIN, { state: { message: 'Registration submitted. Please wait for company approval before logging in.' } }), 5000);
    } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.'; if (errorMessage.toLowerCase().includes('email')) setEmailError('This email is already registered. Please use a different email or contact support.'); else setError(errorMessage); }
    finally { setIsLoading(false); }
  };

  const helper = (field: keyof RegisterFormData) => errors[field]?.message as string | undefined;
  const inputIcon = (icon: React.ReactNode) => <InputAdornment position="start">{icon}</InputAdornment>;

  return <AuthFrame eyebrow="NEW WORKSPACE / 01" title={step === 1 ? 'Open an operating workspace.' : 'Assign the first operator.'} subtitle={step === 1 ? 'Start with the company record. We will route the request through a controlled approval workflow.' : 'Create the administrator who will own the first secure session.'} sideTitle="Make the operating record official." sideCopy="KUBIKA gives the company record, operating teams and approval chain a single place to start." sideItems={['Company approval queue', 'Admin owner creation', 'Tenant-ready setup']}>
    <Stack spacing={3}>
      <div className="flex items-center gap-3 border-b border-white/10 pb-5"><div className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center border font-mono text-xs ${step >= 1 ? 'border-[var(--industrial-copper)] bg-[var(--industrial-copper)] text-[var(--industrial-bg)]' : 'border-white/10 text-[var(--industrial-muted)]'}`}>{step > 1 ? <Check className="h-4 w-4" /> : '01'}</span><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--industrial-muted)]">Company</span></div><span className={`h-px w-12 ${step > 1 ? 'bg-[var(--industrial-copper)]' : 'bg-white/15'}`} /><div className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center border font-mono text-xs ${step === 2 ? 'border-[var(--industrial-copper)] bg-[var(--industrial-copper)] text-[var(--industrial-bg)]' : 'border-white/10 text-[var(--industrial-muted)]'}`}>02</span><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--industrial-muted)]">Admin</span></div></div>
      {error && <Alert severity="error" variant="outlined" className="!border-[var(--industrial-danger)]/50 !bg-[var(--industrial-danger)]/10 !text-[var(--industrial-ink)]">{error}</Alert>}
      {successMessage && <Alert severity="success" variant="outlined" className="!border-[var(--industrial-olive)]/50 !bg-[var(--industrial-olive)]/10 !text-[var(--industrial-ink)]">{successMessage}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && <Stack spacing={3}><TextField label="Company name" placeholder="Company Ltd" error={Boolean(errors.companyName)} helperText={helper('companyName')} fullWidth variant="standard" sx={fieldSx} {...register('companyName')} InputProps={{ startAdornment: inputIcon(<Building2 className="h-4 w-4 text-[var(--industrial-muted)]" />) }} /><TextField label="Company email" placeholder="finance@company.com" error={Boolean(errors.companyEmail)} helperText={helper('companyEmail')} fullWidth variant="standard" sx={fieldSx} {...register('companyEmail')} InputProps={{ startAdornment: inputIcon(<Mail className="h-4 w-4 text-[var(--industrial-muted)]" />) }} /><Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}><TextField label="TIN" placeholder="Tax ID" fullWidth variant="standard" sx={fieldSx} {...register('companyTin')} InputProps={{ startAdornment: inputIcon(<ShieldCheck className="h-4 w-4 text-[var(--industrial-muted)]" />) }} /><TextField label="Phone" placeholder="+250..." fullWidth variant="standard" sx={fieldSx} {...register('companyPhone')} InputProps={{ startAdornment: inputIcon(<Phone className="h-4 w-4 text-[var(--industrial-muted)]" />) }} /></Stack><div><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--industrial-muted)]">Select operating tier</span><span className="font-mono text-[9px] uppercase text-[var(--industrial-copper)]">{plansLoading ? 'LOADING' : `${plans.length || 1} AVAILABLE`}</span></div>{plansLoading ? <div className="h-16 animate-pulse border border-white/10 bg-white/5" /> : plans.length === 0 ? <p className="border border-white/10 p-4 font-mono text-[10px] text-[var(--industrial-muted)]">No plans available. The starter tier will be assigned by default.</p> : <ToggleButtonGroup value={selectedPlan} exclusive onChange={handleSelectPlan} fullWidth orientation="vertical" className="!gap-2">{plans.map((plan) => <ToggleButton key={plan.key} value={plan.key} className="!justify-between !border !border-white/10 !px-4 !py-3 !text-left !normal-case !text-[var(--industrial-muted)] data-[selected=true]:!border-[var(--industrial-copper)] data-[selected=true]:!bg-[var(--industrial-copper)]/10 data-[selected=true]:!text-[var(--industrial-ink)]"><span><span className="block font-mono text-[10px] font-bold uppercase tracking-[0.1em]">{plan.name}</span><span className="mt-1 block font-sans text-xs normal-case text-[var(--industrial-muted)]">{plan.description}</span></span><span className="font-mono text-[10px] text-[var(--industrial-copper)]">{plan.default_billing_amount > 0 ? `RWF ${plan.default_billing_amount.toLocaleString()}` : 'FREE'}</span></ToggleButton>)}</ToggleButtonGroup>}<input type="hidden" {...register('subscriptionPlan')} value={selectedPlan} /></div><Button type="button" onClick={handleContinue} variant="contained" color="primary" fullWidth endIcon={<ArrowRight className="h-4 w-4" />} className="!min-h-12 !justify-between !px-5 !text-[10px] sm:!justify-center">CONTINUE TO ADMIN</Button></Stack>}
        {step === 2 && <Stack spacing={3}><Button type="button" onClick={() => setStep(1)} variant="text" color="inherit" startIcon={<ArrowLeft className="h-4 w-4" />} className="!justify-start !px-0 !text-[10px] !text-[var(--industrial-muted)] hover:!text-[var(--industrial-copper)]">BACK TO COMPANY</Button><TextField label="Full name" placeholder="Jane Operator" error={Boolean(errors.adminName)} helperText={helper('adminName')} fullWidth variant="standard" sx={fieldSx} {...register('adminName')} /><TextField label="Admin email" placeholder="admin@company.com" error={Boolean(errors.adminEmail) || Boolean(emailError)} helperText={helper('adminEmail') || emailError} fullWidth variant="standard" sx={fieldSx} {...register('adminEmail')} /><TextField label="Password" placeholder="Minimum 8 characters" type={showPassword ? 'text' : 'password'} error={Boolean(errors.password)} helperText={helper('password')} fullWidth variant="standard" sx={fieldSx} {...register('password')} InputProps={{ endAdornment: <InputAdornment position="end"><Button type="button" onClick={() => setShowPassword((value) => !value)} color="inherit" className="!min-w-0 !p-1 !text-[var(--industrial-muted)] hover:!text-[var(--industrial-copper)]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></InputAdornment> }} /><TextField label="Confirm password" placeholder="Repeat password" type={showConfirmPassword ? 'text' : 'password'} error={Boolean(errors.confirmPassword)} helperText={helper('confirmPassword')} fullWidth variant="standard" sx={fieldSx} {...register('confirmPassword')} InputProps={{ endAdornment: <InputAdornment position="end"><Button type="button" onClick={() => setShowConfirmPassword((value) => !value)} color="inherit" className="!min-w-0 !p-1 !text-[var(--industrial-muted)] hover:!text-[var(--industrial-copper)]">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></InputAdornment> }} /><Button type="submit" variant="contained" color="primary" fullWidth disabled={isLoading} startIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} endIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined} className="!min-h-12 !justify-between !px-5 !text-[10px] sm:!justify-center">{isLoading ? 'SUBMITTING' : 'COMPLETE REGISTRATION'}</Button></Stack>}
      </form>
      <p className="border-t border-white/10 pt-5 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--industrial-muted)]">Already approved? <Link to={PUBLIC_ROUTES.LOGIN} className="text-[var(--industrial-copper)] hover:text-[var(--industrial-ink)]">Sign in</Link></p>
    </Stack>
  </AuthFrame>;
}
