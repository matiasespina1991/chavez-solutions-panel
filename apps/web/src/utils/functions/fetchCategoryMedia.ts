import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import db from '@/utils/config/firebase';
import type { MediaSet } from '@/types/mediaset';
import type { Media } from '@/utils/types/media';

type MediaSetItemDoc = {
  mediaId?: string;
  mediaItems?: Array<{ mediaId?: string; order?: number }>;
  flex?: number;
};

const getOrderedItemMediaIds = (item: MediaSetItemDoc) => {
  const fromArray =
    item.mediaItems
      ?.slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((entry) => entry.mediaId)
      .filter((id): id is string => Boolean(id)) ?? [];

  if (fromArray.length > 0) return fromArray;
  return item.mediaId ? [item.mediaId] : [];
};

export async function fetchCategoryMedia(
  category: string
): Promise<{ mediaset: MediaSet; media: Media[] }[]> {
  // Fetch all mediasets for this category
  const mediasetsSnap = await getDocs(
    query(
      collection(db, 'mediasets'),
      where('category', '==', category),
      orderBy('ordering', 'asc')
    )
  );

  const mediasets = mediasetsSnap.docs
    .map((d) => ({ ...d.data(), id: d.id }) as MediaSet)
    .filter((ms) => !ms.deletedAt);

  const result: { mediaset: MediaSet; media: Media[] }[] = [];

  for (const mediaset of mediasets) {
    // Fetch items for this mediaset
    const itemsSnap = await getDocs(
      query(
        collection(db, 'mediasets', mediaset.id, 'items'),
        orderBy('order', 'asc')
      )
    );

    const media: Media[] = [];

    // Fetch media for each item
    for (const itemDoc of itemsSnap.docs) {
      const itemData = itemDoc.data() as MediaSetItemDoc;
      const orderedMediaIds = getOrderedItemMediaIds(itemData);
      if (orderedMediaIds.length === 0) continue;

      const mediaDocs = await Promise.all(
        orderedMediaIds.map(async (mediaId) => {
          const mediaDocRef = doc(db, 'media', mediaId);
          const mediaDocSnap = await getDoc(mediaDocRef);
          if (!mediaDocSnap.exists()) return null;
          const mediaData = mediaDocSnap.data() as Media;
          if (!mediaData.processed || mediaData.deletedAt) return null;
          return { ...mediaData, id: mediaDocSnap.id };
        })
      );

      const orderedMedia = orderedMediaIds
        .map((mediaId) => mediaDocs.find((mediaDoc) => mediaDoc?.id === mediaId))
        .filter((mediaDoc): mediaDoc is Media => Boolean(mediaDoc));

      if (!orderedMedia.length) continue;

      const primaryMedia = orderedMedia[0];
      media.push({
        ...primaryMedia,
        itemId: itemDoc.id,
        flex: itemData.flex ?? 1,
        isCarouselItem: orderedMedia.length > 1,
        carouselMedia: orderedMedia.length > 1 ? orderedMedia : undefined
      });
    }

    if (media.length > 0) {
      result.push({ mediaset, media });
    }
  }

  return result;
}
