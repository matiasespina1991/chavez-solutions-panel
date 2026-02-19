'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ExhibitionTable } from './exhibition-tables';
import { columns } from './exhibition-tables/columns';
import type {
  ExhibitionDoc,
  ExhibitionRow
} from '@/features/exhibitions/types';

type ExhibitionListingPage = {};

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function ExhibitionListingPage({}: ExhibitionListingPage) {
  const [data, setData] = useState<ExhibitionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const exhibitionsQuery = query(
      collection(db, 'exhibitions'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      exhibitionsQuery,
      async (snapshot) => {
        try {
          const rows = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const values = docSnap.data() as ExhibitionDoc;
              const body = values.body ?? '';
              const mediaId = values.featureMediaId ?? values.mediaIds?.[0];
              let posterPath: string | undefined;

              if (mediaId) {
                try {
                  const mediaSnap = await getDoc(doc(db, 'media', mediaId));
                  const mediaData = mediaSnap.data() as {
                    type?: 'image' | 'video';
                    paths?: {
                      poster?: { storagePath?: string };
                      derivatives?: {
                        webp_medium?: { storagePath?: string };
                        webp_small?: { storagePath?: string };
                      };
                      original?: { storagePath?: string };
                    };
                  };
                  if (mediaData?.type === 'video') {
                    posterPath = mediaData?.paths?.poster?.storagePath;
                  } else {
                    posterPath =
                      mediaData?.paths?.derivatives?.webp_medium?.storagePath ??
                      mediaData?.paths?.derivatives?.webp_small?.storagePath ??
                      mediaData?.paths?.original?.storagePath;
                  }
                } catch (error) {
                  console.warn(
                    '[Exhibitions] poster load error',
                    mediaId,
                    error
                  );
                }
              }

              return {
                id: docSnap.id,
                title: values.title ?? '',
                dateAndLocation: values.dateAndLocation ?? '',
                body: stripHtml(body),
                posterPath,
                videoCount:
                  (values.mediaIds?.length ?? 0) +
                  (values.featureMediaId ? 1 : 0),
                order: typeof values.order === 'number' ? values.order : 0
              };
            })
          );

          if (isMounted) {
            setData(rows);
          }
        } catch (error) {
          console.error('[Exhibitions] load error', error);
          if (isMounted) {
            setData([]);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error('[Exhibitions] load error', error);
        if (isMounted) {
          setData([]);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <DataTableSkeleton
        columnCount={7}
        rowCount={6}
        filterCount={1}
        withPagination={true}
        firstCellVariant='poster'
        cellWidths={['40px', '96px', '20%', '20%', '44%', '8%', '48px']}
      />
    );
  }

  return (
    <ExhibitionTable data={data} totalItems={data.length} columns={columns} />
  );
}
