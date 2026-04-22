import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

interface WorkOrdersListingStateProps {
  loading: boolean;
  hasRows: boolean;
}

export function WorkOrdersListingState({
  loading,
  hasRows
}: WorkOrdersListingStateProps) {
  if (loading) {
    return (
      <DataTableSkeleton
        columnCount={9}
        rowCount={8}
        filterCount={0}
        withViewOptions={false}
        withPagination={false}
        cellWidths={[
          '12rem',
          '14rem',
          '6rem',
          '6rem',
          '6rem',
          '8rem',
          '12rem',
          '14rem',
          '3rem'
        ]}
      />
    );
  }

  if (!hasRows) {
    return (
      <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
        Aún no hay órdenes de trabajo registradas.
      </div>
    );
  }

  return null;
}
