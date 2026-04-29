import PageContainer from '@/components/layout/page-container';
import { ClientsPanel } from '@/features/clients/components/clients-panel';

export const metadata = {
  title: 'Panel: Base de datos de clientes'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      className='w-full max-w-full overflow-x-hidden'
      pageTitle='Base de datos de clientes'
      pageDescription='Administra y actualiza los datos comerciales de los clientes.'
    >
      <ClientsPanel />
    </PageContainer>
  );
}
