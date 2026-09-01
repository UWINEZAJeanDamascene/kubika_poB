import { useDeferredValue, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from './utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onValueChange: (value: string) => void;
  className?: string;
  maxVisibleOptions?: number;
}

/**
 * A searchable picker that deliberately mounts only a small result window.
 * Native/Radix Select mounts every option when opened, which becomes costly
 * for product and customer catalogues with hundreds or thousands of rows.
 */
export function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  onValueChange,
  className,
  maxVisibleOptions = 75,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const selected = options.find((option) => option.value === value);

  const visibleOptions = useMemo(() => {
    const matches = deferredSearch
      ? options.filter((option) => option.label.toLowerCase().includes(deferredSearch))
      : options;
    return matches.slice(0, maxVisibleOptions);
  }, [deferredSearch, maxVisibleOptions, options]);

  const hasMoreResults = (deferredSearch
    ? options.filter((option) => option.label.toLowerCase().includes(deferredSearch)).length
    : options.length) > visibleOptions.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-10 w-full justify-between bg-white text-left font-normal dark:bg-slate-900', className)}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('size-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {hasMoreResults && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Refine your search to see more results.
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
