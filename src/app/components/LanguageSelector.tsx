import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const LANGUAGES: { code: Language; labelKey: string; short: string }[] = [
  { code: 'en', labelKey: 'common.languages.english', short: 'EN' },
  { code: 'fr', labelKey: 'common.languages.french', short: 'FR' },
  { code: 'rw', labelKey: 'common.languages.kinyarwanda', short: 'RW' },
];

interface LanguageSelectorProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'landing' | 'compact';
  className?: string;
}

export function LanguageSelector({
  collapsed = false,
  variant = 'sidebar',
  className,
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const triggerClass =
    variant === 'sidebar'
      ? collapsed
        ? 'flex h-10 w-full items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors'
        : 'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors'
      : variant === 'landing'
        ? 'h-9 gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium inline-flex items-center justify-center rounded-md px-3 text-sm'
        : 'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(triggerClass, className)}
          title={t('common.language')}
          aria-label={t('common.language')}
        >
          <Languages className={cn('flex-shrink-0', collapsed ? 'h-4 w-4' : 'h-4 w-4')} />
          {!collapsed && (
            <>
              <span>{t(current.labelKey)}</span>
              <span className="ml-auto text-[10px] bg-cyan-300 text-slate-950 rounded-full px-1.5 py-0.5 font-bold">
                {current.short}
              </span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'sidebar' ? 'start' : 'end'} className="min-w-[160px]">
        {LANGUAGES.map(({ code, labelKey, short }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code)}
            className={cn('cursor-pointer gap-2', language === code && 'bg-accent font-semibold')}
          >
            <span className="text-[10px] font-bold text-muted-foreground w-6">{short}</span>
            {t(labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
