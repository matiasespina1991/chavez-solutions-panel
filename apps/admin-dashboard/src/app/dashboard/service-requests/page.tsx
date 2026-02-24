import PageContainer from '@/components/layout/page-container';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import ServiceRequestsListing from '@/features/service-requests/components/service-requests-listing';
import { Suspense } from 'react';

export const metadata = {
  title: 'Panel: Lista de solicitudes'
};

export default function Page() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Lista de solicitudes'
      pageDescription='Listado de solicitudes registradas en el configurador.'
    >
      <Suspense
        fallback={
          <DataTableSkeleton
            columnCount={10}
            rowCount={8}
            filterCount={0}
            withViewOptions={false}
            withPagination={false}
            cellWidths={[
              '10rem',
              '4rem',
              '6rem',
              '14rem',
              '6rem',
              '6rem',
              '10rem',
              '8rem',
              '12rem',
              '3rem'
            ]}
          />
        }
      >
        <ServiceRequestsListing />
      </Suspense>
    </PageContainer>
  );
}
