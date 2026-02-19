'use client';

import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import * as React from 'react';
import Dropzone, {
  type DropzoneProps,
  type FileRejection
} from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useControllableState } from '@/hooks/use-controllable-state';
import { cn, formatBytes } from '@/lib/utils';

export interface FileUploaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Value of the uploader.
   * @type File[]
   * @default undefined
   * @example value={files}
   */
  value?: File[];

  /**
   * Function to be called when the value changes.
   * @type React.Dispatch<React.SetStateAction<File[]>>
   * @default undefined
   * @example onValueChange={(files) => setFiles(files)}
   */
  onValueChange?: React.Dispatch<React.SetStateAction<File[]>>;

  /**
   * Function to be called when files are uploaded.
   * @type (files: File[]) => Promise<void>
   * @default undefined
   * @example onUpload={(files) => uploadFiles(files)}
   */
  onUpload?: (files: File[]) => Promise<void>;

  /**
   * Progress of the uploaded files.
   * @type Record<string, number> | undefined
   * @default undefined
   * @example progresses={{ "file1.png": 50 }}
   */
  progresses?: Record<string, number>;

  /**
   * Accepted file types for the uploader.
   * @type { [key: string]: string[]}
   * @default
   * ```ts
   * { "image/*": [] }
   * ```
   * @example accept={["image/png", "image/jpeg"]}
   */
  accept?: DropzoneProps['accept'];

  /**
   * Maximum file size for the uploader.
   * @type number | undefined
   * @default 1024 * 1024 * 2 // 2MB
   * @example maxSize={1024 * 1024 * 2} // 2MB
   */
  maxSize?: DropzoneProps['maxSize'];

  /**
   * Maximum number of files for the uploader.
   * @type number | undefined
   * @default 1
   * @example maxFiles={5}
   */
  maxFiles?: DropzoneProps['maxFiles'];

  /**
   * Whether the uploader should accept multiple files.
   * @type boolean
   * @default false
   * @example multiple
   */
  multiple?: boolean;

  /**
   * Whether the uploader is disabled.
   * @type boolean
   * @default false
   * @example disabled
   */
  disabled?: boolean;

  /**
   * Additional class names for the uploader container.
   */
  containerClassName?: string;

  /**
   * Use compact copy sizes for tight layouts.
   */
  compact?: boolean;

  /**
   * Optional action to open a gallery picker instead of uploading.
   */
  onPickFromGallery?: () => void;

  /**
   * Override dropdown menu labels.
   */
  pickerMenuLabels?: {
    computer?: string;
    gallery?: string;
  };
}

export function FileUploader(props: FileUploaderProps) {
  const {
    value: valueProp,
    onValueChange,
    onUpload,
    progresses,
    accept = { 'image/*': [] },
    maxSize = 1024 * 1024 * 2,
    maxFiles = 1,
    multiple = false,
    disabled = false,
    className,
    containerClassName,
    compact = false,
    onPickFromGallery,
    pickerMenuLabels,
    ...dropzoneProps
  } = props;

  const [files, setFiles] = useControllableState({
    prop: valueProp,
    onChange: onValueChange
  });
  const uploadToastIdRef = React.useRef<string | number | null>(null);
  const processingToastShownRef = React.useRef(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile(640);

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (!multiple && maxFiles === 1 && acceptedFiles.length > 1) {
        toast.error('No podés subir más de 1 archivo a la vez.');
        return;
      }

      if ((files?.length ?? 0) + acceptedFiles.length > maxFiles) {
        toast.error(`No podés subir más de ${maxFiles} archivos.`);
        return;
      }

      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file)
        })
      );

      const updatedFiles = files ? [...files, ...newFiles] : newFiles;

      setFiles(updatedFiles);

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file }) => {
          toast.error(`El archivo ${file.name} fue rechazado.`);
        });
      }

      if (
        onUpload &&
        updatedFiles.length > 0 &&
        updatedFiles.length <= maxFiles
      ) {
        const target =
          updatedFiles.length === 1
            ? '1 archivo'
            : `${updatedFiles.length} archivos`;

        if (uploadToastIdRef.current) {
          toast.dismiss(uploadToastIdRef.current);
        }
        processingToastShownRef.current = false;
        uploadToastIdRef.current = toast.loading(`Subiendo ${target}...`);

        onUpload(updatedFiles)
          .then(() => {
            setFiles([]);
            if (uploadToastIdRef.current) {
              toast.success('Procesando tu archivo... Por favor esperá.', {
                id: uploadToastIdRef.current
              });
            }
          })
          .catch(() => {
            if (uploadToastIdRef.current) {
              toast.error(`Falló la subida de ${target}.`, {
                id: uploadToastIdRef.current
              });
            }
          })
          .finally(() => {
            uploadToastIdRef.current = null;
            processingToastShownRef.current = false;
          });
      }
    },

    [files, maxFiles, multiple, onUpload, setFiles]
  );

  function onRemove(index: number) {
    if (!files) return;
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onValueChange?.(newFiles);
  }

  // Revoke preview url when component unmounts
  React.useEffect(() => {
    if (!uploadToastIdRef.current || !files?.length || !progresses) return;
    const allComplete = files.every((file) => {
      const progress = progresses[file.name];
      return typeof progress === 'number' && progress >= 100;
    });
    if (allComplete && !processingToastShownRef.current) {
      toast.loading('Procesando tu archivo... Por favor esperá.', {
        id: uploadToastIdRef.current
      });
      processingToastShownRef.current = true;
    }
  }, [files, progresses]);

  React.useEffect(() => {
    return () => {
      if (!files) return;
      files.forEach((file) => {
        if (isFileWithPreview(file)) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDisabled = disabled || (files?.length ?? 0) >= maxFiles;
  const showPickerMenu = Boolean(onPickFromGallery);
  const uploadLabel = pickerMenuLabels?.computer ?? 'Subir archivos';
  const galleryLabel = pickerMenuLabels?.gallery ?? 'Agregar desde galería';
  const isUploading = Boolean(
    files?.length &&
      files.some((file) => {
        const progress = progresses?.[file.name];
        return typeof progress !== 'number' || progress < 100;
      })
  );

  React.useEffect(() => {
    if (!menuVisible) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuVisible]);

  React.useEffect(() => {
    if (menuOpen) {
      setMenuVisible(true);
      return;
    }
    if (!menuVisible) return;
    const timeout = window.setTimeout(() => {
      setMenuVisible(false);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [menuOpen, menuVisible]);

  return (
    <div
      className={cn(
        'relative flex flex-col gap-6 overflow-hidden',
        containerClassName
      )}
    >
      <Dropzone
        onDrop={onDrop}
        accept={accept}
        maxSize={maxSize}
        maxFiles={maxFiles}
        multiple={maxFiles > 1 || multiple}
        disabled={isDisabled}
        noClick={showPickerMenu}
      >
        {({ getRootProps, getInputProps, isDragActive, open }) => {
          const handleMenuClick = (
            event: React.PointerEvent<HTMLDivElement>
          ) => {
            if (!showPickerMenu) return;
            event.preventDefault();
            event.stopPropagation();
            setMenuPosition({ x: event.clientX, y: event.clientY });
            setMenuOpen((prev) => !prev);
          };
          const dropzone = (
            <div
              {...getRootProps(
                showPickerMenu
                  ? {
                      onPointerDown: handleMenuClick
                    }
                  : undefined
              )}
              className={cn(
                'group border-muted-foreground/25 hover:bg-muted/40 relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed px-5 py-2.5 text-center transition',
                'ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
                isDragActive && 'border-muted-foreground/50',
                isDisabled && 'pointer-events-none opacity-60',
                className
              )}
              {...dropzoneProps}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <div className='flex flex-col items-center justify-center gap-4 sm:px-5'>
                  <div className='rounded-full border border-dashed p-3'>
                    <IconUpload
                      className='text-muted-foreground size-7'
                      aria-hidden='true'
                    />
                  </div>
                  <p
                    className={cn(
                      'text-muted-foreground font-medium',
                      compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                    )}
                  >
                    Soltá los archivos acá
                  </p>
                </div>
              ) : (
                <div className='flex max-h-[10rem] flex-col items-center justify-center gap-3 sm:px-5'>
                  <div className='rounded-full border border-dashed p-3'>
                    <IconUpload
                      className='text-muted-foreground size-7'
                      aria-hidden='true'
                    />
                  </div>
                  <div className='space-y-px'>
                    <p
                      className={cn(
                        'text-muted-foreground font-medium',
                        compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                      )}
                    >
                      {showPickerMenu
                        ? 'Arrastrá y soltá archivos acá, o hacé clic para elegir una opción'
                        : isMobile
                          ? 'Tocá para elegir archivos'
                          : 'Arrastrá y soltá archivos acá, o hacé clic para elegirlos'}
                    </p>
                    {!isUploading ? (
                      <p
                        className={cn(
                          'text-muted-foreground/70',
                          compact ? 'text-[11px] sm:text-xs' : 'text-sm'
                        )}
                      >
                        Podés subir
                        {maxFiles > 1
                          ? ` ${maxFiles === Infinity ? 'varios' : maxFiles}
                      archivos (hasta ${formatBytes(maxSize)} cada uno)`
                          : ` un archivo de hasta ${formatBytes(maxSize)}`}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );

          if (!showPickerMenu) return dropzone;

          return (
            <>
              {dropzone}
              {menuVisible ? (
                <div
                  ref={menuRef}
                  className={cn(
                    'bg-popover text-popover-foreground fixed z-50 w-64 rounded-md border p-1 shadow-md transition-opacity duration-200',
                    menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                  )}
                  style={{
                    top: menuPosition.y,
                    left: menuPosition.x,
                    transform: 'translate(-100%, 0)'
                  }}
                >
                  <button
                    type='button'
                    className='hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-sm'
                    onClick={() => {
                      open();
                      setMenuOpen(false);
                    }}
                  >
                    <span>{uploadLabel}</span>
                    <IconUpload className='text-muted-foreground h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    className='hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-sm'
                    onClick={() => {
                      onPickFromGallery?.();
                      setMenuOpen(false);
                    }}
                  >
                    <span>{galleryLabel}</span>
                    <IconPhoto className='text-muted-foreground h-4 w-4' />
                  </button>
                </div>
              ) : null}
            </>
          );
        }}
      </Dropzone>
      {files?.length ? (
        <ScrollArea className='h-fit w-full px-3'>
          <div className='max-h-48 space-y-4'>
            {files?.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                onRemove={() => onRemove(index)}
                progress={progresses?.[file.name]}
              />
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
}

interface FileCardProps {
  file: File;
  onRemove: () => void;
  progress?: number;
}

function FileCard({ file, progress, onRemove }: FileCardProps) {
  return (
    <div className='relative flex items-center space-x-4'>
      <div className='flex flex-1 space-x-4'>
        {isFileWithPreview(file) ? (
          file.type.startsWith('video/') ? (
            <video
              src={file.preview}
              className='h-12 w-12 shrink-0 rounded-md object-cover'
              width={48}
              height={48}
              muted
              playsInline
              preload='metadata'
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = 0.1;
              }}
            />
          ) : (
            <Image
              src={file.preview}
              alt={file.name}
              width={48}
              height={48}
              loading='lazy'
              className='aspect-square shrink-0 rounded-md object-cover'
            />
          )
        ) : null}
        <div className='flex w-full flex-col gap-2'>
          <div className='space-y-px'>
            <p className='text-foreground/80 line-clamp-1 text-sm font-medium'>
              {file.name}
            </p>
            <p className='text-muted-foreground text-xs'>
              {formatBytes(file.size)}
            </p>
          </div>
          {typeof progress === 'number' && progress < 100 ? (
            <Progress value={progress} />
          ) : null}
          {typeof progress === 'number' && progress >= 100 ? (
            <p className='text-muted-foreground text-left text-xs'>
              Completado.
            </p>
          ) : null}
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onRemove}
          disabled={progress !== undefined && progress < 100}
          className='size-8 rounded-full'
        >
          <IconX className='text-muted-foreground' />
          <span className='sr-only'>Eliminar archivo</span>
        </Button>
      </div>
    </div>
  );
}

function isFileWithPreview(file: File): file is File & { preview: string } {
  return 'preview' in file && typeof file.preview === 'string';
}
