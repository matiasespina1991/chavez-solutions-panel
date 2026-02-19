'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import ItemsList from './items-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import type { MediaSet, MediaSetItem, Media } from '@/types/mediaset';

interface Props {
  mediaset: MediaSet;
  index: number;
  items: MediaSetItem[];
  mediaList: (Media & MediaSetItem)[];
}

const getSortedMediaEntries = (item: MediaSetItem) => {
  if (!Array.isArray(item.mediaItems) || item.mediaItems.length === 0) {
    return [];
  }
  return [...item.mediaItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

const getPrimaryMediaId = (item: MediaSetItem) => {
  const fromArray = getSortedMediaEntries(item)[0]?.mediaId;
  if (fromArray) return fromArray;
  return item.mediaId || null;
};

export default function MediasetItem({
  mediaset,
  index,
  items,
  mediaList
}: Props) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>('');

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: mediaset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  async function handleDelete() {
    try {
      setDeleting(true);
      await updateDoc(doc(db, 'mediasets', mediaset.id), {
        deletedAt: Timestamp.now()
      });
      toast.success('Fila eliminada');
    } catch (error) {
      console.error('Error deleting mediaset:', error);
      toast.error('Error al eliminar fila');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  const toggleAccordion = () => {
    setAccordionValue(accordionValue === 'item-1' ? '' : 'item-1');
  };

  return (
    <>
      <div className='flex items-center gap-3'>
        <span className='text-muted-foreground text-lg font-medium'>
          {index + 1}
        </span>
        <Card ref={setNodeRef} style={style} className='flex-1'>
          <Accordion
            type='single'
            collapsible
            value={accordionValue}
            onValueChange={setAccordionValue}
          >
            <AccordionItem value='item-1' className='border-0'>
              <CardHeader
                className='flex cursor-pointer flex-row items-center gap-4 space-y-0'
                onClick={toggleAccordion}
              >
                <button
                  {...attributes}
                  {...listeners}
                  className='cursor-grab active:cursor-grabbing'
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className='text-muted-foreground h-5 w-5' />
                </button>
                <div className='flex flex-1 items-center gap-3'>
                  <div
                    className='flex gap-1.5 transition-opacity duration-300'
                    style={{
                      opacity: accordionValue === 'item-1' ? 0 : 1
                    }}
                  >
                    {items.slice(0, 4).map((item) => {
                      const primaryMediaId = getPrimaryMediaId(item);
                      if (!primaryMediaId) return null;
                      const media = mediaList.find(
                        (m: any) => m.id === primaryMediaId
                      );
                      return media ? (
                        <MediaThumbnail key={item.id} media={media} />
                      ) : null;
                    })}
                    {items.length === 0 && (
                      <div className='bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded text-[0.6rem]'>
                        Vacío
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
                <AccordionTrigger
                  className='cursor-pointer hover:no-underline'
                  onClick={(e) => e.stopPropagation()}
                />
              </CardHeader>
              <AccordionContent onClick={(e) => e.stopPropagation()}>
                <CardContent>
                  <ItemsList
                    mediasetId={mediaset.id}
                    category={mediaset.category}
                    items={items.map((item) => ({
                      ...item,
                      media: mediaList.find(
                        (m: any) => m.id === getPrimaryMediaId(item)
                      )
                    }))}
                  />
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Fila</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminara la fila (soft-delete). Los items permaneceran en la
              base de datos. Esta accion puede deshacerse limpiando el campo
              deletedAt en Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MediaThumbnail({ media }: { media: Media }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const storagePath =
    media.type === 'image'
      ? media.paths?.derivatives?.webp_thumb?.storagePath ||
        media.paths?.derivatives?.webp_small?.storagePath ||
        media.paths?.original?.storagePath
      : media.paths?.poster?.storagePath;

  const { src } = useStorageAssetSrc(storagePath ? { storagePath } : null, {
    preferDirect: false
  });

  if (!src) {
    return <Skeleton className='h-12 w-12 rounded' />;
  }

  return (
    <div className='bg-muted relative h-12 w-12 overflow-hidden rounded'>
      {!imageLoaded && <Skeleton className='absolute inset-0' />}
      <Image
        src={src}
        alt='thumbnail'
        fill
        className={`object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
        sizes='48px'
      />
    </div>
  );
}
