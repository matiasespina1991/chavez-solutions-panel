// src/utils/types.ts

import { Timestamp } from 'firebase/firestore';

export interface PhotoSetData {
  created_at: Timestamp;
  id: string;
  index: number;
  images?: Array<string>;
  title: string;
}

export interface AboutMeContactData {
  about_me: AboutMeData;
  contact: ContactData;
}

export interface ContactItem {
  id: string;
  label: string;
  url: string;
  order?: number;
}
export interface AboutMeData {
  title: string;
  content: string;
  imageId?: string | null;
  subcontent: AboutMeSubcontent;
}

export interface AboutMeSubcontent {
  education: EducationContent;
}
export interface EducationContent {
  content: string;
  title: string;
}

export interface ContactData {
  items: ContactItem[];
}
