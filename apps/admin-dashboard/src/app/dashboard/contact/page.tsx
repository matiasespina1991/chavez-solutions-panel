import PageContainer from '@/components/layout/page-container';
import ContactForm from '@/features/contact/components/contact-form';

export const metadata = {
  title: 'Panel : Contacto'
};

export default function Page() {
  return (
    <PageContainer
      scrollable={true}
      className='w-full max-w-[66rem] justify-self-start'
      pageTitle='Contacto'
      pageDescription='Edita los links de contacto.'
    >
      <ContactForm />
    </PageContainer>
  );
}
