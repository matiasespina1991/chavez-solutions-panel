'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import { useEffect, useRef, useState } from 'react';
import MediasetItem from './mediaset-item-v2';
import NewMediasetDialog from './new-mediaset-dialog-v2';
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import type { MediaSet, MediaSetItem, Media } from '@/types/mediaset';

interface Props {
  category: 'home' | 'caves' | 'landscapes';
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

const getPrimaryMediaId = (item: MediaSetItem) => {
  const fromArray = getSortedMediaEntries(item)[0]?.mediaId;
  if (fromArray) return fromArray;
  return item.mediaId || null;
};

export default function CategoryOrganizer({ category }: Props) {
  const [mediasets, setMediasets] = useState<MediaSet[]>([]);
  const [itemsByMediaset, setItemsByMediaset] = useState<
    Record<string, MediaSetItem[]>
  >({});
  const [mediaById, setMediaById] = useState<Record<string, Media>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  function handleMediasetCreated(position: 'start' | 'end') {
    window.setTimeout(() => {
      const node = listContainerRef.current;
      if (!node) return;
      if (position === 'start') {
        node.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }, 200);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    setLoading(true);

    // Real-time listener for mediasets of this category
    const mediasetsQuery = query(
      collection(db, 'mediasets'),
      where('category', '==', category),
      orderBy('ordering', 'asc')
    );
    const unsubscribeMediasets = onSnapshot(
      mediasetsQuery,
      (snapshot) => {
        const loadedMediasets = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id }) as MediaSet)
          .filter((ms) => !ms.deletedAt);
        setMediasets(loadedMediasets);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading mediasets:', error);
        toast.error('Error al cargar mediasets');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeMediasets();
    };
  }, [category]);

  // Load items for each mediaset
  useEffect(() => {
    if (mediasets.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    mediasets.forEach((mediaset) => {
      const itemsQuery = query(
        collection(db, 'mediasets', mediaset.id, 'items'),
        orderBy('order', 'asc')
      );

      const unsubscribe = onSnapshot(
        itemsQuery,
        async (snapshot) => {
          const items = snapshot.docs.map(
            (d) => ({ ...d.data(), id: d.id }) as MediaSetItem
          );
          setItemsByMediaset((prev) => ({ ...prev, [mediaset.id]: items }));

          const mediaIds = Array.from(
            new Set(items.flatMap((item) => getItemMediaIds(item)))
          );

          // Load media for these items (including carousel entries)
          const mediaPromises = mediaIds.map(async (mediaId) => {
            try {
              const mediaDocRef = doc(db, 'media', mediaId);
              const mediaDocSnap = await getDoc(mediaDocRef);
              if (mediaDocSnap.exists()) {
                const media = {
                  ...mediaDocSnap.data(),
                  id: mediaDocSnap.id
                } as Media;
                setMediaById((prev) => ({ ...prev, [mediaId]: media }));
              }
            } catch (error) {
              console.error(`[CategoryOrganizer] Error loading media ${mediaId}:`, error);
            }
          });

          await Promise.all(mediaPromises);
        },
        (error) => {
          console.error(
            `Error loading items for mediaset ${mediaset.id}:`,
            error
          );
        }
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [mediasets]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = mediasets.findIndex((ms) => ms.id === active.id);
    const newIndex = mediasets.findIndex((ms) => ms.id === over.id);

    const reordered = arrayMove(mediasets, oldIndex, newIndex);
    setMediasets(reordered);

    // Save to Firestore
    try {
      setSaving(true);
      const batch = writeBatch(db);
      reordered.forEach((ms, idx) => {
        batch.update(doc(db, 'mediasets', ms.id), { ordering: idx });
      });
      await batch.commit();
      toast.success('Orden actualizado');
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Error al guardar orden');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='flex h-full min-h-0 flex-col gap-4'>
      <div className='bg-background sticky top-0 z-10 flex justify-end pb-2'>
        <NewMediasetDialog
          category={category}
          currentMinOrdering={
            mediasets.length > 0
              ? Math.min(...mediasets.map((ms) => ms.ordering))
              : 0
          }
          currentMaxOrdering={
            mediasets.length > 0
              ? Math.max(...mediasets.map((ms) => ms.ordering))
              : -1
          }
          onCreated={handleMediasetCreated}
        />
      </div>

      <div
        ref={listContainerRef}
        className='min-h-0 flex-1 overflow-y-auto pr-1'
      >
        {loading ? (
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-6 w-4' />
              <Skeleton className='h-[65px] flex-1' />
            </div>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-6 w-4' />
              <Skeleton className='h-[65px] flex-1' />
            </div>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-6 w-4' />
              <Skeleton className='h-[65px] flex-1' />
            </div>
          </div>
        ) : mediasets.length === 0 ? (
          <Card className='p-8 text-center'>
            <p className='text-muted-foreground'>
              No hay mediasets todavía. Crea uno para empezar.
            </p>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={mediasets.map((ms) => ms.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className='space-y-4'>
                {mediasets.map((mediaset, index) => {
                  const items = itemsByMediaset[mediaset.id] || [];
                  const mediaList = items
                    .map((item) => {
                      const primaryMediaId = getPrimaryMediaId(item);
                      if (!primaryMediaId) return null;
                      const primaryMedia = mediaById[primaryMediaId];
                      if (!primaryMedia) return null;
                      return {
                        ...item,
                        ...primaryMedia,
                        id: primaryMedia.id,
                        mediaId: primaryMediaId
                      };
                    })
                    .filter((m): m is Media & MediaSetItem => Boolean(m?.id));

                  return (
                    <MediasetItem
                      key={mediaset.id}
                      mediaset={mediaset}
                      index={index}
                      items={items}
                      mediaList={mediaList as any}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
