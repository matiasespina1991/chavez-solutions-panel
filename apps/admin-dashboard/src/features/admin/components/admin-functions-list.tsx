'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  migrateMatrixToArray,
  MigrateMatrixToArrayResponse
} from '@/features/admin/services/import-services';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const formatMigrationStats = (
  label: string,
  stats: MigrateMatrixToArrayResponse['service_requests']
) => {
  return `${label}: updated=${stats.updated}, alreadyArray=${stats.alreadyArray}, invalidToEmpty=${stats.invalidToEmpty}, errors=${stats.errors}`;
};

export function AdminFunctionsList() {
  const [isMigratingMatrix, setIsMigratingMatrix] = useState(false);

  const handleMatrixMigration = async () => {
    try {
      setIsMigratingMatrix(true);
      const result = await migrateMatrixToArray();
      toast.success('Migración de matrix completada');
      toast.info(
        [
          formatMigrationStats('service_requests', result.service_requests),
          formatMigrationStats('work_orders', result.work_orders)
        ].join(' | ')
      );
    } catch (error) {
      console.error('[Admin] migrateMatrixToArray failed', error);
      toast.error('No se pudo ejecutar la migración de matrix.');
    } finally {
      setIsMigratingMatrix(false);
    }
  };

  return (
    <div className='grid gap-4'>
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

      <Card>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-base'>Migración temporal de matrix</CardTitle>
          <CardDescription>
            Convierte `matrix` de string a array en `service_requests` y
            `work_orders`. Botón temporal para ejecutar una única vez.
          </CardDescription>
          <div>
            <Button
              type='button'
              variant='destructive'
              className='cursor-pointer'
              onClick={handleMatrixMigration}
              disabled={isMigratingMatrix}
            >
              {isMigratingMatrix
                ? 'Migrando matrix...'
                : 'Ejecutar migración matrix -> array'}
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
