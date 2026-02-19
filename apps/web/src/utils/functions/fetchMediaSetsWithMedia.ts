import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import db from '@/utils/config/firebase';
import { MediaSet } from '@/utils/types/mediaset';
import { Media } from '@/utils/types/media';

export async function fetchMediaSetsWithMedia(): Promise<
  { mediaset: MediaSet; media: Media[] }[]
> {
  // Traemos todos los mediasets de la categoría 'home'
  const mediasetsSnap = await getDocs(
    query(
      collection(db, 'mediasets'),
      where('category', '==', 'home'),
      orderBy('ordering', 'asc')
    )
  );

  const mediasets = mediasetsSnap.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as MediaSet)
    .filter((ms) => !ms.deletedAt);

  const result: { mediaset: MediaSet; media: Media[] }[] = [];

  for (const ms of mediasets) {
    // Get items subcollection for this mediaset
    const itemsSnap = await getDocs(
      query(
        collection(db, 'mediasets', ms.id, 'items'),
        orderBy('order', 'asc')
      )
    );

    const media: Media[] = [];

    // Fetch each media document referenced in items
    for (const itemDoc of itemsSnap.docs) {
      const itemData = itemDoc.data();
      if (itemData.mediaId) {
        const mediaDoc = await getDoc(doc(db, 'media', itemData.mediaId));
        if (mediaDoc.exists()) {
          const mediaData = mediaDoc.data() as Media;
          if (mediaData.processed && !mediaData.deletedAt) {
            media.push({
              ...mediaData,
              id: mediaDoc.id,
              flex: itemData.flex ?? 1,
            });
          }
        }
      }
    }

    if (media.length > 0) {
      result.push({ mediaset: ms, media });
    }
  }

  return result;
}
