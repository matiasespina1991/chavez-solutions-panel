'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import MediaPickerDialog, {
  type MediaDoc
} from '@/components/media-picker-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediasetId: string;
  category: 'home' | 'caves' | 'landscapes';
  mode: 'single' | 'carousel';
  onSuccess: () => void;
}

export default function AssignMediaDialogV2({
  open,
  onOpenChange,
  mediasetId,
  category,
  mode,
  onSuccess
}: Props) {
  const [assignedMediaIds, setAssignedMediaIds] = useState<Set<string>>(
    new Set()
  );

  // Load already assigned media IDs for this category
  async function loadAssignedMedia() {
    try {
      // Get all mediasets for this category
      const mediasetsQuery = query(
        collection(db, 'mediasets'),
        orderBy('ordering', 'asc')
      );
      const mediasetsSnapshot = await getDocs(mediasetsQuery);

      const categoryMediasets = mediasetsSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((ms: any) => ms.category === category && !ms.deletedAt);

      const assignedIds = new Set<string>();

      // For each mediaset, get all items
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

      setAssignedMediaIds(assignedIds);
    } catch (error) {
      console.error('Error loading assigned media:', error);
      toast.error('Error al cargar medios asignados');
    }
  }

  // Load when dialog opens
  useEffect(() => {
    if (open) {
      loadAssignedMedia();
    }
  }, [open, category]);

  async function handleConfirm(selectedMedia: MediaDoc[]) {
    if (selectedMedia.length === 0) return false;

    try {
      // Get current max order for this mediaset
      const itemsSnapshot = await getDocs(
        query(
          collection(db, 'mediasets', mediasetId, 'items'),
          orderBy('order', 'desc')
        )
      );

      const maxOrder =
        itemsSnapshot.docs.length > 0
          ? itemsSnapshot.docs[0].data().order || 0
          : -1;

      const batch = writeBatch(db);

      // Keep user selection order from the picker (1, 2, 3...)
      const orderedSelection = [...selectedMedia];

      if (mode === 'carousel') {
        if (orderedSelection.length < 2) {
          toast.error('Seleccioná al menos 2 medios para crear un carousel.');
          return false;
        }

        const carouselRefs = orderedSelection.map((media, index) => ({
          mediaId: media.id,
          order: index
        }));
        const primaryMediaId = carouselRefs[0]?.mediaId;
        if (!primaryMediaId) {
          toast.error('No se pudo determinar el medio principal.');
          return false;
        }

        const newItemRef = doc(
          collection(db, 'mediasets', mediasetId, 'items')
        );
        batch.set(newItemRef, {
          mediaId: primaryMediaId,
          mediaItems: carouselRefs,
          order: maxOrder + 1,
          flex: 1
        });
      } else {
        const media = orderedSelection[0];
        if (!media) {
          toast.error('No se pudo determinar el medio a agregar.');
          return false;
        }

        const newItemRef = doc(db, 'mediasets', mediasetId, 'items', media.id);
        batch.set(newItemRef, {
          mediaId: media.id,
          order: maxOrder + 1,
          flex: 1
        });
      }

      await batch.commit();

      toast.success(
        mode === 'carousel'
          ? 'Carousel agregado a la fila'
          : 'Medio agregado a la fila'
      );
      onSuccess();
      return true;
    } catch (error) {
      console.error('Error assigning media:', error);
      toast.error('Error al asignar medios');
      return false;
    }
  }

  const filterUnassigned = (media: MediaDoc) => {
    // Filter out media that are already assigned to any mediaset in this category
    return !assignedMediaIds.has(media.id);
  };

  const maxSelection = mode === 'carousel' ? 10 : 1;
  const title =
    mode === 'carousel'
      ? 'Agregar Carousel a la Fila'
      : 'Agregar Medio a la Fila';
  const description =
    mode === 'carousel'
      ? `Seleccioná entre 2 y 10 para el carousel. Se muestran solo medios aún no asignados a ${category}.`
      : `Seleccioná un elemento para agregar. Se muestran solo medios aún no asignados a ${category}.`;

  return (
    <MediaPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      selectionMode={mode === 'carousel' ? 'multiple' : 'single'}
      filterPredicate={filterUnassigned}
      selectedIds={[]}
      maxSelection={maxSelection}
      onConfirm={handleConfirm}
    />
  );
}
