import PageContainer from '@/components/layout/page-container';
import { ImportServicesPanel } from '@/features/admin/components/import-services-panel';

export const metadata = {
  title: 'Panel: Admin - Importar servicios'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      className='w-full max-w-full'
      pageTitle='Admin · Importar servicios'
      pageDescription='Carga un CSV para crear o actualizar la colección de servicios en Firestore.'
    >
      <ImportServicesPanel />
    </PageContainer>
  );
}
