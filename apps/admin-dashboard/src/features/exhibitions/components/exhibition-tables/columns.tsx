'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { ExhibitionRow } from '@/features/exhibitions/types';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Column, ColumnDef } from '@tanstack/react-table';
import { doc, updateDoc } from 'firebase/firestore';
import { GripVertical, Text } from 'lucide-react';
import { toast } from 'sonner';
import { CellAction } from './cell-action';
import { useRowDndContext } from './row-dnd-context';

function PosterCell({
  title,
  posterPath
}: {
  title: string;
  posterPath?: string;
}) {
  const { src, hasSource, handleError } = useStorageAssetSrc(
    posterPath ? { storagePath: posterPath } : null,
    { preferDirect: false }
  );

  return (
    <div className='bg-muted flex h-20 w-20 items-center justify-center overflow-hidden rounded-md'>
      {hasSource ? (
        <img
          src={src}
          alt={`${title} póster`}
          className='h-full w-full object-cover'
          loading='lazy'
          onError={handleError}
        />
      ) : (
        <span className='text-muted-foreground text-xs'>Sin póster</span>
      )}
    </div>
  );
}

type EditableTextCellProps = {
  value?: string;
  placeholder: string;
  docId: string;
  field: 'title' | 'dateAndLocation';
  className?: string;
  textClassName?: string;
};

function EditableTextCell({
  value,
  placeholder,
  docId,
  field,
  className,
  textClassName
}: EditableTextCellProps) {
  const fieldLabels: Record<EditableTextCellProps['field'], string> = {
    title: 'título',
    dateAndLocation: 'fecha y lugar'
  };
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const draftRef = useRef(value ?? '');
  const savingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      const nextValue = value ?? '';
      setLocalValue(nextValue);
      draftRef.current = nextValue;
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const element = textRef.current;
    if (!element) return;
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [isEditing]);

  const saveValue = async () => {
    if (savingRef.current) return;
    const nextValue = (draftRef.current ?? '').trim();
    const currentValue = (value ?? '').trim();

    if (nextValue === currentValue) {
      setIsEditing(false);
      setLocalValue(value ?? '');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'exhibitions', docId), {
        [field]: nextValue
      });
      setLocalValue(nextValue);
      setIsEditing(false);
    } catch (error) {
      console.error('[Exhibitions] update field error', error);
      toast.error('No se pudo actualizar el valor.');
      setIsEditing(true);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const displayValue = isEditing ? draftRef.current : localValue || placeholder;

  return (
    <div data-row-click='ignore' className={cn('min-w-[200px]', className)}>
      <span
        ref={textRef}
        contentEditable={isEditing && !isSaving}
        suppressContentEditableWarning
        role='textbox'
        aria-label={`Editar ${fieldLabels[field]}`}
        className={cn(
          'cursor-text text-left text-sm font-medium outline-none',
          isEditing
            ? 'caret-foreground inline-block min-h-[1.25rem] min-w-[6ch] cursor-text'
            : 'truncate',
          textClassName
        )}
        onClick={() => {
          if (!isEditing && !isSaving) {
            setIsEditing(true);
          }
        }}
        onInput={(event) => {
          draftRef.current = event.currentTarget.textContent ?? '';
        }}
        onBlur={() => {
          if (isEditing) saveValue();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            saveValue();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setIsEditing(false);
            setLocalValue(value ?? '');
            draftRef.current = value ?? '';
          }
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}

function RowDragHandle() {
  const context = useRowDndContext();

  if (!context) return null;

  return (
    <button
      type='button'
      data-row-click='ignore'
      ref={context.setActivatorNodeRef}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60',
        context.isDragging ? 'text-foreground' : null
      )}
      title={
        context.isDisabled
          ? 'Desactiva filtros o ordenamiento para reordenar'
          : 'Arrastrar para reordenar'
      }
      aria-label='Reordenar exhibición'
      disabled={context.isDisabled}
      {...context.attributes}
      {...context.listeners}
    >
      <GripVertical className='h-4 w-4' />
    </button>
  );
}

export const columns: ColumnDef<ExhibitionRow>[] = [
  {
    id: 'orderHandle',
    header: '',
    enableSorting: false,
    enableColumnFilter: false,
    size: 20,
    cell: () => (
      <div className='flex cursor-grab items-center justify-center'>
        <RowDragHandle />
      </div>
    )
  },
  {
    accessorKey: 'posterPath',
    header: '',
    meta: { label: 'Cover' },
    size: 40,
    enableColumnFilter: false,
    cell: ({ row }) => {
      return (
        <PosterCell
          title={row.original.title}
          posterPath={row.original.posterPath}
        />
      );
    }
  },
  {
    id: 'search',
    accessorFn: (row) =>
      `${row.title} ${row.dateAndLocation ?? ''} ${row.body}`,
    header: 'BUSCAR',
    enableSorting: false,
    enableHiding: true,
    enableColumnFilter: true,
    meta: {
      label: 'Buscar',
      placeholder: 'Buscar exhibiciones...',
      variant: 'text',
      icon: Text
    }
  },
  {
    id: 'title',
    accessorKey: 'title',
    meta: { label: 'Título' },
    header: ({ column }: { column: Column<ExhibitionRow, unknown> }) => (
      <DataTableColumnHeader column={column} title='Título' />
    ),
    cell: ({ row, cell }) => (
      <EditableTextCell
        value={cell.getValue<ExhibitionRow['title']>()}
        placeholder='Sin título'
        docId={row.original.id}
        field='title'
        className='min-w-[220px]'
      />
    )
  },
  {
    accessorKey: 'dateAndLocation',
    header: 'Fecha y lugar',
    meta: { label: 'Fecha y lugar' },
    size: 60,
    cell: ({ row, cell }) => (
      <EditableTextCell
        value={cell.getValue<ExhibitionRow['dateAndLocation']>()}
        placeholder='Sin fecha y lugar'
        docId={row.original.id}
        field='dateAndLocation'
        className='min-w-[200px]'
        textClassName='text-muted-foreground font-normal'
      />
    )
  },
  {
    accessorKey: 'body',

    header: 'Cuerpo',
    meta: { label: 'Cuerpo' },
    cell: ({ cell }) => (
      <div className='text-foreground line-clamp-3 max-w-[25rem] text-sm'>
        {cell.getValue<ExhibitionRow['body']>()}
      </div>
    )
  },
  // {
  //   accessorKey: 'videoCount',
  //   header: 'Videos',
  //   size: 20,
  //   meta: { label: 'Cantidad de videos' },
  //   cell: ({ cell }) => (
  //     <Badge variant='outline' className='tabular-nums'>
  //       {cell.getValue<ExhibitionRow['videoCount']>()}
  //     </Badge>
  //   )
  // },
  {
    id: 'actions',
    size: 48,
    meta: { label: 'Acciones' },
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
