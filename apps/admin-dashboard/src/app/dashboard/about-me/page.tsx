import PageContainer from '@/components/layout/page-container';
import AboutForm from '@/features/about/components/about-form';

export const metadata = {
  title: 'Panel: About Me'
};

export default function Page() {
  return (
    <PageContainer
      className='justify-self-start'
      scrollable={true}
      pageTitle='About Me'
      pageDescription='Edita el contenido de la sección About Me.'
    >
      <AboutForm />
    </PageContainer>
  );
}
