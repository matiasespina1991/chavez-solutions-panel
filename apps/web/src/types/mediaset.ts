export interface MediaSet {
  id: string;
  category: 'home' | 'caves' | 'landscapes';
  title?: string;
  ordering: number;
  createdAt: any;
  modifiedAt: any;
  publishedAt: any;
  deletedAt?: any;
}

export interface MediaSetItem {
  id: string;
  mediaId: string;
  mediaItems?: Array<{
    mediaId: string;
    order: number;
  }>;
  order: number;
  flex: number;
}

export interface Media {
  id: string;
  type: 'image' | 'video';
  paths: any;
  processed: boolean;
  deletedAt?: any;
  uploadId: string;
  createdAt: any;
  modifiedAt: any;
}
