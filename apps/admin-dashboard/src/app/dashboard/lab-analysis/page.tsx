import PageContainer from '@/components/layout/page-container';
import LabAnalysisForm from '@/features/lab-analysis/components/lab-analysis-form';

export const metadata = {
  title: 'Panel: Registro de análisis de laboratorio'
};

export default function Page() {
  return (
    <PageContainer
      scrollable
      pageTitle='Registro de análisis de laboratorio'
      pageDescription='Carga mínima post-OT para registrar resultados de laboratorio.'
    >
      <LabAnalysisForm />
    </PageContainer>
  );
}
