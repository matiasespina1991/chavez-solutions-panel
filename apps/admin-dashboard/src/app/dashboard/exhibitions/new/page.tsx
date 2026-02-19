import PageContainer from '@/components/layout/page-container';
import ExhibitionForm from '@/features/exhibitions/components/exhibition-form';

export const metadata = {
  title: 'Panel: Nueva exhibición'
};

export default function Page() {
  return (
    <PageContainer
      pageTitle='Agregar exhibición'
      pageDescription='Creá una nueva exhibición.'
    >
      <ExhibitionForm />
    </PageContainer>
  );
}
