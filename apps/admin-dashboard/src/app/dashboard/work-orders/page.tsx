import PageContainer from '@/components/layout/page-container';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import WorkOrdersListing from '@/features/work-orders/components/work-orders-listing';
import { Suspense } from 'react';

export const metadata = {
  title: 'Panel: Lista de ordenes de trabajo'
};

export default function Page() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Lista de ordenes de trabajo'
      pageDescription='Listado de órdenes de trabajo emitidas desde solicitudes de servicio.'
    >
      <Suspense
        fallback={
          <DataTableSkeleton
            columnCount={11}
            rowCount={8}
            filterCount={0}
            withViewOptions={false}
            withPagination={false}
            cellWidths={[
              '12rem',
              '4rem',
              '6rem',
              '14rem',
              '6rem',
              '6rem',
              '14rem',
              '10rem',
              '8rem',
              '12rem',
              '3rem'
            ]}
          />
        }
      >
        <WorkOrdersListing />
      </Suspense>
    </PageContainer>
  );
}
