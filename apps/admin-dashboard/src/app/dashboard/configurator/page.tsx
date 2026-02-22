'use client';

import PageContainer from '@/components/layout/page-container';
import ConfiguratorForm from '@/features/configurator/components/configurator-form';

export default function ConfiguratorPage() {
  return (
    <PageContainer
      scrollable={true}
      className='w-full max-w-[57rem] justify-self-start'
      pageTitle='Configurador'
      pageDescription='Crea y configura Proformas y Órdenes de Trabajo'
    >
      <div className="mt-6">
        <ConfiguratorForm />
      </div>
    </PageContainer>
  );
}
