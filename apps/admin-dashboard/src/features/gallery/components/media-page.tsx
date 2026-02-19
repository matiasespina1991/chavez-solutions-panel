'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  IconChevronDown,
  IconDownload,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
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
import { db } from '@/lib/firebase';
import MediaGallery from '@/features/gallery/components/media-gallery';
import type { MediaDoc } from '@/lib/media-upload';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';

type AssetFile = {
  storagePath?: string | null;
  downloadURL?: string | null;
  sizeBytes?: number;
};

type VideoVariantKey = 'webm_1080' | 'webm_720' | 'webm_360';

function formatSizeMb(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return '';
  const sizeInMb = sizeBytes / (1024 * 1024);
  const value =
    sizeInMb >= 100
      ? Math.round(sizeInMb).toString()
      : sizeInMb.toFixed(1).replace(/\.0$/, '');
  return `${value} mb`;
}

function buildVariantDownloadName(
  media: MediaDoc | null,
  variantKey: VideoVariantKey
) {
  if (!media) return `${variantKey}.webm`;
  const baseNameRaw = (
    media.originalFilename ||
    media.title ||
    media.id
  ).trim();
  const baseName = (baseNameRaw || media.id).replace(/\.[^.]+$/, '');
  const variantLabel = variantKey.replace('_', '-');
  return `${baseName}-${variantLabel}.webm`;
}

function SelectedMediaChip({
  onClear,
  className = '',
  onClick
}: {
  onClear: () => void;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`text-foreground inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium opacity-100 ${className}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className='text-foreground inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[#80808012] transition-colors hover:bg-[#80808024]'
            aria-label='Deseleccionar archivo'
          >
            <IconX className='h-3 w-3' />
          </button>
        </TooltipTrigger>
        <TooltipContent>Quitar seleccion</TooltipContent>
      </Tooltip>
      <span className='whitespace-nowrap'>1 medio seleccionado</span>
    </div>
  );
}

export default function MediaPage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  const isVideoSelection = selectedMedia?.type === 'video';
  const imageDownloadAsset = useMemo<AssetFile | null>(() => {
    if (!selectedMedia || selectedMedia.type !== 'image') return null;
    const imageCandidates = [
      selectedMedia.paths?.derivatives?.webp_large,
      selectedMedia.paths?.derivatives?.webp_medium,
      selectedMedia.paths?.derivatives?.webp_small,
      selectedMedia.paths?.original
    ];
    return (
      imageCandidates.find(
        (asset) => asset?.downloadURL || asset?.storagePath
      ) ?? null
    );
  }, [selectedMedia]);
  const videoAsset1080 = useMemo<AssetFile | null>(
    () =>
      selectedMedia?.type === 'video'
        ? (selectedMedia.paths?.derivatives?.webm_1080 ?? null)
        : null,
    [selectedMedia]
  );
  const videoAsset720 = useMemo<AssetFile | null>(
    () =>
      selectedMedia?.type === 'video'
        ? (selectedMedia.paths?.derivatives?.webm_720 ?? null)
        : null,
    [selectedMedia]
  );
  const videoAsset360 = useMemo<AssetFile | null>(
    () =>
      selectedMedia?.type === 'video'
        ? (selectedMedia.paths?.derivatives?.webm_360 ?? null)
        : null,
    [selectedMedia]
  );
  const {
    src: imageDownloadSrc,
    usingSignedUrl: isImageSignedUrl,
    hasSource: hasImageSource,
    forceSigned: resolveImageSignedUrl
  } = useStorageAssetSrc(imageDownloadAsset, { preferDirect: true });
  const {
    src: video1080Src,
    usingSignedUrl: is1080SignedUrl,
    hasSource: has1080Source,
    forceSigned: resolve1080SignedUrl
  } = useStorageAssetSrc(videoAsset1080, { preferDirect: true });
  const {
    src: video720Src,
    usingSignedUrl: is720SignedUrl,
    hasSource: has720Source,
    forceSigned: resolve720SignedUrl
  } = useStorageAssetSrc(videoAsset720, { preferDirect: true });
  const {
    src: video360Src,
    usingSignedUrl: is360SignedUrl,
    hasSource: has360Source,
    forceSigned: resolve360SignedUrl
  } = useStorageAssetSrc(videoAsset360, { preferDirect: true });

  const imageHasSecureSource =
    Boolean(imageDownloadAsset?.downloadURL) || isImageSignedUrl;
  const canDownloadImage = hasImageSource && imageHasSecureSource;
  const canDownload1080 =
    has1080Source && (Boolean(videoAsset1080?.downloadURL) || is1080SignedUrl);
  const canDownload720 =
    has720Source && (Boolean(videoAsset720?.downloadURL) || is720SignedUrl);
  const canDownload360 =
    has360Source && (Boolean(videoAsset360?.downloadURL) || is360SignedUrl);
  const canDownloadVideo = canDownload1080 || canDownload720 || canDownload360;
  const canDownload = isVideoSelection ? canDownloadVideo : canDownloadImage;

  const imageDownloadName = useMemo(() => {
    if (!selectedMedia) return 'media';
    if (selectedMedia.originalFilename?.trim()) {
      return selectedMedia.originalFilename.trim();
    }
    const rawPath = imageDownloadAsset?.storagePath ?? '';
    const lastSegment = rawPath ? (rawPath.split('/').pop() ?? '') : '';
    if (lastSegment) return lastSegment;
    return (selectedMedia.title ?? selectedMedia.id).trim() || selectedMedia.id;
  }, [imageDownloadAsset?.storagePath, selectedMedia]);

  useEffect(() => {
    if (!selectedMedia) {
      setConfirmOpen(false);
      setShowFloatingActions(false);
    }
  }, [selectedMedia]);

  useEffect(() => {
    if (!selectedMedia) return;
    const actionBarElement = actionBarRef.current;
    if (!actionBarElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingActions(!entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(actionBarElement);
    return () => observer.disconnect();
  }, [selectedMedia]);

  useEffect(() => {
    if (!imageDownloadAsset?.storagePath || imageDownloadAsset.downloadURL)
      return;
    void resolveImageSignedUrl();
  }, [
    imageDownloadAsset?.downloadURL,
    imageDownloadAsset?.storagePath,
    resolveImageSignedUrl
  ]);

  useEffect(() => {
    if (!videoAsset1080?.storagePath || videoAsset1080.downloadURL) return;
    void resolve1080SignedUrl();
  }, [
    resolve1080SignedUrl,
    videoAsset1080?.downloadURL,
    videoAsset1080?.storagePath
  ]);

  useEffect(() => {
    if (!videoAsset720?.storagePath || videoAsset720.downloadURL) return;
    void resolve720SignedUrl();
  }, [
    resolve720SignedUrl,
    videoAsset720?.downloadURL,
    videoAsset720?.storagePath
  ]);

  useEffect(() => {
    if (!videoAsset360?.storagePath || videoAsset360.downloadURL) return;
    void resolve360SignedUrl();
  }, [
    resolve360SignedUrl,
    videoAsset360?.downloadURL,
    videoAsset360?.storagePath
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedMedia) return;
    setIsDeleting(true);
    try {
      await updateDoc(doc(db, 'media', selectedMedia.id), {
        deletedAt: serverTimestamp()
      });
      toast.success('Medio eliminado.');
      setSelectedMedia(null);
      setConfirmOpen(false);
    } catch (error) {
      console.error('[Media] delete error', error);
      toast.error('No se pudo eliminar el medio.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedMedia]);

  const handleClearSelection = useCallback(() => {
    setSelectedMedia(null);
  }, []);

  const handleScrollToSelected = useCallback(() => {
    if (!selectedMedia?.id) return;
    const target = document.querySelector(
      `[data-media-id="${selectedMedia.id}"]`
    );
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedMedia?.id]);

  const triggerDownload = useCallback(async (url: string, fileName: string) => {
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('[Media] download error', error);
      toast.error('No se pudo iniciar la descarga.');
    }
  }, []);

  const handleImageDownload = useCallback(() => {
    if (!canDownloadImage || !imageDownloadSrc) return;
    void triggerDownload(imageDownloadSrc, imageDownloadName);
  }, [canDownloadImage, imageDownloadName, imageDownloadSrc, triggerDownload]);

  const videoDownloadOptions = useMemo(
    () => [
      {
        key: 'webm_1080' as const,
        label: 'webm 1080',
        sizeLabel: formatSizeMb(videoAsset1080?.sizeBytes ?? null),
        canDownload: canDownload1080,
        src: video1080Src
      },
      {
        key: 'webm_720' as const,
        label: 'webm 720',
        sizeLabel: formatSizeMb(videoAsset720?.sizeBytes ?? null),
        canDownload: canDownload720,
        src: video720Src
      },
      {
        key: 'webm_360' as const,
        label: 'webm 360',
        sizeLabel: formatSizeMb(videoAsset360?.sizeBytes ?? null),
        canDownload: canDownload360,
        src: video360Src
      }
    ],
    [
      canDownload1080,
      canDownload360,
      canDownload720,
      videoAsset1080?.sizeBytes,
      video1080Src,
      videoAsset360?.sizeBytes,
      video360Src,
      videoAsset720?.sizeBytes,
      video720Src
    ]
  );

  const handleVideoVariantDownload = useCallback(
    (variant: { key: VideoVariantKey; src: string; canDownload: boolean }) => {
      if (!variant.canDownload) return;
      const fileName = buildVariantDownloadName(selectedMedia, variant.key);
      void triggerDownload(variant.src, fileName);
    },
    [selectedMedia, triggerDownload]
  );

  return (
    <>
      <PageContainer
        pageTitle='Galería'
        pageDescription='Gestiona imágenes y videos del sitio.'
        pageHeaderAction={
          selectedMedia ? (
            <div ref={actionBarRef} className='flex items-center gap-2'>
              <SelectedMediaChip
                onClear={handleClearSelection}
                onClick={handleScrollToSelected}
                className='border-0 bg-transparent px-0 shadow-none'
              />
              {isVideoSelection ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='outline'
                      disabled={!canDownload}
                      className='h-11'
                    >
                      <IconDownload className='h-4 w-4' />
                      Descargar
                      <IconChevronDown className='h-4 w-4 opacity-70' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='start' className='min-w-56'>
                    {videoDownloadOptions.map((variant) => (
                      <DropdownMenuItem
                        key={variant.key}
                        disabled={!variant.canDownload}
                        onClick={() => handleVideoVariantDownload(variant)}
                        className='flex cursor-pointer items-center justify-between gap-4'
                      >
                        <span>{variant.label}</span>
                        <span className='text-muted-foreground text-xs'>
                          {variant.sizeLabel}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant='outline'
                  disabled={!canDownload}
                  className='h-11'
                  onClick={handleImageDownload}
                >
                  <IconDownload className='h-4 w-4' />
                  Descargar
                </Button>
              )}
              <Button
                type='button'
                variant='destructive'
                disabled={isDeleting}
                onClick={() => setConfirmOpen(true)}
                className='h-11'
              >
                <IconTrash className='h-4 w-4' />
                Eliminar
              </Button>
            </div>
          ) : null
        }
      >
        <MediaGallery
          selectedId={selectedMedia?.id ?? null}
          onSelectionChange={setSelectedMedia}
        />
      </PageContainer>

      {selectedMedia ? (
        <div
          className={`pointer-events-none fixed right-6 bottom-6 z-50 flex flex-row gap-2 transition-all duration-300 ease-out will-change-transform ${
            showFloatingActions
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
          aria-hidden={!showFloatingActions}
        >
          <SelectedMediaChip
            onClear={handleClearSelection}
            onClick={handleScrollToSelected}
            className='border-border bg-background pointer-events-auto border shadow-lg'
          />
          {isVideoSelection ? (
            <DropdownMenu>
              <Tooltip>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      disabled={!canDownload}
                      size='icon'
                      className='!bg-background !text-foreground !border-border !hover:bg-background !dark:bg-background !dark:hover:bg-background pointer-events-auto h-11 w-11 rounded-full !opacity-100 shadow-lg'
                    >
                      <IconDownload className='h-5 w-5' />
                    </Button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <TooltipContent>Descargar</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align='end'
                side='top'
                sideOffset={8}
                className='min-w-56'
              >
                {videoDownloadOptions.map((variant) => (
                  <DropdownMenuItem
                    key={variant.key}
                    disabled={!variant.canDownload}
                    onClick={() => handleVideoVariantDownload(variant)}
                    className='flex cursor-pointer items-center justify-between gap-4'
                  >
                    <span>{variant.label}</span>
                    <span className='text-muted-foreground text-xs'>
                      {variant.sizeLabel}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  disabled={!canDownload}
                  size='icon'
                  className='!bg-background !text-foreground !border-border !hover:bg-background !dark:bg-background !dark:hover:bg-background pointer-events-auto h-11 w-11 rounded-full !opacity-100 shadow-lg'
                  onClick={handleImageDownload}
                >
                  <IconDownload className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='destructive'
                size='icon'
                disabled={isDeleting}
                onClick={() => setConfirmOpen(true)}
                className='!hover:bg-[#ca2a30] !dark:bg-[#ca2a30] !dark:hover:bg-[#ca2a30] pointer-events-auto h-11 w-11 rounded-full !bg-[#ca2a30] !text-white !opacity-100 shadow-lg'
                aria-label='Eliminar'
              >
                <IconTrash className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar medio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marca el medio como eliminado y lo saca de la galería.
              Podés volver a subirlo más adelante si lo necesitás.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-700 hover:bg-red-800 focus:ring-red-500 disabled:bg-red-600 disabled:hover:bg-red-600'
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
