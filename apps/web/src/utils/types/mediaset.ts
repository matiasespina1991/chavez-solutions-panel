// types/mediaset.ts
import type { Timestamp } from 'firebase/firestore';

export interface MediaSet {
  id: string;
  ordering: number;
  createdAt: Timestamp;
  modifiedAt: Timestamp;
  publishedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
}
