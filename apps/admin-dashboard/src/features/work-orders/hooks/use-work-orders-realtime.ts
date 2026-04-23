import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { db } from '@/lib/firebase';
import type { RequestServiceItem, WorkOrderListRow as WorkOrderRow } from '@/types/domain';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  buildWorkOrderRowFromDoc,
  getRequestServiceItemsFromDoc
} from '@/features/work-orders/lib/work-order-row-adapter';

export function useWorkOrdersRealtime() {
  const [sourceRequestServicesById, setSourceRequestServicesById] = useState<
    Record<string, RequestServiceItem[]>
  >({});
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestsQuery = query(collection(db, FIRESTORE_COLLECTIONS.REQUESTS));
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const nextMap: Record<string, RequestServiceItem[]> = {};
      snapshot.docs.forEach((docSnap) => {
        const value = docSnap.data() as Record<string, unknown>;
        nextMap[docSnap.id] = getRequestServiceItemsFromDoc(value);
      });
      setSourceRequestServicesById(nextMap);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const workOrdersQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.WORK_ORDERS),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      workOrdersQuery,
      (snapshot) => {
        const nextRows: WorkOrderRow[] = snapshot.docs.map((docSnap) =>
          buildWorkOrderRowFromDoc(
            docSnap.id,
            docSnap.data() as Record<string, unknown>,
            sourceRequestServicesById
          )
        );

        setRows(nextRows);
        setLoading(false);
      },
      (error) => {
        console.error('[WorkOrders] load error', error);
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sourceRequestServicesById]);

  return { rows, loading };
}
