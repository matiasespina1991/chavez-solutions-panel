export interface MediaSet {
    id: string;
    ordering: number;
    createdAt: FirebaseFirestore.Timestamp;
    modifiedAt: FirebaseFirestore.Timestamp;
    publishedAt?: FirebaseFirestore.Timestamp | null;
    deletedAt?: FirebaseFirestore.Timestamp | null;
}
