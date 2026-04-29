import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface ServicesCatalogFiltersBarProps {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly hideColumnsFromTechnique: boolean;
  readonly onHideColumnsFromTechniqueChange: (checked: boolean) => void;
  readonly filteredRowsCount: number;
  readonly dirtyRowsCount: number;
}

export function ServicesCatalogFiltersBar({
  query,
  onQueryChange,
  hideColumnsFromTechnique,
  onHideColumnsFromTechniqueChange,
  filteredRowsCount,
  dirtyRowsCount
}: ServicesCatalogFiltersBarProps) {
  return (
    <div className='mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
      <div className='flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-3'>
        <div className='relative w-full max-w-xl'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            value={query}
            placeholder='Buscar por parámetro, norma, técnica, tabla o matriz...'
            className='pr-9 pl-9'
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query.trim().length > 0 ? (
            <button
              type='button'
              aria-label='Limpiar búsqueda'
              className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer transition-colors'
              onClick={() => onQueryChange('')}
            >
              <X className='h-4 w-4' />
            </button>
          ) : null}
        </div>

        <label className='text-muted-foreground inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm'>
          <Checkbox
            checked={hideColumnsFromTechnique}
            aria-label='Alternar vista compacta'
            className='bg-background cursor-pointer !border-[#9a9a9a] shadow-none dark:!border-[#5f5f5f]'
            onCheckedChange={(checked) =>
              onHideColumnsFromTechniqueChange(checked === true)
            }
          />
          <span>Vista resumida</span>
        </label>
      </div>

      <p className='text-muted-foreground text-sm md:shrink-0'>
        {filteredRowsCount} resultados · {dirtyRowsCount} con cambios
      </p>
    </div>
  );
}
