'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { TableRow } from '@/components/ui/table';
import { useDataTable } from '@/hooks/use-data-table';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import type { ExhibitionRow } from '@/features/exhibitions/types';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnDef, Row as TanstackRow } from '@tanstack/react-table';
import { doc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { RowDndProvider } from './row-dnd-context';

interface ExhibitionTableParams<TValue> {
  data: ExhibitionRow[];
  totalItems: number;
  columns: ColumnDef<ExhibitionRow, TValue>[];
}

type SortableRowProps = {
  row: TanstackRow<ExhibitionRow>;
  cells: ReactNode[];
  onRowClick?: (row: TanstackRow<ExhibitionRow>) => void;
  isReorderDisabled: boolean;
};

function SortableRow({
  row,
  cells,
  onRowClick,
  isReorderDisabled
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: row.original.id,
    disabled: isReorderDisabled
  });

  return (
    <RowDndProvider
      value={{
        attributes,
        listeners,
        setActivatorNodeRef,
        isDragging,
        isDisabled: isReorderDisabled
      }}
    >
      <TableRow
        key={row.id}
        ref={setNodeRef}
        data-state={row.getIsSelected() && 'selected'}
        style={{
          transform: CSS.Transform.toString(transform),
          transition
        }}
        className={cn(
          onRowClick ? 'hover:bg-muted/40 cursor-pointer' : null,
          isDragging ? 'bg-muted/60' : null
        )}
        onClick={(event) => {
          if (!onRowClick) return;
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-row-click="ignore"]')) {
            return;
          }
          onRowClick(row);
        }}
      >
        {cells}
      </TableRow>
    </RowDndProvider>
  );
}

export function ExhibitionTable<TValue>({
  data,
  totalItems,
  columns
}: ExhibitionTableParams<TValue>) {
  const router = useRouter();
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(10));
  const [orderedData, setOrderedData] = useState<ExhibitionRow[]>(data);
  const pendingOrderIds = useRef<string[] | null>(null);

  useEffect(() => {
    if (pendingOrderIds.current) {
      const pendingIds = pendingOrderIds.current;
      const nextIds = data.map((item) => item.id);
      const matchesPending =
        pendingIds.length === nextIds.length &&
        pendingIds.every((id, index) => id === nextIds[index]);
      if (matchesPending) {
        pendingOrderIds.current = null;
      } else {
        return;
      }
    }
    const orderedIds = orderedData.map((item) => item.id);
    const nextIds = data.map((item) => item.id);
    const isSameOrder =
      orderedIds.length === nextIds.length &&
      orderedIds.every((id, index) => id === nextIds[index]);
    if (!isSameOrder) {
      setOrderedData(data);
    }
  }, [data, orderedData]);

  const pageCount = Math.ceil(totalItems / pageSize);

  const { table } = useDataTable({
    data: orderedData,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    initialState: {
      columnVisibility: {
        search: false
      }
    }
  });

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const isReorderDisabled =
    table.getState().sorting.length > 0 ||
    table.getState().columnFilters.length > 0;

  const rowIds = table.getRowModel().rows.map((row) => row.original.id);

  const persistOrder = async (rows: ExhibitionRow[]) => {
    const batch = writeBatch(db);
    rows.forEach((row, index) => {
      batch.update(doc(db, 'exhibitions', row.id), { order: index });
    });
    await batch.commit();
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setOrderedData((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const next = arrayMove(prev, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index
      }));
      pendingOrderIds.current = next.map((item) => item.id);
      void persistOrder(next).catch((error) => {
        console.error('[Exhibitions] reorder error', error);
        toast.error('No se pudo guardar el orden.');
        pendingOrderIds.current = null;
      });
      return next;
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
        <DataTable
          table={table}
          onRowClick={(row) =>
            router.push(`/dashboard/exhibitions/${row.original.id}`)
          }
          renderRow={(row, cells, onRowClick) => (
            <SortableRow
              key={row.id}
              row={row}
              cells={cells}
              onRowClick={onRowClick}
              isReorderDisabled={isReorderDisabled}
            />
          )}
        >
          <DataTableToolbar table={table} />
        </DataTable>
      </SortableContext>
    </DndContext>
  );
}
