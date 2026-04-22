import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { db } from '@/lib/firebase';
import { mapRequestSnapshotDocToRow } from '@/features/requests/lib/request-row-adapter';
import type { RequestListRow as RequestRow } from '@/types/domain';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

interface UseRequestsRealtimeParams {
  selectedRow: RequestRow | null;
  onCloseSummary: () => void;
  onSelectedRowSync: (row: RequestRow | null) => void;
}

interface UseRequestsRealtimeResult {
  rows: RequestRow[];
  setRows: Dispatch<SetStateAction<RequestRow[]>>;
  loading: boolean;
}

export const useRequestsRealtime = ({
  selectedRow,
  onCloseSummary,
  onSelectedRowSync
}: UseRequestsRealtimeParams): UseRequestsRealtimeResult => {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.REQUESTS),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setRows(snapshot.docs.map(mapRequestSnapshotDocToRow));
        setLoading(false);
      },
      (error) => {
        console.error('[Requests] load error', error);
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedRow) return;

    const refreshedSelected = rows.find((row) => row.id === selectedRow.id);
    if (!refreshedSelected) {
      onCloseSummary();
      onSelectedRowSync(null);
      return;
    }

    onSelectedRowSync(refreshedSelected);
  }, [rows, selectedRow, onCloseSummary, onSelectedRowSync]);

  return {
    rows,
    setRows,
    loading
  };
};
