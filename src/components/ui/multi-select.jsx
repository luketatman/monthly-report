
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
'@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList } from
'@/components/ui/command';
import { cn } from '@/lib/utils';

export function MultiSelect({ options, value, onChange, placeholder = 'Select...', className, disabled }) {
  const selectedValues = new Set(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start h-auto min-h-10 bg-slate-800 text-slate-50 border-slate-300", className)}
          disabled={disabled}>

          <div className="flex gap-1 flex-wrap">
            {value && value.length > 0 ?
            value.map((item) =>
            <Badge
              key={item}
              variant="secondary"
              className="rounded-sm bg-slate-950 text-slate-50">

                  {item}
                </Badge>
            ) :

            <span className="text-slate-400">{placeholder}</span>
            }
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-400" align="start">
        <Command className="bg-slate-400">
          <CommandInput 
            placeholder="Search..." 
            className="flex h-11 w-full rounded-md bg-slate-950 text-slate-50 py-3 px-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 border-none" 
          />
          <CommandList className="bg-slate-400">
            <CommandEmpty className="text-slate-50 py-6 text-center text-sm">No results found.</CommandEmpty>
            <CommandGroup className="bg-slate-400">
              {options.map((option) => {
                const isSelected = selectedValues.has(option);
                return (
                  <CommandItem
                    key={option}
                    onSelect={() => {
                      if (disabled) return;
                      if (isSelected) {
                        selectedValues.delete(option);
                      } else {
                        selectedValues.add(option);
                      }
                      const filterValues = Array.from(selectedValues);
                      onChange(filterValues);
                    }}
                    className="bg-slate-400 text-slate-50 hover:bg-slate-500 cursor-pointer"
                  >

                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-slate-50',
                        isSelected ?
                        'bg-slate-950 text-slate-50' :
                        'opacity-50 [&_svg]:invisible'
                      )}>

                      <Check className={cn('h-4 w-4')} />
                    </div>
                    <span>{option}</span>
                  </CommandItem>);

              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>);

}
