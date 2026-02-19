import { doc, getDoc } from 'firebase/firestore';
import { ContactData } from '../types/types';
import db from '../config/firebase';

export async function getContactData(): Promise<ContactData | null> {
  const contactDoc = await getDoc(doc(db, 'contact', 'default'));
  if (!contactDoc.exists()) {
    console.error('No Contact document found.');
    return null;
  }
  const contactData = contactDoc.data() as ContactData | undefined;
  const items = (contactData?.items ?? []).slice().sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    return orderA - orderB;
  });

  return { items };
}
