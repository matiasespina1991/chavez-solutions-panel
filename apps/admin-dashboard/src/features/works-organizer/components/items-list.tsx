'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Link2, Plus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import { cn } from '@/lib/utils';
import type { MediaSetItem, Media } from '@/types/mediaset';
import AssignMediaDialogV2 from './assign-media-dialog-v2';
import MediaLinkDialog from './media-link-dialog';
import MediaPickerDialog, {
  type MediaDoc
} from '@/components/media-picker-dialog';

interface MediaItemWithData extends MediaSetItem {
  media?: Media;
}

interface Props {
  mediasetId: string;
  category: 'home' | 'caves' | 'landscapes';
  items: MediaItemWithData[];
}

const getSortedMediaEntries = (item: MediaSetItem) => {
  if (!Array.isArray(item.mediaItems) || item.mediaItems.length === 0) {
    return [];
  }
  return [...item.mediaItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

const getItemMediaIds = (item: MediaSetItem) => {
  const fromArray = getSortedMediaEntries(item)
    .map((entry) => entry.mediaId)
    .filter((mediaId): mediaId is string => Boolean(mediaId));
  if (fromArray.length > 0) return fromArray;
  return item.mediaId ? [item.mediaId] : [];
};

function MediaItemCard({
  item,
  mediasetId,
  category
}: {
  item: MediaItemWithData;
  mediasetId: string;
  category: 'home' | 'caves' | 'landscapes';
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editCarouselOpen, setEditCarouselOpen] = useState(false);
  const [assignedMediaIds, setAssignedMediaIds] = useState<Set<string>>(
    new Set()
  );
  const [localLink, setLocalLink] = useState<Media['link']>(
    item.media?.link ?? null
  );

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const thumbnailPath =
    item.media?.type === 'image'
      ? (item.media?.paths?.derivatives?.webp_thumb?.storagePath ??
        item.media?.paths?.derivatives?.webp_small?.storagePath ??
        item.media?.paths?.original?.storagePath)
      : item.media?.paths?.poster?.storagePath;

  const { src: thumbnailSrc } = useStorageAssetSrc(
    thumbnailPath ? { storagePath: thumbnailPath } : null,
    { preferDirect: false }
  );
  const isCarousel = (item.mediaItems?.length ?? 0) > 1;
  const initialCarouselIds = getItemMediaIds(item);
  const hasActiveProvider = Boolean(
    localLink?.provider && localLink?.url?.trim()
  );
  const activeProvider = hasActiveProvider ? localLink?.provider : null;

  useEffect(() => {
    setLocalLink(item.media?.link ?? null);
  }, [item.media?.link]);

  useEffect(() => {
    if (!editCarouselOpen || !isCarousel) return;

    let isMounted = true;

    const loadAssignedMedia = async () => {
      try {
        const mediasetsQuery = query(
          collection(db, 'mediasets'),
          orderBy('ordering', 'asc')
        );
        const mediasetsSnapshot = await getDocs(mediasetsQuery);

        const categoryMediasets = mediasetsSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((ms: any) => ms.category === category && !ms.deletedAt);

        const assignedIds = new Set<string>();

        for (const mediaset of categoryMediasets) {
          const itemsSnapshot = await getDocs(
            collection(db, 'mediasets', mediaset.id, 'items')
          );
          itemsSnapshot.docs.forEach((itemDoc) => {
            const itemData = itemDoc.data();
            if (itemData.mediaId) {
              assignedIds.add(itemData.mediaId);
            }
            if (Array.isArray(itemData.mediaItems)) {
              itemData.mediaItems.forEach(
                (entry: { mediaId?: string; order?: number }) => {
                  if (entry?.mediaId) assignedIds.add(entry.mediaId);
                }
              );
            }
          });
        }

        initialCarouselIds.forEach((mediaId) => assignedIds.delete(mediaId));

        if (isMounted) setAssignedMediaIds(assignedIds);
      } catch (error) {
        console.error('[ItemsList] load assigned media error', error);
        if (isMounted) setAssignedMediaIds(new Set());
      }
    };

    loadAssignedMedia();

    return () => {
      isMounted = false;
    };
  }, [editCarouselOpen, isCarousel, category, initialCarouselIds.join('|')]);

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'mediasets', mediasetId, 'items', item.id));
      toast.success('Media removido del mediaset');
    } catch (error) {
      console.error('Error removing media:', error);
      toast.error('Error al remover media');
    }
  }

  async function handleSaveCarousel(selectedMedia: MediaDoc[]) {
    if (selectedMedia.length < 2) {
      toast.error('Seleccioná al menos 2 medios para el carousel.');
      return false;
    }

    try {
      const orderedRefs = selectedMedia.map((media, index) => ({
        mediaId: media.id,
        order: index
      }));

      const primaryMediaId = orderedRefs[0]?.mediaId;
      if (!primaryMediaId) {
        toast.error('No se pudo determinar el medio principal.');
        return false;
      }

      await updateDoc(doc(db, 'mediasets', mediasetId, 'items', item.id), {
        mediaId: primaryMediaId,
        mediaItems: orderedRefs
      });

      toast.success('Carousel actualizado');
      return true;
    } catch (error) {
      console.error('[ItemsList] update carousel error', error);
      toast.error('No se pudo actualizar el carousel.');
      return false;
    }
  }

  if (!item.media) {
    return (
      <div className='bg-muted flex aspect-square items-center justify-center rounded-lg'>
        <p className='text-muted-foreground text-xs'>Media no encontrado</p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='bg-muted/50 group relative flex flex-col gap-2 rounded-lg p-3'
    >
      <button
        onClick={handleRemove}
        className='bg-background/80 hover:bg-background absolute top-1 right-1 z-10 cursor-pointer rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100'
        title='Remover del mediaset'
      >
        <X className='h-3 w-3' />
      </button>
      <div className='flex items-center gap-2'>
        <button
          {...attributes}
          {...listeners}
          className='cursor-grab active:cursor-grabbing'
        >
          <GripVertical className='text-muted-foreground h-4 w-4' />
        </button>
        <p className='text-xs font-medium'>
          {isCarousel
            ? 'Carousel'
            : item.media.type === 'image'
              ? 'Imagen'
              : 'Video'}
        </p>
        {hasActiveProvider ? (
          <a
            href={localLink?.url ?? '#'}
            target='_blank'
            rel='noreferrer noopener'
            onClick={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className='bg-background/80 text-foreground hover:bg-background inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[11px] font-medium shadow-sm transition'
            aria-label='Abrir link del proveedor'
            title='Abrir link del proveedor'
          >
            {activeProvider === 'zora' ? (
              <img
                src='/assets/branding/logos/zora_logo.svg'
                alt=''
                aria-hidden='true'
                className='h-3.5 w-3.5 rounded-full'
              />
            ) : null}
            <span>{activeProvider}</span>
          </a>
        ) : null}
      </div>

      <div className='bg-muted relative aspect-square w-full overflow-hidden rounded'>
        {!imageLoaded && thumbnailSrc && (
          <Skeleton className='absolute inset-0' />
        )}
        {thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt=''
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(false)}
          />
        )}
        {isCarousel ? (
          <span
            className='bg-background/90 text-foreground pointer-events-none absolute right-2 bottom-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm'
            aria-hidden='true'
          >
            <span className='text-[11px] leading-none'>⧉</span>
          </span>
        ) : null}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 transition-all duration-200',
            'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100'
          )}
        >
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              setLinkDialogOpen(true);
            }}
            className={cn(
              'bg-background/90 hover:bg-background inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-sm',
              'focus-visible:ring-ring/50 text-foreground focus-visible:ring-2 focus-visible:outline-none'
            )}
            title='Editar link'
            aria-label='Editar link de media'
          >
            <Link2 className='h-4 w-4' />
          </button>
          {isCarousel ? (
            <button
              type='button'
              onClick={(event) => {
                event.stopPropagation();
                setEditCarouselOpen(true);
              }}
              className={cn(
                'bg-background/90 hover:bg-background inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-sm',
                'focus-visible:ring-ring/50 text-foreground focus-visible:ring-2 focus-visible:outline-none'
              )}
              title='Editar carousel'
              aria-label='Editar carousel'
            >
              <span className='text-[15px] leading-none'>⧉</span>
            </button>
          ) : null}
        </div>
      </div>

      <MediaLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        mediaId={item.media.id}
        initialLink={localLink}
        onSaved={(nextLink) => {
          setLocalLink(nextLink);
        }}
      />
      {isCarousel ? (
        <MediaPickerDialog
          open={editCarouselOpen}
          onOpenChange={setEditCarouselOpen}
          title='Editar Carousel'
          description='Reordená la selección del carousel. El orden define la reproducción.'
          confirmLabel='Guardar'
          selectionMode='multiple'
          selectedIds={initialCarouselIds}
          maxSelection={10}
          filterPredicate={(media) => !assignedMediaIds.has(media.id)}
          onConfirm={handleSaveCarousel}
        />
      ) : null}
    </div>
  );
}

export default function ItemsList({ mediasetId, category, items }: Props) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [addModeMenuOpen, setAddModeMenuOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'single' | 'carousel'>('single');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((m) => m.id === active.id);
      const newIndex = items.findIndex((m) => m.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);

      // Update orders in Firestore
      try {
        const updates = reordered.map((item, idx) =>
          updateDoc(doc(db, 'mediasets', mediasetId, 'items', item.id), {
            order: idx
          })
        );
        await Promise.all(updates);
        toast.success('Orden actualizado');
      } catch (error) {
        console.error('Error updating order:', error);
        toast.error('Error al actualizar orden');
      }
    }
  }

  function handleAssignComplete() {
    setAssignDialogOpen(false);
  }

  function handleSelectMode(mode: 'single' | 'carousel') {
    setAssignMode(mode);
    setAddModeMenuOpen(false);
    setAssignDialogOpen(true);
  }

  if (items.length === 0) {
    return (
      <>
        <div className='grid grid-cols-4 gap-3'>
          <DropdownMenu
            open={addModeMenuOpen}
            onOpenChange={setAddModeMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className='border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/20 flex h-full min-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors'
              >
                <Plus className='text-muted-foreground h-8 w-8' />
                <span className='text-muted-foreground text-sm font-medium'>
                  Agregar Medios
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='center' sideOffset={0} className='w-64'>
              <DropdownMenuItem
                className='cursor-pointer'
                onSelect={() => handleSelectMode('single')}
              >
                Agregar imagen o video
              </DropdownMenuItem>
              <DropdownMenuItem
                className='cursor-pointer'
                onSelect={() => handleSelectMode('carousel')}
              >
                Agregar carousel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AssignMediaDialogV2
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          mediasetId={mediasetId}
          category={category}
          mode={assignMode}
          onSuccess={handleAssignComplete}
        />
      </>
    );
  }

  return (
    <div className='space-y-4'>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.slice(0, 4).map((m) => m.id)}
          strategy={rectSortingStrategy}
        >
          <div className='grid grid-cols-4 gap-3'>
            {items.slice(0, 4).map((item) => (
              <MediaItemCard
                key={item.id}
                item={item}
                mediasetId={mediasetId}
                category={category}
              />
            ))}
            {items.length < 4 && (
              <DropdownMenu
                open={addModeMenuOpen}
                onOpenChange={setAddModeMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className='border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/20 flex h-full min-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors'
                  >
                    <Plus className='text-muted-foreground h-8 w-8' />
                    <span className='text-muted-foreground text-sm font-medium'>
                      Agregar Medios
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align='start'
                  sideOffset={8}
                  className='w-64'
                >
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onSelect={() => handleSelectMode('single')}
                  >
                    Agregar imagen o video
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onSelect={() => handleSelectMode('carousel')}
                  >
                    Agregar carousel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <AssignMediaDialogV2
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        mediasetId={mediasetId}
        category={category}
        mode={assignMode}
        onSuccess={handleAssignComplete}
      />
    </div>
  );
}
