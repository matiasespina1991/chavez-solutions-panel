import PageContainer from '@/components/layout/page-container';
import { ClientsPanel } from '@/features/clients/components/clients-panel';

export const metadata = {
  title: 'Panel: Admin. Clientes'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      className='w-full max-w-full overflow-x-hidden'
      pageTitle='Admin. Clientes'
      pageDescription='Maestro comercial de clientes para nuevas proformas.'
    >
      <ClientsPanel />
    </PageContainer>
  );
}
