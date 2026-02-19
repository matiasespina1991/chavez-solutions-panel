'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileUploader } from '@/components/file-uploader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import { cn, formatBytes } from '@/lib/utils';
import {
  IconChevronLeft,
  IconChevronRight,
  IconArrowsMaximize,
  IconDeviceFloppy,
  IconInfoCircle,
  IconMovie,
  IconPhoto
} from '@tabler/icons-react';
import { MediaDoc, uploadMediaFiles } from '@/lib/media-upload';
import { toast } from 'sonner';

const MAX_UPLOAD_SIZE = 250 * 1024 * 1024;

function getPreviewPath(media: MediaDoc) {
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

function getProcessingLabel(stage?: string) {
  switch (stage) {
    case 'created':
      return 'Preparando';
    case 'download_start':
      return 'Preparando';
    case 'downloaded':
      return 'Preparando';
    case 'metadata':
      return 'Obteniendo metadata';
    case 'poster_generated':
      return 'Procesando portada';
    case 'poster_uploaded':
      return 'Procesando portada';
    case 'variants_ready':
      return 'Creando variantes';
    case 'transcode_360':
      return 'Transcodificando 360p';
    case 'transcode_720':
      return 'Transcodificando 720p';
    case 'transcode_1080':
      return 'Transcodificando 1080p';
    case 'derivatives_ready':
      return 'Derivados listos';
    case 'original_deleted':
      return 'Limpiando';
    case 'done':
      return 'Listo';
    default:
      return 'Procesando';
  }
}

function formatOriginalFilename(filename?: string | null) {
  if (!filename) return '';
  const trimmed = filename.trim();
  return trimmed;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'object' && value !== null) {
    if ('toDate' in value && typeof value.toDate === 'function') {
      const maybeDate = value.toDate();
      return maybeDate instanceof Date ? maybeDate : null;
    }
    if (
      'seconds' in value &&
      typeof (value as { seconds?: unknown }).seconds === 'number'
    ) {
      return new Date((value as { seconds: number }).seconds * 1000);
    }
  }

  return null;
}

function formatCreatedAt(value: unknown) {
  const date = toDate(value);
  if (!date) return '';

  const weekdays = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado'
  ] as const;
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ] as const;

  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${weekday}, ${day} de ${month} de ${year} a las ${hh}:${min} hs`;
}

type MediaCardProps = {
  media: MediaDoc;
  isSelected?: boolean;
  onPreviewClick?: () => void;
  onSelect?: () => void;
  dataMediaId?: string;
};

function MediaCard({
  media,
  isSelected,
  onPreviewClick,
  onSelect,
  dataMediaId
}: MediaCardProps) {
  const previewPath = useMemo(() => getPreviewPath(media), [media]);
  const { src, hasSource, handleError } = useStorageAssetSrc(
    previewPath ? { storagePath: previewPath } : null,
    { preferDirect: false }
  );
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isInfoTooltipOpen, setIsInfoTooltipOpen] = useState(false);
  const [localTitle, setLocalTitle] = useState(media.title ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const loadStartRef = useRef(0);
  const loadTimeoutRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const draftTitleRef = useRef(media.title ?? '');
  const savingRef = useRef(false);
  const progressValue = Math.min(
    100,
    Math.max(0, media.processing?.progress ?? 0)
  );
  const hasProcessing = typeof media.processing?.progress === 'number';
  const processingLabel = getProcessingLabel(media.processing?.stage);
  const originalFilenameLabel = formatOriginalFilename(media.originalFilename);
  const createdAtLabel = formatCreatedAt(media.createdAt);
  const originLabel =
    media.origin?.context === 'exhibition' ? 'Exhibición' : null;
  const hasSizeBytes = typeof media.sizeBytes === 'number';

  useEffect(() => {
    if (!isEditing) {
      const nextTitle = media.title ?? '';
      setLocalTitle(nextTitle);
      draftTitleRef.current = nextTitle;
    }
  }, [media.title, isEditing]);

  useEffect(() => {
    setIsPreviewLoaded(false);
    loadStartRef.current = Date.now();
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, [src]);

  useEffect(() => {
    if (!isEditing) return;
    const element = titleRef.current;
    if (!element) return;
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [isEditing]);

  const saveTitle = async () => {
    if (savingRef.current) return;
    const nextTitle = (draftTitleRef.current ?? '').trim();
    const currentTitle = (media.title ?? '').trim();

    if (nextTitle === currentTitle) {
      setIsEditing(false);
      setLocalTitle(media.title ?? '');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'media', media.id), {
        title: nextTitle
      });
      setLocalTitle(nextTitle);
      setIsEditing(false);
    } catch (error) {
      console.error('[Media] update title error', error);
      toast.error('No se pudo actualizar el título.');
      setIsEditing(true);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div
      data-media-id={dataMediaId}
      className={cn(
        'border-border/60 bg-card group/media-card relative flex h-full flex-col overflow-hidden rounded-lg border shadow-xs',
        isSelected &&
          'ring-offset-background ring-2 ring-[#006cd1]/40 ring-offset-2'
      )}
    >
      <button
        type='button'
        aria-label='Abrir vista previa'
        onClick={onPreviewClick}
        className={cn(
          'group/preview bg-muted focus-visible:ring-ring/50 relative aspect-[4/3] w-full overflow-hidden text-left transition outline-none focus-visible:ring-2',
          onPreviewClick ? 'cursor-pointer' : 'cursor-default'
        )}
      >
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
            {!media.processed && hasProcessing ? (
              <div className='mt-3 w-[70%]'>
                <div className='bg-muted-foreground/20 h-1.5 w-full rounded-full'>
                  <div
                    className='bg-foreground/60 h-1.5 rounded-full transition-all'
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <div className='mt-1 text-[10px] tracking-wide uppercase'>
                  {processingLabel} · {progressValue}%
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <span
          className={cn(
            'absolute top-2 left-2 z-10 inline-flex items-center justify-center rounded-full p-1.5',
            media.type === 'video'
              ? 'bg-sky-100/80 text-sky-700'
              : 'bg-amber-50/80 text-amber-800'
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
        <span
          className={cn(
            'bg-background/80 text-foreground pointer-events-none absolute right-2 bottom-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition duration-250 ease-out',
            isInfoTooltipOpen
              ? 'scale-100 opacity-100'
              : 'scale-90 opacity-0 group-hover/preview:scale-100 group-hover/preview:opacity-100'
          )}
        >
          <IconArrowsMaximize className='h-4 w-4' />
        </span>
        <span
          className={cn(
            'pointer-events-none absolute inset-0 bg-black/10 transition',
            isInfoTooltipOpen
              ? 'opacity-100'
              : 'opacity-0 group-hover/preview:opacity-100'
          )}
        />
      </button>
      {createdAtLabel ? (
        <Tooltip onOpenChange={setIsInfoTooltipOpen}>
          <TooltipTrigger asChild>
            <button
              type='button'
              className={cn(
                'bg-background/80 text-foreground absolute top-2 right-2 z-20 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-sm transition-opacity duration-200 sm:inline-flex',
                isInfoTooltipOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover/media-card:opacity-100'
              )}
              aria-label='Info de subida'
              onClick={(event) => event.stopPropagation()}
            >
              <IconInfoCircle opacity={0.7} className='h-4 w-4' />
            </button>
          </TooltipTrigger>
          <TooltipContent side='bottom' align='end'>
            <span>{createdAtLabel}</span>
          </TooltipContent>
        </Tooltip>
      ) : null}
      <div
        className={cn(
          'peer flex flex-1 flex-col gap-0.5 rounded-b-lg px-3 py-2 transition-colors',
          onSelect && 'hover:bg-muted/40 cursor-pointer',
          isSelected && 'bg-muted/40'
        )}
        onClick={() => onSelect?.()}
      >
        <span
          ref={titleRef}
          contentEditable={isEditing && !isSaving}
          suppressContentEditableWarning
          role='textbox'
          aria-label='Editar título'
          className={cn(
            'text-foreground text-left text-sm leading-tight font-medium outline-none',
            isEditing
              ? 'caret-foreground inline-block min-h-[1.25rem] min-w-[6ch] cursor-text'
              : 'w-fit truncate'
          )}
          onClick={() => {
            if (!isEditing && !isSaving) {
              setIsEditing(true);
            }
          }}
          onInput={(event) => {
            draftTitleRef.current = event.currentTarget.textContent ?? '';
          }}
          onBlur={() => {
            if (isEditing) saveTitle();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              saveTitle();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setIsEditing(false);
              setLocalTitle(media.title ?? '');
              draftTitleRef.current = media.title ?? '';
            }
          }}
        >
          {isEditing ? draftTitleRef.current : localTitle || 'Sin título'}
        </span>
        {originalFilenameLabel ? (
          <span className='text-muted-foreground truncate text-[11px] leading-tight'>
            {originalFilenameLabel}
          </span>
        ) : null}
        {originLabel || hasSizeBytes ? (
          <div
            className={cn(
              'text-muted-foreground flex items-center text-xs leading-tight',
              originLabel ? 'justify-between' : 'justify-end'
            )}
          >
            {originLabel ? <span>{originLabel}</span> : <span />}
            {hasSizeBytes ? (
              <span className='inline-flex items-center gap-1'>
                <IconDeviceFloppy className='h-3.5 w-3.5' aria-hidden='true' />
                {formatBytes(media.sizeBytes!, { decimals: 1 })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {!isSelected ? (
        <span className='peer-hover:ring-muted-foreground/30 peer-hover:ring-offset-background pointer-events-none absolute inset-0 rounded-lg ring-0 ring-transparent ring-offset-0 transition peer-hover:ring-2 peer-hover:ring-offset-2' />
      ) : null}
    </div>
  );
}

function UploadCard({
  onUpload,
  progresses
}: {
  onUpload: (files: File[]) => Promise<void>;
  progresses: Record<string, number>;
}) {
  return (
    <div className='border-border/60 bg-card flex h-full flex-col overflow-hidden rounded-lg border shadow-xs'>
      <div className='flex flex-1 p-5'>
        <FileUploader
          onUpload={onUpload}
          progresses={progresses}
          accept={{ 'image/*': [], 'video/*': [] }}
          maxFiles={12}
          maxSize={MAX_UPLOAD_SIZE}
          multiple
          containerClassName='flex-1 gap-3'
          className='h-full w-full flex-1'
          compact
        />
      </div>
    </div>
  );
}

function MediaGallerySkeleton({ rows = 6 }: { rows?: number }) {
  const items = Array.from({ length: rows });
  return (
    <div className='grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5'>
      <div className='border-border/60 bg-card flex h-full flex-col overflow-hidden rounded-lg border shadow-xs'>
        <div className='flex flex-1 p-5'>
          <div className='border-muted-foreground/25 flex h-52 w-full items-center justify-center rounded-lg border-2 border-dashed'>
            <Skeleton className='h-10 w-10 rounded-full' />
          </div>
        </div>
      </div>
      {items.map((_, index) => (
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
  );
}

type MediaGalleryProps = {
  selectedId?: string | null;
  onSelectionChange?: (media: MediaDoc | null) => void;
};

export default function MediaGallery({
  selectedId = null,
  onSelectionChange
}: MediaGalleryProps) {
  const [items, setItems] = useState<MediaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [progresses, setProgresses] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isLightboxLoaded, setIsLightboxLoaded] = useState(false);
  const [isDialogTitleEditing, setIsDialogTitleEditing] = useState(false);
  const [dialogTitleDraft, setDialogTitleDraft] = useState('');
  const [isDialogTitleSaving, setIsDialogTitleSaving] = useState(false);
  const dialogTitleSavingRef = useRef(false);
  const activeMedia =
    activeIndex === null ? null : (items[activeIndex] ?? null);
  const totalItems = items.length;
  const canGoPrev = activeIndex !== null && activeIndex > 0;
  const canGoNext = activeIndex !== null && activeIndex < totalItems - 1;

  const goPrev = () => {
    if (!canGoPrev) return;
    setActiveIndex((prev) => (prev === null ? prev : prev - 1));
  };

  const goNext = () => {
    if (!canGoNext) return;
    setActiveIndex((prev) => (prev === null ? prev : prev + 1));
  };

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.isContentEditable) return;
      const tagName = target.tagName;
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, canGoPrev, canGoNext]);

  const lightboxImageAsset = useMemo(() => {
    if (!activeMedia || activeMedia.type !== 'image') return null;
    const candidates = [
      activeMedia.paths?.derivatives?.webp_large,
      activeMedia.paths?.derivatives?.webp_medium,
      activeMedia.paths?.derivatives?.webp_small,
      activeMedia.paths?.original
    ];
    const target = candidates.find(
      (item) => item?.storagePath || item?.downloadURL
    );
    return {
      storagePath: target?.storagePath ?? null,
      downloadURL: target?.downloadURL ?? null
    };
  }, [activeMedia]);

  const lightboxVideoAsset = useMemo(() => {
    if (!activeMedia || activeMedia.type !== 'video') return null;
    const candidates = [
      activeMedia.paths?.derivatives?.webm_1080,
      activeMedia.paths?.derivatives?.webm_720,
      activeMedia.paths?.derivatives?.webm_360
    ];
    const target = candidates.find(
      (item) => item?.storagePath || item?.downloadURL
    );
    return {
      storagePath: target?.storagePath ?? null,
      downloadURL: target?.downloadURL ?? null
    };
  }, [activeMedia]);

  const lightboxPosterAsset = useMemo(() => {
    if (!activeMedia || activeMedia.type !== 'video') return null;
    return {
      storagePath: activeMedia.paths?.poster?.storagePath ?? null,
      downloadURL: activeMedia.paths?.poster?.downloadURL ?? null
    };
  }, [activeMedia]);

  const {
    src: lightboxImageSrc,
    hasSource: hasImageSource,
    handleError: handleImageError
  } = useStorageAssetSrc(lightboxImageAsset, { preferDirect: true });
  const {
    src: lightboxVideoSrc,
    hasSource: hasVideoSource,
    handleError: handleVideoError
  } = useStorageAssetSrc(lightboxVideoAsset, { preferDirect: true });
  const { src: lightboxPosterSrc } = useStorageAssetSrc(lightboxPosterAsset, {
    preferDirect: true
  });

  useEffect(() => {
    if (activeIndex === null) return;
    if (items.length === 0) {
      setActiveIndex(null);
      return;
    }
    if (activeIndex > items.length - 1) {
      setActiveIndex(items.length - 1);
    }
  }, [activeIndex, items.length]);

  useEffect(() => {
    setIsLightboxLoaded(false);
  }, [activeMedia?.id, lightboxImageSrc, lightboxVideoSrc]);

  useEffect(() => {
    if (isDialogTitleEditing) return;
    const nextTitle = activeMedia?.title ?? '';
    setDialogTitleDraft(nextTitle);
  }, [activeMedia?.id, activeMedia?.title, isDialogTitleEditing]);

  useEffect(() => {
    if (!selectedId || !onSelectionChange) return;
    const exists = items.some((item) => item.id === selectedId);
    if (!exists) {
      onSelectionChange(null);
    }
  }, [items, onSelectionChange, selectedId]);

  useEffect(() => {
    const mediaQuery = query(
      collection(db, 'media'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      mediaQuery,
      (snapshot) => {
        const next = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Omit<MediaDoc, 'id'>;
            return { id: doc.id, ...data };
          })
          .filter((item) => !item.deletedAt);
        setItems(next);
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const handleUpload = async (files: File[]) => {
    await uploadMediaFiles(
      files,
      { context: 'gallery', role: 'gallery' },
      (fileName, progress) => {
        setProgresses((prev) => ({ ...prev, [fileName]: progress }));
      }
    );
  };

  const saveDialogTitle = async () => {
    if (!activeMedia || dialogTitleSavingRef.current) return;
    const nextTitle = (dialogTitleDraft ?? '').trim();
    const currentTitle = (activeMedia.title ?? '').trim();

    if (nextTitle === currentTitle) {
      setIsDialogTitleEditing(false);
      setDialogTitleDraft(activeMedia.title ?? '');
      return;
    }

    dialogTitleSavingRef.current = true;
    setIsDialogTitleSaving(true);
    try {
      await updateDoc(doc(db, 'media', activeMedia.id), { title: nextTitle });
      setDialogTitleDraft(nextTitle);
      setIsDialogTitleEditing(false);
    } catch (error) {
      console.error('[Media] update title error (dialog)', error);
      toast.error('No se pudo actualizar el título.');
      setIsDialogTitleEditing(true);
    } finally {
      dialogTitleSavingRef.current = false;
      setIsDialogTitleSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      {loading ? (
        <MediaGallerySkeleton />
      ) : (
        <div className='grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5'>
          <UploadCard onUpload={handleUpload} progresses={progresses} />
          {items.map((media, index) => (
            <MediaCard
              key={media.id}
              media={media}
              dataMediaId={media.id}
              isSelected={selectedId === media.id}
              onPreviewClick={() => setActiveIndex(index)}
              onSelect={() => {
                if (!onSelectionChange) return;
                if (selectedId === media.id) {
                  onSelectionChange(null);
                } else {
                  onSelectionChange(media);
                }
              }}
            />
          ))}
        </div>
      )}
      {!loading && items.length === 0 ? (
        <div className='text-muted-foreground text-sm'>
          Todavía no hay archivos en la galería.
        </div>
      ) : null}
      <Dialog
        open={Boolean(activeMedia)}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null);
        }}
      >
        <DialogContent className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 h-[min(84vh,800px)] max-w-[min(96vw,1200px)] overflow-visible p-0 duration-400 ease-out sm:h-[min(92vh,860px)] sm:max-w-5xl'>
          {activeMedia ? (
            <div className='relative flex h-full flex-col'>
              <DialogTitle className='sr-only'>
                {activeMedia.title
                  ? `Preview: ${activeMedia.title}`
                  : 'Preview media'}
              </DialogTitle>
              <button
                type='button'
                className={cn(
                  'bg-background/90 text-foreground absolute top-1/2 left-2 z-20 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border shadow-sm transition sm:left-[-6rem]',
                  canGoPrev
                    ? 'hover:bg-background'
                    : 'pointer-events-none opacity-40'
                )}
                onClick={goPrev}
                disabled={!canGoPrev}
                aria-label='Anterior'
              >
                <IconChevronLeft className='h-5 w-5' />
              </button>
              <button
                type='button'
                className={cn(
                  'bg-background/90 text-foreground absolute top-1/2 right-2 z-20 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border shadow-sm transition sm:right-[-6rem]',
                  canGoNext
                    ? 'hover:bg-background'
                    : 'pointer-events-none opacity-40'
                )}
                onClick={goNext}
                disabled={!canGoNext}
                aria-label='Siguiente'
              >
                <IconChevronRight className='h-5 w-5' />
              </button>
              <div className='border-border/60 flex items-center justify-between border-b px-5 py-3'>
                <div className='space-y-0.5'>
                  {isDialogTitleEditing ? (
                    <Input
                      autoFocus
                      value={dialogTitleDraft}
                      disabled={isDialogTitleSaving}
                      aria-label='Editar título'
                      className='h-8 w-full max-w-md text-sm font-semibold'
                      onChange={(event) =>
                        setDialogTitleDraft(event.target.value)
                      }
                      onBlur={() => {
                        void saveDialogTitle();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void saveDialogTitle();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setIsDialogTitleEditing(false);
                          setDialogTitleDraft(activeMedia.title ?? '');
                        }
                      }}
                    />
                  ) : (
                    <button
                      type='button'
                      aria-label='Editar título'
                      className='text-foreground cursor-text text-left text-sm font-semibold hover:opacity-85'
                      onClick={() => {
                        if (!isDialogTitleSaving) {
                          setIsDialogTitleEditing(true);
                        }
                      }}
                    >
                      {dialogTitleDraft || 'Sin título'}
                    </button>
                  )}
                  <div className='text-muted-foreground text-xs'>
                    {activeMedia.originalFilename
                      ? 'Archivo Original: ' +
                        activeMedia.originalFilename?.trim()
                      : ''}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    Id: {activeMedia.id}
                  </div>
                </div>
              </div>
              <div className='flex-1 contain-size'>
                <div className='bg-muted/40 relative flex h-full items-center justify-center overflow-hidden rounded-lg'>
                  {activeMedia.type === 'video' ? (
                    hasVideoSource ? (
                      <video
                        playsInline
                        autoPlay
                        className='h-full max-h-full w-full max-w-full cursor-pointer object-contain'
                        controls
                        poster={lightboxPosterSrc || undefined}
                        src={lightboxVideoSrc}
                        onLoadedData={() => setIsLightboxLoaded(true)}
                        onError={() => {
                          setIsLightboxLoaded(false);
                          handleVideoError();
                        }}
                      />
                    ) : (
                      <div className='text-muted-foreground text-sm'>
                        No hay vista previa disponible.
                      </div>
                    )
                  ) : hasImageSource ? (
                    <img
                      src={lightboxImageSrc}
                      alt={activeMedia.title || activeMedia.id}
                      className='max-h-full max-w-full object-contain'
                      loading='lazy'
                      onLoad={() => setIsLightboxLoaded(true)}
                      onError={() => {
                        setIsLightboxLoaded(false);
                        handleImageError();
                      }}
                    />
                  ) : (
                    <div className='text-muted-foreground text-sm'>
                      No hay vista previa disponible.
                    </div>
                  )}
                  {(activeMedia.type === 'video' && hasVideoSource) ||
                  (activeMedia.type === 'image' && hasImageSource) ? (
                    <div
                      className={cn(
                        'bg-background/60 pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300',
                        isLightboxLoaded ? 'opacity-0' : 'opacity-100'
                      )}
                    >
                      <img
                        src='/assets/system/loaders/loader.webp'
                        alt='Cargando...'
                        className={cn(
                          'w-[1.8rem]transition-opacity h-[1.8rem] duration-300',
                          isLightboxLoaded ? 'opacity-0' : 'opacity-60'
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
