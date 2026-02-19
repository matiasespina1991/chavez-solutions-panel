'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

import { FormInput } from '@/components/forms/form-input';
import { FormQuill } from '@/components/forms/form-quill';
import { FileUploader } from '@/components/file-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { db } from '@/lib/firebase';
import MediaPickerDialog, {
  type MediaDoc
} from '@/components/media-picker-dialog';
import { useStorageAssetSrc } from '@/hooks/use-storage-asset-src';
import { IconTrash } from '@tabler/icons-react';
import { uploadMediaFiles, waitForMediaByUploadId } from '@/lib/media-upload';

const ABOUT_DOC_ID = 'default';
const MAX_UPLOAD_SIZE = 250 * 1024 * 1024;
const IMAGE_PROCESSING_TIMEOUT_MS = 4 * 60 * 1000;

function getPreviewPath(media: MediaDoc) {
  if (media.type === 'video') {
    return media.paths?.poster?.storagePath ?? null;
  }

  return (
    media.paths?.derivatives?.webp_thumb?.storagePath ??
    media.paths?.derivatives?.webp_small?.storagePath ??
    media.paths?.original?.storagePath ??
    null
  );
}

type AboutMeFormValues = {
  title: string;
  content: string;
  imageId: string | null;
  educationTitle: string;
  educationContent: string;
};

type AboutMeDoc = {
  title?: string;
  content?: string;
  imageId?: string | null;
  subcontent?: { education?: { title?: string; content?: string } };
};

function MediaPreviewCard({
  media,
  onRemove,
  actions
}: {
  media: MediaDoc;
  onRemove?: () => void;
  actions?: ReactNode;
}) {
  const previewPath = getPreviewPath(media);
  const { src, hasSource, handleError } = useStorageAssetSrc(
    previewPath ? { storagePath: previewPath } : null,
    { preferDirect: false }
  );

  return (
    <div className='border-border/60 bg-card flex max-w-[25rem] min-w-0 items-center gap-3 rounded-lg border px-3 py-2 shadow-xs'>
      <div className='bg-muted flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md'>
        {hasSource ? (
          <img
            src={src}
            alt={media.id}
            className='h-full w-full object-cover'
            loading='lazy'
            onError={handleError}
          />
        ) : (
          <span className='text-muted-foreground text-[11px]'>
            {media.processed ? 'Sin vista previa' : 'Procesando…'}
          </span>
        )}
      </div>
      <div className='grid flex-1'>
        <div className='text-sm font-medium'>
          {media.type === 'video' ? 'Video' : 'Imagen'}
        </div>
        <div className='text-muted-foreground truncate text-xs'>{media.id}</div>
      </div>
      {actions ? (
        actions
      ) : onRemove ? (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onRemove}
          className='cursor-pointer'
        >
          <IconTrash className='h-4 w-4' />
        </Button>
      ) : null}
    </div>
  );
}

export default function AboutForm() {
  const form = useForm<AboutMeFormValues>({
    defaultValues: {
      title: '',
      content: '',
      imageId: null,
      educationTitle: '',
      educationContent: ''
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [imageMedia, setImageMedia] = useState<MediaDoc | null>(null);
  const [imageProgress, setImageProgress] = useState<Record<string, number>>(
    {}
  );
  const lastSavedValuesRef = useRef<AboutMeFormValues | null>(null);
  const hasUnsavedChanges = Boolean(
    lastSavedValuesRef.current && form.formState.isDirty
  );

  const imageId = form.watch('imageId');

  const handleUndoChanges = () => {
    if (!lastSavedValuesRef.current) return;
    form.reset(lastSavedValuesRef.current);
  };

  const removeImage = () => {
    form.setValue('imageId', null, { shouldDirty: true });
    setImageMedia(null);
  };

  const handleImageUpload = async (files: File[]) => {
    const [file] = files;
    if (!file) return;
    try {
      const [result] = await uploadMediaFiles(
        [file],
        {
          context: 'gallery',
          role: 'gallery'
        },
        (fileName, progress) => {
          setImageProgress((prev) => ({ ...prev, [fileName]: progress }));
        }
      );
      const mediaDoc = await waitForMediaByUploadId(result.uploadId, {
        requireProcessed: true,
        timeoutMs: IMAGE_PROCESSING_TIMEOUT_MS
      });
      form.setValue('imageId', mediaDoc.id, { shouldDirty: true });
      setImageMedia(mediaDoc);
    } catch (error) {
      console.error('[About] image upload error', error);
      toast.error('No se pudo subir la imagen.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAbout = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'about_me', ABOUT_DOC_ID));
        const data = docSnap.exists()
          ? (docSnap.data() as AboutMeDoc | undefined)
          : undefined;
        const nextValues = {
          title: data?.title ?? '',
          content: data?.content ?? '',
          imageId: data?.imageId ?? null,
          educationTitle: data?.subcontent?.education?.title ?? '',
          educationContent: data?.subcontent?.education?.content ?? ''
        };
        if (isMounted) {
          form.reset(nextValues);
          lastSavedValuesRef.current = nextValues;

          // Load image media if exists
          if (data?.imageId) {
            const imageDocSnap = await getDoc(doc(db, 'media', data.imageId));
            if (imageDocSnap.exists()) {
              setImageMedia({
                id: imageDocSnap.id,
                ...imageDocSnap.data()
              } as MediaDoc);
            }
          }
        }
      } catch (error) {
        console.error('[About] load error', error);
        toast.error('No se pudo cargar About Me.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAbout();

    return () => {
      isMounted = false;
    };
  }, [form]);

  const onSubmit = async (values: AboutMeFormValues) => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'about_me', ABOUT_DOC_ID),
        {
          title: values.title,
          content: values.content,
          imageId: values.imageId,
          subcontent: {
            education: {
              title: values.educationTitle,
              content: values.educationContent
            }
          }
        },
        { merge: true }
      );
      form.reset(values);
      lastSavedValuesRef.current = values;
      toast.success('About Me actualizado.');
    } catch (error) {
      console.error('[About] update error', error);
      toast.error('No se pudo guardar About Me.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className='mx-auto w-full'>
      <CardHeader>
        <CardTitle className='text-left text-2xl font-bold'>About Me</CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          form={form}
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-8'
        >
          {loading ? (
            <div className='space-y-2'>
              <div className='bg-muted h-4 w-36 animate-pulse rounded-md' />
              <div className='grid gap-6 lg:grid-cols-[3fr_1fr]'>
                <div className='space-y-4'>
                  <div className='bg-muted h-8 w-full animate-pulse rounded-md' />
                  <div className='bg-muted h-76 w-full animate-pulse rounded-md' />
                </div>
                <div className='space-y-4'>
                  <div className='bg-muted h-8 w-40 animate-pulse rounded-md' />
                  <div className='bg-muted h-48 w-full animate-pulse rounded-md' />
                </div>
              </div>
            </div>
          ) : null}
          {!loading ? (
            <>
              <div className='flex flex-col gap-8 lg:flex-row lg:items-start'>
                <div className='flex flex-1 flex-col gap-6 lg:flex-[3]'>
                  <FormInput
                    control={form.control}
                    name='title'
                    label='Título'
                    placeholder='Ingresá el título'
                    required
                  />

                  <FormQuill
                    control={form.control}
                    name='content'
                    label='Contenido'
                    placeholder='Escribí el texto principal...'
                  />
                </div>

                <div className='flex flex-1 flex-col gap-6 lg:flex-[1]'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <div className='text-sm font-semibold'>Imagen</div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 px-3 text-xs'
                        onClick={() => setIsImagePickerOpen(true)}
                      >
                        Agregar desde galería
                      </Button>
                    </div>
                    {imageMedia ? (
                      <MediaPreviewCard
                        media={imageMedia}
                        onRemove={removeImage}
                      />
                    ) : null}
                    <FileUploader
                      onUpload={handleImageUpload}
                      progresses={imageProgress}
                      accept={{ 'image/*': [] }}
                      maxFiles={1}
                      maxSize={MAX_UPLOAD_SIZE}
                      onPickFromGallery={() => setIsImagePickerOpen(true)}
                    />
                  </div>
                </div>
              </div>

              {hasUnsavedChanges ? (
                <div className='mb-1 flex items-center text-sm'>
                  <span className='text-red-500'>Hay cambios sin guardar.</span>
                  <Button
                    type='button'
                    variant='link'
                    className='text-foreground ml-1 h-auto p-0 text-sm underline underline-offset-2'
                    onClick={handleUndoChanges}
                  >
                    Deshacer
                  </Button>
                  <span>.</span>
                </div>
              ) : null}

              <Button type='submit' disabled={saving || loading}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          ) : null}
        </Form>

        <MediaPickerDialog
          open={isImagePickerOpen}
          onOpenChange={setIsImagePickerOpen}
          title='Seleccionar imagen'
          description='Seleccioná una imagen para About Me.'
          selectionMode='single'
          allowedTypes={['image']}
          onConfirm={(items) => {
            const media = items[0];
            if (media) {
              form.setValue('imageId', media.id, { shouldDirty: true });
              setImageMedia(media);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function ImagePreviewCard({
  media,
  onRemove
}: {
  media: MediaDoc;
  onRemove: () => void;
}) {
  const previewPath =
    media.type === 'image'
      ? (media.paths?.derivatives?.['low']?.storagePath ??
        media.paths?.original?.storagePath)
      : null;

  const { src, handleError } = useStorageAssetSrc(
    previewPath ? { storagePath: previewPath } : null,
    { preferDirect: false }
  );

  return (
    <div className='border-border/60 bg-card flex items-center gap-3 rounded-lg border p-3 shadow-xs'>
      <div className='bg-muted flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded'>
        {src ? (
          <img
            src={src}
            alt={media.title || 'Image'}
            onError={handleError}
            className='h-full w-full object-cover'
          />
        ) : (
          <div className='bg-muted h-full w-full animate-pulse' />
        )}
      </div>
      <div className='flex-1'>
        <div className='text-sm font-medium'>{media.title || 'Sin título'}</div>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={onRemove}
        className='text-muted-foreground hover:text-destructive flex-shrink-0'
      >
        <IconTrash className='h-4 w-4' />
      </Button>
    </div>
  );
}
