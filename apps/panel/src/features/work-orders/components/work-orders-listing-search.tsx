import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';

interface WorkOrdersListingSearchProps {
  readonly searchQuery: string;
  readonly onSearchQueryChange: (value: string) => void;
}

export function WorkOrdersListingSearch({
  searchQuery,
  onSearchQueryChange
}: WorkOrdersListingSearchProps) {
  return (
    <div className='relative max-w-[19.5rem]'>
      <Input
        value={searchQuery}
        placeholder='Buscar en todas las órdenes de trabajo...'
        className='pr-10'
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />
      <IconSearch className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2' />
    </div>
  );
}
