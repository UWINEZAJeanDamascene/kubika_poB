import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Button,
  FormControlLabel,
  Radio,
  Skeleton,
  Stack,
  TextField,
} from '@mui/material';
import type { AlertProps, ButtonProps, TextFieldProps } from '@mui/material';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InlineStateNoticeTone = 'danger' | 'success' | 'muted';

interface RuleLabelProps {
  children: ReactNode;
  className?: string;
}

export function RuleLabel({ children, className }: RuleLabelProps) {
  return <p className={cn('public-rule-label', className)}>{children}</p>;
}

export function RegistrationMark({ className }: { className?: string }) {
  return <span className={cn('public-registration-mark', className)} aria-hidden="true" />;
}

interface CopperActionButtonProps
  extends Omit<ButtonProps, 'color' | 'variant'> {
  children: ReactNode;
  to?: string;
}

export function CopperActionButton({
  children,
  className,
  endIcon = <ArrowRight className="h-4 w-4" aria-hidden="true" />,
  to,
  component,
  ...props
}: CopperActionButtonProps) {
  return (
    <Button
      {...props}
      {...(to ? { component: Link, to } : { component })}
      variant="contained"
      color="primary"
      endIcon={endIcon}
      className={cn('public-action', className)}
    >
      {children}
    </Button>
  );
}

interface QuietActionLinkProps {
  to: string;
  children: ReactNode;
  endIcon?: ReactNode;
  className?: string;
}

export function QuietActionLink({
  to,
  children,
  endIcon = <ArrowRight className="h-4 w-4" aria-hidden="true" />,
  className,
}: QuietActionLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'public-quiet-link inline-flex items-center gap-2',
        className,
      )}
    >
      <span>{children}</span>
      {endIcon}
    </Link>
  );
}

interface InlineStateNoticeProps {
  tone: InlineStateNoticeTone;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const noticeSeverity: Record<InlineStateNoticeTone, AlertProps['severity']> = {
  danger: 'error',
  success: 'success',
  muted: 'info',
};

export function InlineStateNotice({
  tone,
  children,
  action,
  className,
}: InlineStateNoticeProps) {
  return (
    <Alert
      severity={noticeSeverity[tone]}
      variant="outlined"
      icon={false}
      action={action}
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live="polite"
      className={cn(`public-notice public-notice--${tone}`, className)}
    >
      {children}
    </Alert>
  );
}

interface UnderlinedFieldProps
  extends Omit<TextFieldProps, 'label' | 'variant'> {
  id: string;
  label: ReactNode;
  action?: ReactNode;
}

export const UnderlinedField = forwardRef<HTMLInputElement, UnderlinedFieldProps>(
  function UnderlinedField(
    { id, label, action, className, ...props },
    ref,
  ) {
    return (
      <Stack spacing={0.75} className="public-field-wrap">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <label htmlFor={id} className="public-field-label">
            {label}
          </label>
          {action}
        </Stack>
        <TextField
          {...props}
          id={id}
          inputRef={ref}
          fullWidth
          variant="standard"
          className={cn('public-field', className)}
        />
      </Stack>
    );
  },
);

interface AccessDocketProps {
  items: string[];
}

export function AccessDocket({ items }: AccessDocketProps) {
  return (
    <Stack
      component="ol"
      spacing={0}
      aria-label="Workspace access details"
      className="public-access-docket"
    >
      {items.slice(0, 3).map((item, index) => (
        <Stack
          component="li"
          direction="row"
          alignItems="center"
          gap={2}
          key={item}
          className="public-access-docket__item"
        >
          <span className="public-mono public-access-docket__index" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span>{item}</span>
        </Stack>
      ))}
    </Stack>
  );
}

interface FolioStepIndexProps {
  currentStep: number;
  steps: readonly string[];
}

export function FolioStepIndex({ currentStep, steps }: FolioStepIndexProps) {
  return (
    <Stack
      component="ol"
      direction="row"
      alignItems="center"
      spacing={0}
      aria-label="Registration progress"
      className="public-step-index"
    >
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <Stack
            component="li"
            direction="row"
            alignItems="center"
            spacing={1.25}
            key={step}
            className={cn(
              'public-step-index__step',
              isCurrent && 'public-step-index__step--current',
              isComplete && 'public-step-index__step--complete',
            )}
          >
            <span className="public-step-index__marker" aria-hidden="true">
              {isComplete ? <Check className="h-4 w-4" /> : String(stepNumber).padStart(2, '0')}
            </span>
            <span className="public-step-index__label">{step}</span>
            {index < steps.length - 1 && (
              <span className="public-step-index__connector" aria-hidden="true" />
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

export interface RegisterPlan {
  key: string;
  name: string;
  description: string;
  default_billing_amount: number;
}

interface PlanRegisterRowProps {
  plan: RegisterPlan;
  selected: boolean;
  amountLabel: string;
}

export function PlanRegisterRow({
  plan,
  selected,
  amountLabel,
}: PlanRegisterRowProps) {
  return (
    <div
      className={cn('public-plan-row', selected && 'public-plan-row--selected')}
      data-selected={selected ? 'true' : 'false'}
    >
      <FormControlLabel
        value={plan.key}
        control={
          <Radio
            color="primary"
            size="small"
            inputProps={{ 'aria-label': `${plan.name} plan` }}
          />
        }
        label={
          <Stack spacing={0.5} className="public-plan-row__content">
            <span className="public-plan-row__name">{plan.name}</span>
            <span className="public-plan-row__description">{plan.description}</span>
          </Stack>
        }
        className="public-plan-row__control"
      />
      <span className="public-mono public-plan-row__amount">{amountLabel}</span>
    </div>
  );
}

export function PlanRegisterSkeleton() {
  return (
    <Stack spacing={0} className="public-plan-register public-plan-register--loading" aria-label="Loading operating plans">
      {[0, 1, 2].map((item) => (
        <Stack
          key={item}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={3}
          className="public-plan-skeleton"
        >
          <Stack spacing={0.75} className="min-w-0 flex-1">
            <Skeleton animation={false} variant="text" width="38%" height={20} />
            <Skeleton animation={false} variant="text" width="72%" height={18} />
          </Stack>
          <Skeleton animation={false} variant="text" width={74} height={20} />
        </Stack>
      ))}
    </Stack>
  );
}
