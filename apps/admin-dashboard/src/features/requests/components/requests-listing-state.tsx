import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

interface RequestsListingStateProps {
  readonly loading: boolean;
  readonly hasRows: boolean;
}

export function RequestsListingState({
  loading,
  hasRows
}: RequestsListingStateProps) {
  if (loading) {
    return (
      <DataTableSkeleton
        columnCount={9}
        rowCount={8}
        filterCount={0}
        withViewOptions={false}
        withPagination={false}
        cellWidths={[
          '10rem',
          '14rem',
          '6rem',
          '6rem',
          '6rem',
          '8rem',
          '12rem',
          '20rem',
          '3rem'
        ]}
      />
    );
  }

  if (!hasRows) {
    return (
      <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
        Aún no hay solicitudes de servicio registradas.
      </div>
    );
  }

  return null;
}
