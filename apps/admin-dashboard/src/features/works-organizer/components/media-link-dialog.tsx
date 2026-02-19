'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import type { Media } from '@/types/mediaset';

type MediaLink = NonNullable<Media['link']>;
type LinkProvider = MediaLink['provider'];
type LinkProviderOption = LinkProvider | 'none';

interface Props {
  open: boolean;
  mediaId: string;
  initialLink?: Media['link'];
  onOpenChange: (open: boolean) => void;
  onSaved?: (link: Media['link']) => void;
}

const WHITE = '#ffffff';
const BLACK = '#000000';

function sanitizeHexColor(value: string) {
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  return WHITE;
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function MediaLinkDialog({
  open,
  mediaId,
  initialLink,
  onOpenChange,
  onSaved
}: Props) {
  const [provider, setProvider] = useState<LinkProviderOption>('none');
  const [url, setUrl] = useState('');
  const [fontColor, setFontColor] = useState(WHITE);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initialLink?.provider || !initialLink?.url?.trim()) {
      setProvider('none');
      setUrl('');
      setFontColor(WHITE);
      return;
    }

    setProvider(initialLink.provider);
    setUrl(initialLink.url);
    setFontColor(sanitizeHexColor(initialLink.fontColor ?? WHITE));
  }, [initialLink, open]);

  useEffect(() => {
    if (!open) {
      setConfirmDeleteOpen(false);
    }
  }, [open]);

  const canSave = useMemo(() => {
    if (provider === 'none') return !saving;
    const trimmed = url.trim();
    return trimmed.length > 0 && isValidUrl(trimmed) && !saving;
  }, [provider, saving, url]);

  const handleSave = async () => {
    if (provider === 'none') {
      try {
        setSaving(true);
        await updateDoc(doc(db, 'media', mediaId), {
          link: null,
          modifiedAt: serverTimestamp()
        });
        toast.success('Link eliminado.');
        onSaved?.(null);
        onOpenChange(false);
      } catch (error) {
        console.error('[WorksOrganizer] remove media link error', error);
        toast.error('No se pudo actualizar el link.');
      } finally {
        setSaving(false);
      }
      return;
    }

    const nextUrl = url.trim();
    const nextColor = sanitizeHexColor(fontColor);

    if (!nextUrl) {
      toast.error('La URL es obligatoria.');
      return;
    }

    if (!isValidUrl(nextUrl)) {
      toast.error('Ingresá una URL valida (http/https).');
      return;
    }

    const nextLink: MediaLink = {
      provider,
      url: nextUrl,
      fontColor: nextColor
    };

    try {
      setSaving(true);
      await updateDoc(doc(db, 'media', mediaId), {
        link: {
          ...nextLink,
          updatedAt: serverTimestamp()
        },
        modifiedAt: serverTimestamp()
      });
      toast.success('Link guardado.');
      onSaved?.(nextLink);
      onOpenChange(false);
    } catch (error) {
      console.error('[WorksOrganizer] save media link error', error);
      toast.error('No se pudo guardar el link.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'media', mediaId), {
        link: null,
        modifiedAt: serverTimestamp()
      });
      toast.success('Link eliminado.');
      onSaved?.(null);
      setProvider('none');
      setUrl('');
      setFontColor(WHITE);
      setConfirmDeleteOpen(false);
    } catch (error) {
      console.error('[WorksOrganizer] delete media link error', error);
      toast.error('No se pudo eliminar el link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[530px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span className='bg-muted inline-flex h-7 w-7 items-center justify-center rounded-full'>
              <Link2 className='h-4 w-4' />
            </span>
            Editar Link de Media
          </DialogTitle>
          <DialogDescription>
            Configura el proveedor para este media o selecciona Ninguno para
            ocultar el enlace.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-5 py-1'>
          <div className='grid gap-2'>
            <Label htmlFor='provider'>Proveedor</Label>
            <Select
              value={provider}
              onValueChange={(value) =>
                setProvider(value as LinkProviderOption)
              }
            >
              <SelectTrigger id='provider' className='w-full'>
                <SelectValue placeholder='Seleccionar proveedor' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>Ninguno</SelectItem>
                <SelectItem value='zora'>
                  <span className='flex items-center gap-2'>
                    <img
                      src='/assets/branding/logos/zora_logo.svg'
                      alt='Zora'
                      className='h-4 w-4 rounded-full'
                    />
                    zora
                  </span>
                </SelectItem>
                <SelectItem value='objkt'>objkt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider !== 'none' ? (
            <>
              <div className='grid gap-2'>
                <Label htmlFor='media-url'>URL</Label>
                <Input
                  id='media-url'
                  value={url}
                  placeholder='https://...'
                  onChange={(event) => setUrl(event.target.value)}
                  autoComplete='off'
                  spellCheck={false}
                />
              </div>

              <div className='grid gap-3'>
                <Label>Color de Fuente</Label>
                <div className='flex flex-wrap items-center gap-2'>
                  {[
                    { value: WHITE, label: 'Blanco' },
                    { value: BLACK, label: 'Negro' }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type='button'
                      onClick={() => setFontColor(preset.value)}
                      className={cn(
                        'border-input hover:border-ring flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition',
                        fontColor.toLowerCase() === preset.value
                          ? 'ring-ring/40 border-ring ring-2'
                          : null
                      )}
                    >
                      <span
                        className='h-4 w-4 rounded-full border'
                        style={{ backgroundColor: preset.value }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className='flex items-center gap-2'>
                  <Input
                    type='color'
                    value={sanitizeHexColor(fontColor)}
                    onChange={(event) => setFontColor(event.target.value)}
                    className='h-9 w-14 cursor-pointer p-1'
                    aria-label='Seleccionar color'
                  />
                  <Input
                    value={fontColor}
                    onChange={(event) => setFontColor(event.target.value)}
                    placeholder='#ffffff'
                    className='font-mono'
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className='gap-2 sm:justify-end'>
          {provider !== 'none' ? (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={saving}
              onClick={() => setConfirmDeleteOpen(true)}
              aria-label='Eliminar link'
              title='Eliminar link'
              className='text-muted-foreground hover:text-destructive'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          ) : null}
          <Button
            type='button'
            variant='outline'
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type='button' disabled={!canSave} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar link?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina el proveedor, la URL y el color asociados a este media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLink}
              disabled={saving}
              className='bg-red-600/80 text-white hover:bg-red-600'
            >
              {saving ? 'Eliminando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
