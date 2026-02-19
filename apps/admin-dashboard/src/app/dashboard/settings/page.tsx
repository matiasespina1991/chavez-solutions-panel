import PageContainer from '@/components/layout/page-container';
import { ThemeSelector } from '@/components/theme-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Panel: Configuración'
};

export default function Page() {
  return (
    <PageContainer
      className='w-full max-w-[40rem] justify-self-start'
      scrollable={true}
      pageTitle='Configuración'
      pageDescription='Ajusta las preferencias de tu panel de administración.'
    >
      <Card className='mx-auto flex w-full flex-row justify-between'>
        <CardHeader>
          <CardTitle className='text-left text-xl'>Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
