'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IconMovie, IconPhoto } from '@tabler/icons-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaDoc } from '@/lib/media-upload';
import { toast } from 'sonner';

export type { MediaDoc } from '@/lib/media-upload';

export type MediaPickerSelectionMode = 'single' | 'multiple';

export type MediaPickerDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  selectionMode?: MediaPickerSelectionMode;
  selectedIds?: string[];
  allowedTypes?: Array<MediaDoc['type']>;
  filterPredicate?: (media: MediaDoc) => boolean;
  maxSelection?: number;
  onConfirm: (items: MediaDoc[]) => void | boolean | Promise<void | boolean>;
  onOpenChange: (open: boolean) => void;
};

function getGalleryPreviewPath(media: MediaDoc) {
  if (media.type === 'video') {
    return media.paths?.poster?.storagePath ?? null;
  }

  return (
    media.paths?.derivatives?.webp_medium?.storagePath ??
    media.paths?.derivatives?.webp_small?.storagePath ??
    media.paths?.original?.storagePath ??
    null
  );
}

function MediaPickerCard({
  media,
  selected,
  selectionOrder,
  showSelectionOrder,
  onSelect
}: {
  media: MediaDoc;
  selected: boolean;
  selectionOrder: number | null;
  showSelectionOrder: boolean;
  onSelect: () => void;
}) {
  const previewPath = getGalleryPreviewPath(media);
  const { src, hasSource, handleError } = useStorageAssetSrc(
    previewPath ? { storagePath: previewPath } : null,
    { preferDirect: false }
  );
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const loadStartRef = useRef(0);
  const loadTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPreviewLoaded(false);
    loadStartRef.current = Date.now();
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, [src]);

  return (
    <button
      type='button'
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'border-border/60 bg-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border text-left shadow-xs transition',
        selected &&
          'ring-offset-background ring-2 ring-[#006cd1]/40 ring-offset-2'
      )}
    >
      <span className='pointer-events-none absolute inset-0 z-0 bg-black/3 opacity-0 transition group-hover:opacity-100' />
      <div className='bg-muted relative z-10 aspect-[4/3] w-full overflow-hidden'>
        {hasSource && src ? (
          <img
            src={src}
            alt={media.title || media.id}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-500',
              isPreviewLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading='lazy'
            onLoad={() => {
              const elapsed = Date.now() - loadStartRef.current;
              const remaining = Math.max(0, 180 - elapsed);
              if (remaining === 0) {
                setIsPreviewLoaded(true);
                return;
              }
              loadTimeoutRef.current = window.setTimeout(() => {
                setIsPreviewLoaded(true);
                loadTimeoutRef.current = null;
              }, remaining);
            }}
            onError={() => {
              setIsPreviewLoaded(false);
              if (loadTimeoutRef.current !== null) {
                window.clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
              }
              handleError();
            }}
          />
        ) : null}
        {hasSource && src ? (
          <div
            className={cn(
              'bg-muted/50 absolute inset-0 transition-opacity duration-500',
              isPreviewLoaded ? 'opacity-0' : 'animate-pulse opacity-100'
            )}
          />
        ) : null}
        {!hasSource || !src ? (
          <div className='text-muted-foreground flex h-full flex-col items-center justify-center text-center text-xs'>
            {media.processed ? null : (
              <svg
                className='text-muted-foreground mb-2 h-6 w-6 animate-spin'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
            )}
            {media.processed ? 'Sin vista previa' : <p>Procesando…</p>}
            {media.processed ? '' : 'Este proceso puede tardar varios minutos.'}
          </div>
        ) : null}
        <span
          className={cn(
            'absolute top-2 left-2 z-10 inline-flex items-center justify-center rounded-full p-1.5',
            media.type === 'video'
              ? 'bg-sky-100/80 text-sky-700'
              : 'bg-amber-100/80 text-amber-700'
          )}
        >
          {media.type === 'video' ? (
            <IconMovie className='h-3.5 w-3.5' aria-hidden='true' />
          ) : (
            <IconPhoto className='h-3.5 w-3.5' aria-hidden='true' />
          )}
          <span className='sr-only'>
            {media.type === 'video' ? 'Video' : 'Imagen'}
          </span>
        </span>
      </div>
      <div className='relative z-10 flex flex-1 flex-col gap-1 px-3 py-2'>
        <div className='text-foreground truncate text-sm font-medium'>
          {media.title || 'Sin título'}
        </div>
        <div className='text-muted-foreground text-xs'>
          {media.origin?.context === 'exhibition' ? 'Exhibición' : 'Galería'}
        </div>
      </div>
      {showSelectionOrder && selected && selectionOrder !== null ? (
        <span
          className='absolute right-2 bottom-2 z-30 inline-flex h-6 min-w-[1.65rem] items-center justify-center rounded-full border border-white/60 bg-black/75 px-1.5 text-[11px] font-semibold text-white shadow-sm'
          aria-label={`Posición seleccionada ${selectionOrder}`}
        >
          {selectionOrder}
        </span>
      ) : null}
    </button>
  );
}

export default function MediaPickerDialog({
  open,
  title,
  description,
  confirmLabel = 'Aceptar',
  selectionMode = 'single',
  selectedIds = [],
  allowedTypes,
  filterPredicate,
  maxSelection,
  onConfirm,
  onOpenChange
}: MediaPickerDialogProps) {
  const [items, setItems] = useState<MediaDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const wasOpenRef = useRef(false);
  const pageSize = 8;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSelection(selectedIds);
      setPage(1);
    }
    wasOpenRef.current = open;
  }, [open, selectedIds]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setLoading(true);
    console.log('[MediaPickerDialog] Loading media...');
    getDocs(query(collection(db, 'media'), orderBy('createdAt', 'desc')))
      .then((snapshot) => {
        if (!isMounted) return;
        const rows = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Omit<MediaDoc, 'id'>;
            return { ...data, id: docSnap.id };
          })
          .filter((item) => !item.deletedAt);
        console.log('[MediaPickerDialog] Total media loaded:', rows.length);
        console.log('[MediaPickerDialog] Sample media:', rows[0]);
        setItems(rows);
      })
      .catch((error) => {
        console.error('[MediaPickerDialog] load media error', error);
        if (isMounted) setItems([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  console.log('[MediaPickerDialog] Total items loaded:', items.length);
  console.log('[MediaPickerDialog] allowedTypes:', allowedTypes);

  let filteredItems = allowedTypes?.length
    ? items.filter((item) => allowedTypes.includes(item.type))
    : items;

  console.log(
    '[MediaPickerDialog] After allowedTypes filter:',
    filteredItems.length
  );

  if (filterPredicate) {
    console.log(
      '[MediaPickerDialog] Before custom filter:',
      filteredItems.length
    );
    filteredItems = filteredItems.filter(filterPredicate);
    console.log(
      '[MediaPickerDialog] After custom filter:',
      filteredItems.length
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (!open) return;
    setPage((prev) => Math.min(prev, totalPages));
  }, [open, totalPages]);

  const toggleSelection = (id: string) => {
    setSelection((prev) => {
      if (selectionMode === 'single') {
        return prev[0] === id ? [] : [id];
      }
      // If deselecting, allow it
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      // If selecting and there's a maxSelection limit
      if (maxSelection !== undefined && prev.length >= maxSelection) {
        toast.error(
          `Has alcanzado el límite de ${maxSelection} ${maxSelection === 1 ? 'media' : 'medias'} por mediaset`
        );
        return prev;
      }
      // Add to selection
      return [...prev, id];
    });
  };

  const selectionOrderById = useMemo(
    () => new Map(selection.map((id, index) => [id, index + 1])),
    [selection]
  );

  const filteredItemsById = useMemo(
    () => new Map(filteredItems.map((item) => [item.id, item])),
    [filteredItems]
  );

  const selectedItems = useMemo(
    () =>
      selection
        .map((id) => filteredItemsById.get(id))
        .filter((item): item is MediaDoc => Boolean(item)),
    [selection, filteredItemsById]
  );

  const skeletonCards = Array.from({ length: 15 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[calc(100vh-9rem)] w-[min(96vw,980px)] flex-col overflow-hidden sm:max-h-[calc(100vh-4rem)] sm:max-w-[980px]'>
        <DialogHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='space-y-1'>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </div>
          {filteredItems.length > pageSize ? (
            <div className='bg-background inline-flex items-center gap-2 self-end rounded-md px-2 py-1 text-xs'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-7 w-7'
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='min-w-[4.5rem] text-center'>
                {currentPage} / {totalPages}
              </span>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-7 w-7'
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          ) : null}
        </DialogHeader>
        {loading ? (
          <div className='space-y-4'>
            <div className='text-muted-foreground text-sm'>
              Cargando galería...
            </div>
            <div className='grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5'>
              {skeletonCards.map((_, index) => (
                <div
                  key={index}
                  className='border-border/60 bg-card flex h-full flex-col overflow-hidden rounded-lg border shadow-xs'
                >
                  <Skeleton className='aspect-[4/3] w-full' />
                  <div className='flex flex-1 flex-col gap-2 px-3 py-2'>
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            No hay archivos disponibles.
          </div>
        ) : (
          <div className='max-h-[calc(100vh-12rem)] overflow-y-auto sm:p-[1rem]'>
            <div
              className={cn(
                'bg-muted/30 grid grid-cols-2 gap-4 rounded-md p-3 sm:bg-transparent sm:p-0',
                'lg:grid-cols-4'
              )}
            >
              {pagedItems.map((media) => (
                <MediaPickerCard
                  key={media.id}
                  media={media}
                  selected={selection.includes(media.id)}
                  selectionOrder={selectionOrderById.get(media.id) ?? null}
                  showSelectionOrder={selectionMode === 'multiple'}
                  onSelect={() => toggleSelection(media.id)}
                />
              ))}
            </div>
          </div>
        )}
        <DialogFooter className='flex-row items-center justify-between sm:justify-between'>
          <div className='text-muted-foreground flex-1 text-left text-sm'>
            {selectionMode === 'multiple' && selection.length > 0 && (
              <span>
                {selection.length}{' '}
                {selection.length === 1
                  ? 'archivo seleccionado'
                  : 'archivos seleccionados'}
              </span>
            )}
          </div>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={async () => {
                const shouldClose = await onConfirm(selectedItems);
                if (shouldClose !== false) {
                  onOpenChange(false);
                }
              }}
              disabled={selection.length === 0}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
