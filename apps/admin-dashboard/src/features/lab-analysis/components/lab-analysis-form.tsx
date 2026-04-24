'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { saveWorkOrderLabAnalysis } from '@/features/lab-analysis/services/lab-analysis';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';

type WorkOrderStatus =
  | 'issued'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'unknown';

interface WorkOrderMeta {
  id: string;
  workOrderNumber: string;
  sourceReference: string;
  status: WorkOrderStatus;
}

interface LabAnalysisRow {
  id: string;
  parameterLabelEs: string;
  resultValue: string;
  unit: string;
  method: string;
}

const createLocalId = () => Math.random().toString(36).slice(2, 11);

const createEmptyRow = (): LabAnalysisRow => ({
  id: createLocalId(),
  parameterLabelEs: '',
  resultValue: '',
  unit: '',
  method: ''
});

const statusLabelMap: Record<WorkOrderStatus, string> = {
  issued: 'OT iniciada',
  paused: 'OT pausada',
  completed: 'OT finalizada',
  cancelled: 'OT cancelada',
  unknown: 'Estado desconocido'
};

export default function LabAnalysisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderId = searchParams.get('workOrderId')?.trim() || '';

  const [isLoading, setIsLoading] = useState(Boolean(workOrderId));
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrderMeta | null>(null);
  const [analysisRows, setAnalysisRows] = useState<LabAnalysisRow[]>([
    createEmptyRow()
  ]);
  const [labNotes, setLabNotes] = useState('');

  useEffect(() => {
    const loadWorkOrder = async () => {
      if (!workOrderId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        const workOrderRef = doc(db, FIRESTORE_COLLECTIONS.WORK_ORDERS, workOrderId);
        const workOrderSnap = await getDoc(workOrderRef);

        if (!workOrderSnap.exists()) {
          setLoadError('No se encontró la orden de trabajo seleccionada.');
          setWorkOrder(null);
          return;
        }

        const value = workOrderSnap.data();
        const rawStatus = String(value.status ?? '').toLowerCase();
        const status: WorkOrderStatus =
          rawStatus === 'issued' ||
          rawStatus === 'paused' ||
          rawStatus === 'completed' ||
          rawStatus === 'cancelled'
            ? (rawStatus)
            : 'unknown';

        setWorkOrder({
          id: workOrderSnap.id,
          workOrderNumber: String(value.workOrderNumber ?? workOrderSnap.id),
          sourceReference: String(value.sourceReference ?? '—'),
          status
        });

        const existingRows =
          typeof value.analyses === 'object' && value.analyses !== null
            ? Array.isArray((value.analyses as { items?: unknown[] }).items)
              ? ((value.analyses as { items?: unknown[] }).items ?? [])
                .map((item) => {
                  const rowItem = item as {
                    parameterLabelEs?: string;
                    resultValue?: string;
                    unit?: string;
                    method?: string;
                  };

                  return {
                    id: createLocalId(),
                    parameterLabelEs: String(rowItem.parameterLabelEs ?? ''),
                    resultValue: String(rowItem.resultValue ?? ''),
                    unit: String(rowItem.unit ?? ''),
                    method: String(rowItem.method ?? '')
                  };
                })
                .filter(
                  (item) =>
                    item.parameterLabelEs ||
                    item.resultValue ||
                    item.unit ||
                    item.method
                )
              : []
            : [];

        setAnalysisRows(
          existingRows.length > 0 ? existingRows : [createEmptyRow()]
        );

        const existingNotes =
          typeof value.labAnalysis === 'object' && value.labAnalysis !== null
            ? String((value.labAnalysis as { notes?: string }).notes ?? '')
            : '';

        setLabNotes(existingNotes);
      } catch (error) {
        console.error('[LabAnalysis] load error', error);
        setLoadError('No se pudo cargar la orden de trabajo.');
        setWorkOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkOrder();
  }, [workOrderId]);

  const updateAnalysisRow = (
    id: string,
    field: keyof Omit<LabAnalysisRow, 'id'>,
    value: string
  ) => {
    setAnalysisRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addAnalysisRow = () => {
    setAnalysisRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeAnalysisRow = (id: string) => {
    setAnalysisRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
  };

  const handleSave = async () => {
    if (!workOrderId || !workOrder) return;

    if (workOrder.status === 'cancelled') {
      toast.error('No se pueden registrar análisis para una OT cancelada.');
      return;
    }

    const cleanedRows = analysisRows
      .map((row) => ({
        parameterLabelEs: row.parameterLabelEs.trim(),
        resultValue: row.resultValue.trim(),
        unit: row.unit.trim(),
        method: row.method.trim()
      }))
      .filter((row) => row.parameterLabelEs && row.resultValue);

    if (cleanedRows.length === 0) {
      toast.error(
        'Debe ingresar al menos un análisis con parámetro y resultado.'
      );
      return;
    }

    try {
      setIsSaving(true);

      const result = await saveWorkOrderLabAnalysis(
        workOrderId,
        cleanedRows,
        labNotes.trim()
      );

      toast.success(
        `Análisis de laboratorio guardados (${result.savedCount}).`
      );
      setAnalysisRows(
        cleanedRows.map((row) => ({
          id: createLocalId(),
          parameterLabelEs: row.parameterLabelEs,
          resultValue: row.resultValue,
          unit: row.unit,
          method: row.method
        }))
      );
    } catch (error) {
      console.error('[LabAnalysis] save error', error);
      const errorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'No se pudieron guardar los análisis de laboratorio.';

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!workOrderId) {
    return (
      <Card>
        <CardContent className='space-y-4 pt-6'>
          <p className='text-muted-foreground text-sm'>
            Seleccione una orden de trabajo desde la lista de OT para registrar
            análisis de laboratorio.
          </p>
          <Button
            type='button'
            variant='outline'
            className='cursor-pointer'
            onClick={() => router.push('/dashboard/work-orders')}
          >
            Ir a Lista de órdenes de trabajo
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <div className='bg-muted h-24 w-full animate-pulse rounded-lg' />
        <div className='bg-muted h-64 w-full animate-pulse rounded-lg' />
      </div>
    );
  }

  if (loadError || !workOrder) {
    return (
      <Card>
        <CardContent className='space-y-4 pt-6'>
          <p className='text-destructive text-sm'>
            {loadError || 'No se pudo abrir la orden de trabajo.'}
          </p>
          <Button
            type='button'
            variant='outline'
            className='cursor-pointer'
            onClick={() => router.push('/dashboard/work-orders')}
          >
            Volver a Lista de órdenes de trabajo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCancelled = workOrder.status === 'cancelled';

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Orden de trabajo</CardTitle>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-2 text-sm md:grid-cols-2'>
          <p>
            <span className='font-medium'>N° OT:</span>{' '}
            {workOrder.workOrderNumber}
          </p>
          <p>
            <span className='font-medium'>Referencia:</span>{' '}
            {workOrder.sourceReference || '—'}
          </p>
          <p>
            <span className='font-medium'>Estado:</span>{' '}
            {statusLabelMap[workOrder.status]}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registro de análisis de laboratorio</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground text-sm'>
            Cargue resultados de análisis posteriores a la emisión de OT.
          </p>

          <div className='space-y-3'>
            {analysisRows.map((row) => (
              <div
                key={row.id}
                className='grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-12'
              >
                <Input
                  className='md:col-span-4'
                  placeholder='Parámetro'
                  value={row.parameterLabelEs}
                  disabled={isSaving || isCancelled}
                  onChange={(event) =>
                    updateAnalysisRow(
                      row.id,
                      'parameterLabelEs',
                      event.target.value
                    )
                  }
                />
                <Input
                  className='md:col-span-4'
                  placeholder='Resultado'
                  value={row.resultValue}
                  disabled={isSaving || isCancelled}
                  onChange={(event) =>
                    updateAnalysisRow(row.id, 'resultValue', event.target.value)
                  }
                />
                <Input
                  className='md:col-span-2'
                  placeholder='Unidad'
                  value={row.unit}
                  disabled={isSaving || isCancelled}
                  onChange={(event) =>
                    updateAnalysisRow(row.id, 'unit', event.target.value)
                  }
                />
                <div className='flex gap-2 md:col-span-2'>
                  <Input
                    placeholder='Método'
                    value={row.method}
                    disabled={isSaving || isCancelled}
                    onChange={(event) =>
                      updateAnalysisRow(row.id, 'method', event.target.value)
                    }
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='cursor-pointer'
                    disabled={
                      isSaving || isCancelled || analysisRows.length === 1
                    }
                    aria-label='Eliminar fila'
                    onClick={() => removeAnalysisRow(row.id)}
                  >
                    <IconTrash className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type='button'
              variant='outline'
              className='cursor-pointer'
              disabled={isSaving || isCancelled}
              onClick={addAnalysisRow}
            >
              <IconPlus className='mr-1 h-4 w-4' /> Agregar análisis
            </Button>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Notas de laboratorio</label>
            <Textarea
              value={labNotes}
              placeholder='Notas adicionales del laboratorio'
              rows={4}
              disabled={isSaving || isCancelled}
              onChange={(event) => setLabNotes(event.target.value)}
            />
          </div>

          {isCancelled ? (
            <p className='text-destructive text-sm'>
              Esta OT está cancelada y no admite carga de análisis.
            </p>
          ) : null}

          <div className='flex justify-between border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              className='cursor-pointer'
              onClick={() => router.push('/dashboard/work-orders')}
            >
              Volver a OT
            </Button>
            <Button
              type='button'
              className='cursor-pointer bg-black text-white hover:bg-black/90 disabled:bg-black disabled:text-white'
              disabled={isSaving || isCancelled}
              onClick={handleSave}
            >
              {isSaving ? 'Guardando…' : 'Guardar análisis'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
