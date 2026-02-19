import { doc, getDoc } from 'firebase/firestore';
import { AboutMeData } from '../types/types';
import db from '../config/firebase';

export async function getAboutMeData(): Promise<AboutMeData | null> {
  const aboutDoc = await getDoc(doc(db, 'about_me', 'default'));
  if (!aboutDoc.exists()) {
    console.error('No About Me document found.');
    return null;
  }
  const data = aboutDoc.data() as AboutMeData | undefined;
  return data ?? null;
}
