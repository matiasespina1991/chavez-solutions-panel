import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';

interface RequestsListingSearchProps {
  readonly searchQuery: string;
  readonly onSearchQueryChange: (value: string) => void;
}

export function RequestsListingSearch({
  searchQuery,
  onSearchQueryChange
}: RequestsListingSearchProps) {
  return (
    <div className='relative max-w-[19.5rem]'>
      <Input
        value={searchQuery}
        placeholder='Buscar en todas las solicitudes...'
        className='pr-10'
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />
      <IconSearch className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2' />
    </div>
  );
}
