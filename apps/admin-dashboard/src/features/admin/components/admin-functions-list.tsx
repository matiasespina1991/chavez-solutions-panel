'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import Link from 'next/link';

export function AdminFunctionsList() {
  return (
    <div className='grid gap-4'>
      <Link href='/dashboard/admin/clients'>
        <Card className='hover:bg-muted/30 cursor-pointer transition-colors duration-200'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-base'>
              Base de datos de clientes
            </CardTitle>
            <CardDescription>
              Crea, edita, busca e importa clientes maestros para nuevas
              proformas.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Link href='/dashboard/admin/import-services'>
        <Card className='hover:bg-muted/30 cursor-pointer transition-colors duration-200'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-base'>Importar servicios</CardTitle>
            <CardDescription>
              Carga un archivo CSV para reemplazar completamente la colección de
              servicios.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
