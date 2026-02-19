import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import ExhibitionListingPage from '@/features/exhibitions/components/exhibition-listing';
import { cn } from '@/lib/utils';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata = {
  title: 'Panel: Exhibiciones'
};

export default function Page() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Exhibiciones'
      pageDescription='Administra y agrega nuevas exhibiciones.'
      pageHeaderAction={
        <Link
          href='/dashboard/exhibitions/new'
          className={cn(buttonVariants(), 'text-xs md:text-sm')}
        >
          <IconPlus className='mr-2 h-4 w-4' /> Agregar Nueva Exhibición
        </Link>
      }
    >
      <Suspense
        fallback={
          <DataTableSkeleton columnCount={4} rowCount={6} filterCount={1} />
        }
      >
        <ExhibitionListingPage />
      </Suspense>
    </PageContainer>
  );
}
