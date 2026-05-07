import { createDocument, queryDocuments, removeDocument } from '../db/firestoreService';
import { Timestamp, where } from 'firebase/firestore';

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
  const existing = await queryDocuments<NewsletterSubscriber>('newsletter', [where('email', '==', normalizedEmail)]);
  
  if (existing.length > 0) {
    throw new Error('Este email ya está suscrito a la newsletter.');
  }

  await createDocument('newsletter', {
    name,
    email: normalizedEmail,
    subscribedAt: Timestamp.now(),
    consentGiven,
    consentDate: Timestamp.now()
  });
}

export async function getAllSubscribers(): Promise<NewsletterSubscriber[]> {
  return queryDocuments<NewsletterSubscriber>('newsletter');
}

export async function unsubscribeFromNewsletter(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await queryDocuments<NewsletterSubscriber>('newsletter', [where('email', '==', normalizedEmail)]);
  
  if (existing.length === 0) {
    throw new Error('El correo no se encuentra suscrito.');
  }

  const deletePromises = existing.map(d => removeDocument('newsletter', d.id!));
  await Promise.all(deletePromises);
}

export async function isSubscribed(email: string): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await queryDocuments<NewsletterSubscriber>('newsletter', [where('email', '==', normalizedEmail)]);
  return existing.length > 0;
}
