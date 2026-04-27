import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  Timestamp,
  deleteDoc,
  doc 
} from 'firebase/firestore';

export interface NewsletterSubscriber {
  id?: string;
  name: string;
  email: string;
  subscribedAt: any;
  consentGiven?: boolean;
  consentDate?: any;
}

export async function subscribeToNewsletter(
  name: string, 
  email: string, 
  consentGiven: boolean = true
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Comprobar si ya existe
  const q = query(collection(db, 'newsletter'), where('email', '==', normalizedEmail));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    throw new Error('Este email ya está suscrito a la newsletter.');
  }

  await addDoc(collection(db, 'newsletter'), {
    name,
    email: normalizedEmail,
    subscribedAt: Timestamp.now(),
    consentGiven,
    consentDate: Timestamp.now()
  });
}

export async function getAllSubscribers(): Promise<NewsletterSubscriber[]> {
  const snapshot = await getDocs(collection(db, 'newsletter'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as NewsletterSubscriber));
}

export async function unsubscribeFromNewsletter(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const q = query(collection(db, 'newsletter'), where('email', '==', normalizedEmail));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('El correo no se encuentra suscrito.');
  }

  // Use deleteDoc from firebase/firestore
  // We delete all matches in case there are duplicates
  const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'newsletter', d.id)));
  await Promise.all(deletePromises);
}

export async function isSubscribed(email: string): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const q = query(collection(db, 'newsletter'), where('email', '==', normalizedEmail));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
