'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface Props {
  category: 'home' | 'caves' | 'landscapes';
  currentMinOrdering: number;
  currentMaxOrdering: number;
  onCreated?: (position: 'start' | 'end') => void;
}

export default function NewMediasetDialog({
  category,
  currentMinOrdering,
  currentMaxOrdering,
  onCreated
}: Props) {
  const [creating, setCreating] = useState(false);

  async function handleCreate(position: 'start' | 'end') {
    try {
      setCreating(true);
      const hasItems = currentMaxOrdering >= currentMinOrdering;
      const ordering = hasItems
        ? position === 'start'
          ? currentMinOrdering - 1
          : currentMaxOrdering + 1
        : 0;
      await addDoc(collection(db, 'mediasets'), {
        category,
        title: null,
        ordering,
        createdAt: Timestamp.now(),
        modifiedAt: Timestamp.now(),
        publishedAt: null,
        deletedAt: null
      });
      toast.success('Fila creada');
      onCreated?.(position);
    } catch (error) {
      console.error('Error creating mediaset:', error);
      toast.error('Error al crear mediaset');
    } finally {
      setCreating(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={creating}>
          {creating ? 'Creando...' : 'Agregar nueva Fila'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='min-w-56'>
        <DropdownMenuItem
          disabled={creating}
          onClick={() => handleCreate('start')}
          className='flex items-center gap-2'
        >
          <ArrowUpToLine className='h-4 w-4 cursor-pointer' />
          Agregar al principio
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={creating}
          onClick={() => handleCreate('end')}
          className='flex items-center gap-2'
        >
          <ArrowDownToLine className='h-4 w-4 cursor-pointer' />
          Agregar al final
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
