import PageContainer from '@/components/layout/page-container';
import LabAnalysisForm from '@/features/lab-analysis/components/lab-analysis-form';

export const metadata = {
  title: 'Panel: Registro de análisis de laboratorio'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      className='w-full max-w-[1300px]'
      pageTitle='Registro de análisis de laboratorio'
      pageDescription='Registra y guarda los resultados de laboratorio de la orden de trabajo seleccionada.'
    >
      <LabAnalysisForm />
    </PageContainer>
  );
}
