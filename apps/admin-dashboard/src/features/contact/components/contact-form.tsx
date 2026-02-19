'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { IconTrash } from '@tabler/icons-react';

const CONTACT_DOC_ID = 'default';

type ContactItem = {
  id: string;
  label: string;
  url: string;
  order: number;
};

type ContactDoc = {
  items?: ContactItem[];
};

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function normalizeContactItems(items: ContactItem[]) {
  return items
    .map((item, index) => ({ ...item, order: item.order ?? index }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function SortableContactRow({
  item,
  onChange,
  onRemove
}: {
  item: ContactItem;
  onChange: (next: ContactItem) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        'border-border/60 bg-card flex flex-col gap-3 rounded-lg border p-3 shadow-xs sm:flex-row sm:items-center',
        isDragging ? 'opacity-70' : null
      )}
    >
      <button
        type='button'
        ref={setActivatorNodeRef}
        className='text-muted-foreground hover:text-foreground inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing'
        aria-label='Reordenar contacto'
        {...attributes}
        {...listeners}
      >
        <GripVertical className='h-4 w-4' />
      </button>
      <div className='flex flex-1 gap-3 sm:grid-cols-2'>
        <Input
          className='flex-1'
          value={item.label}
          placeholder='Etiqueta'
          onChange={(event) => onChange({ ...item, label: event.target.value })}
        />
        <Input
          className='flex-4'
          value={item.url}
          placeholder='URL'
          onChange={(event) => onChange({ ...item, url: event.target.value })}
        />
      </div>
      <Button type='button' variant='ghost' size='icon' onClick={onRemove}>
        <IconTrash className='h-4 w-4' />
      </Button>
    </div>
  );
}

export default function ContactForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactItems, setContactItems] = useState<ContactItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    let isMounted = true;
    const loadContact = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'contact', CONTACT_DOC_ID));
        if (!docSnap.exists()) {
          if (isMounted) setLoading(false);
          return;
        }
        const data = docSnap.data() as ContactDoc | undefined;
        const normalized = normalizeContactItems(data?.items ?? []);
        if (isMounted) {
          setContactItems(normalized);
        }
      } catch (error) {
        console.error('[Contact] load error', error);
        toast.error('No se pudo cargar Contacto.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadContact();

    return () => {
      isMounted = false;
    };
  }, []);

  const contactIds = useMemo(
    () => contactItems.map((item) => item.id),
    [contactItems]
  );

  const handleContactDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = contactItems.findIndex((item) => item.id === active.id);
    const newIndex = contactItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(contactItems, oldIndex, newIndex).map(
      (item, index) => ({ ...item, order: index })
    );
    setContactItems(next);
  };

  const handleContactChange = (next: ContactItem) => {
    setContactItems((prev) =>
      prev.map((item) => (item.id === next.id ? next : item))
    );
  };

  const handleContactRemove = (id: string) => {
    setContactItems((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index }))
    );
  };

  const handleContactAdd = () => {
    setContactItems((prev) => [
      ...prev,
      {
        id: createId(),
        label: '',
        url: '',
        order: prev.length
      }
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedItems = contactItems
        .map((item) => ({
          id: item.id,
          label: item.label.trim(),
          url: item.url.trim()
        }))
        .filter((item) => item.label || item.url)
        .map((item, index) => ({
          ...item,
          order: index
        }));

      await setDoc(
        doc(db, 'contact', CONTACT_DOC_ID),
        { items: cleanedItems },
        { merge: true }
      );
      setContactItems(cleanedItems);
      toast.success('Contacto actualizado.');
    } catch (error) {
      console.error('[Contact] save error', error);
      toast.error('No se pudo guardar Contacto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className='mx-auto w-full'>
      <CardContent className='space-y-6 pt-2'>
        {loading ? (
          <div className='space-y-3 pt-1'>
            <div className='bg-muted h-15 w-full animate-pulse rounded-lg' />
            <div className='bg-muted h-15 w-full animate-pulse rounded-lg' />
            <div className='bg-muted h-15 w-full animate-pulse rounded-lg' />
            <div className='flex justify-end gap-2'>
              <div className='bg-muted h-8 w-32 animate-pulse rounded-md' />
            </div>
            <div className='bg-muted h-10 w-40 animate-pulse rounded-md' />
          </div>
        ) : null}
        {!loading ? (
          <>
            {contactItems.length ? (
              <DndContext sensors={sensors} onDragEnd={handleContactDragEnd}>
                <SortableContext
                  items={contactIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className='flex flex-col gap-3'>
                    {contactItems.map((item) => (
                      <SortableContactRow
                        key={item.id}
                        item={item}
                        onChange={handleContactChange}
                        onRemove={() => handleContactRemove(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className='text-muted-foreground text-sm'>
                No hay contactos todavía.
              </div>
            )}
            <div className='flex flex-wrap items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 px-3 text-xs'
                onClick={handleContactAdd}
              >
                Agregar contacto
              </Button>
            </div>

            <Button
              type='button'
              disabled={saving || loading}
              onClick={handleSave}
            >
              {saving ? 'Guardando...' : 'Guardar Contacto'}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
