import PageContainer from '@/components/layout/page-container';
import { AdminFunctionsList } from '@/features/admin/components/admin-functions-list';

export const metadata = {
  title: 'Panel: Admin'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      className='w-full max-w-[48rem]'
      pageTitle='Admin'
      pageDescription='Funciones administrativas del panel.'
    >
      <AdminFunctionsList />
    </PageContainer>
  );
}
