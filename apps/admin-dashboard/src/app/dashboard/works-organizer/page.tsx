'use client';

import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CategoryOrganizer from '@/features/works-organizer/components/category-organizer';

export default function WorksOrganizerPage() {
  return (
    <PageContainer
      scrollable={false}
      className='w-full max-w-[57rem] justify-self-start'
      pageTitle='Organizador de Obras'
      pageDescription='Organiza las filas de cada categoría'
    >
      <Tabs
        defaultValue='home'
        className='flex h-[calc(100dvh-170px)] min-h-0 w-full flex-col'
      >
        <TabsList className='bg-background border-border sticky top-0 z-20 grid w-full grid-cols-3 border p-[1px]'>
          <TabsTrigger
            value='home'
            className='data-[state=active]:bg-muted/90 data-[state=active]:border-border cursor-pointer'
          >
            Home
          </TabsTrigger>
          <TabsTrigger
            value='caves'
            className='data-[state=active]:bg-muted/90 data-[state=active]:border-border cursor-pointer'
          >
            Caves
          </TabsTrigger>
          <TabsTrigger
            value='landscapes'
            className='data-[state=active]:bg-muted/90 data-[state=active]:border-border cursor-pointer'
          >
            Landscapes
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='home'
          className='mt-6 min-h-0 flex-1 overflow-hidden'
        >
          <CategoryOrganizer category='home' />
        </TabsContent>

        <TabsContent
          value='caves'
          className='mt-6 min-h-0 flex-1 overflow-hidden'
        >
          <CategoryOrganizer category='caves' />
        </TabsContent>

        <TabsContent
          value='landscapes'
          className='mt-6 min-h-0 flex-1 overflow-hidden'
        >
          <CategoryOrganizer category='landscapes' />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
