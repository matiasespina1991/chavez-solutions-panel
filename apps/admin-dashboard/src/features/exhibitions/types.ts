export type ExhibitionRow = {
  id: string;
  title: string;
  dateAndLocation?: string;
  body: string;
  posterPath?: string;
  videoCount: number;
  order: number;
};

export type ExhibitionDoc = {
  title: string;
  dateAndLocation?: string;
  body: string;
  featureMediaId?: string | null;
  mediaIds?: string[];
  order?: number;
};
