'use client';

import PageContainer from '@/components/layout/page-container';
import ConfiguratorForm from '@/features/configurator/components/configurator-form';

export default function ConfiguratorPage() {
  return (
    <PageContainer
      scrollable={true}
      className='w-full max-w-[calc(66rem)] justify-self-start'
      pageTitle='Configurador de proformas'
      pageDescription='Crea y configura proformas'
    >
      <div className='mt-2'>
        <ConfiguratorForm />
      </div>
    </PageContainer>
  );
}
