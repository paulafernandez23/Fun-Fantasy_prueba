import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';

export interface LoyaltyAccount {
  email: string;
  name: string;
  points: number;
  level: string;
  createdAt: any;
  lastActivity: any;
}

export const LOYALTY_LEVELS = [
  { name: 'Bronce', minPoints: 0, benefit: 'Acceso a lanzamientos exclusivos' },
  { name: 'Plata', minPoints: 100, benefit: '5% de descuento en tu próxima compra' },
  { name: 'Oro', minPoints: 300, benefit: '10% de descuento + prioridad en tasaciones' },
  { name: 'Cristal', minPoints: 600, benefit: '15% de descuento + envío gratuito siempre' },
];

export function getLevelInfo(points: number) {
  const level = [...LOYALTY_LEVELS].reverse().find(l => points >= l.minPoints) || LOYALTY_LEVELS[0];
  const nextLevel = LOYALTY_LEVELS[LOYALTY_LEVELS.indexOf(level) + 1];
  
  return {
    current: level,
    next: nextLevel,
    pointsToNext: nextLevel ? nextLevel.minPoints - points : 0
  };
}

export async function getLoyaltyByEmail(email: string): Promise<LoyaltyAccount | null> {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    // 1. Intentar por ID de documento (más rápido)
    const docRef = doc(db, 'loyalty', normalizedEmail);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as LoyaltyAccount;
    }

    // 2. Backup: Buscar por el campo 'email' por si el ID no es el email (casos antiguos)
    const q = query(collection(db, 'loyalty'), where('email', '==', normalizedEmail));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as LoyaltyAccount;
    }
    
    // 3. Segundo Backup: Por si acaso se guardó el email en el campo 'name' por error
    const q2 = query(collection(db, 'loyalty'), where('name', '==', normalizedEmail));
    const querySnap2 = await getDocs(q2);
    if (!querySnap2.empty) {
      return querySnap2.docs[0].data() as LoyaltyAccount;
    }
  } catch (error) {
    console.error("Error fetching loyalty account:", error);
  }
  
  return null;
}

export async function createLoyaltyAccount(name: string, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Verificar si ya existe por si acaso
  const existing = await getLoyaltyByEmail(normalizedEmail);
  if (existing) return;

  const loyaltyData: LoyaltyAccount = {
    name: name.trim(),
    email: normalizedEmail,
    points: 0,
    level: 'Bronce',
    createdAt: Timestamp.now(),
    lastActivity: Timestamp.now()
  };
  
  await setDoc(doc(db, 'loyalty', normalizedEmail), loyaltyData);
}

export async function deleteLoyaltyAccount(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await deleteDoc(doc(db, 'loyalty', normalizedEmail));
}

export async function addPoints(email: string, pointsToAdd: number): Promise<void> {
  const loyalty = await getLoyaltyByEmail(email);
  if (!loyalty) throw new Error('Cliente no encontrado');
  
  const newPoints = loyalty.points + pointsToAdd;
  const newLevel = getLevelInfo(newPoints).current.name;
  
  const normalizedEmail = email.toLowerCase().trim();
  await updateDoc(doc(db, 'loyalty', normalizedEmail), {
    points: newPoints,
    level: newLevel,
    lastActivity: Timestamp.now()
  });
}

export async function getAllLoyaltyUsers(): Promise<LoyaltyAccount[]> {
  const snapshot = await getDocs(collection(db, 'loyalty'));
  return snapshot.docs.map(doc => doc.data() as LoyaltyAccount);
}

// Loyalty Configuration
export interface LoyaltyConfig {
  pointsPerEuro: number;
  pointsToRedeem: number; // Cuántos puntos se necesitan para el descuento
  rewardAmount: number;   // Cuánto descuento se da (en €)
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerEuro: 1,
  pointsToRedeem: 50,
  rewardAmount: 5
};

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const configDoc = doc(db, 'app_settings', 'loyalty');
  const snap = await getDoc(configDoc);
  
  if (snap.exists()) {
    return snap.data() as LoyaltyConfig;
  }
  
  // Inicializar con valores por defecto si no existe
  try {
    await setDoc(configDoc, DEFAULT_LOYALTY_CONFIG);
  } catch (error) {
    console.error('Error al inicializar config de lealtad:', error);
  }
  return DEFAULT_LOYALTY_CONFIG;
}

export async function updateLoyaltyConfig(config: LoyaltyConfig): Promise<void> {
  const configDoc = doc(db, 'app_settings', 'loyalty');
  await setDoc(configDoc, config);
}
