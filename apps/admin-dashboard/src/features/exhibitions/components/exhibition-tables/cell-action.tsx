'use client';

import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { ExhibitionRow } from '@/features/exhibitions/types';
import { IconEdit, IconDotsVertical, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';

interface CellActionProps {
  data: ExhibitionRow;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const onConfirm = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'exhibitions', data.id));
      toast.success('Exhibición eliminada.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('[Exhibitions] delete error', error);
      toast.error('No se pudo eliminar la exhibición.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-row-click='ignore'>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0'
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className='sr-only'>Abrir menú</span>
            <IconDotsVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/exhibitions/${data.id}`);
            }}
          >
            <IconEdit className='mr-2 h-4 w-4' /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
          >
            <IconTrash className='mr-2 h-4 w-4' /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
