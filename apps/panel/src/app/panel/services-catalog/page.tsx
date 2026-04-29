import PageContainer from '@/components/layout/page-container';
import { ServicesCatalogPanel } from '@/features/services-catalog/components/services-catalog-panel';

export const metadata = {
  title: 'Panel: Servicios - Conf. Técnica'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      className='w-full max-w-full overflow-x-hidden'
      pageTitle='Servicios - Conf. Técnica'
      pageDescription='Edición técnica del catálogo de servicios.'
    >
      <ServicesCatalogPanel />
    </PageContainer>
  );
}
