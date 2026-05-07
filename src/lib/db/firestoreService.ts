import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData
} from 'firebase/firestore';

// --- Simple in-memory cache ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache = new Map<string, CacheEntry<any>>();

export interface CacheOptions {
  key: string;       // Unique cache key (e.g., 'products_search_pikachu')
  ttlMs: number;     // Time to live in milliseconds
}

/**
 * Executes a function and caches the result. If the result is already in cache and not expired, returns it.
 */
async function withCache<T>(
  options: CacheOptions | undefined, 
  fetchFn: () => Promise<T>
): Promise<T> {
  if (!options) return fetchFn();

  const { key, ttlMs } = options;
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && (now - cached.timestamp < ttlMs)) {
    console.debug(`[Cache HIT] ${key}`);
    return cached.data as T;
  }

  console.debug(`[Cache MISS] ${key}`);
  const data = await fetchFn();
  cache.set(key, { data, timestamp: now });
  return data;
}

export function invalidateCache(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key);
    }
  }
}

// --- Generic Firestore Operations ---

/**
 * Gets a single document by ID.
 */
export async function getDocument<T>(path: string, id: string, cacheOptions?: CacheOptions): Promise<T | null> {
  const fetchFn = async () => {
    const docRef = doc(db, path, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as T;
  };
  return withCache(cacheOptions, fetchFn);
}

/**
 * Gets all documents from a collection, optionally filtered by query constraints.
 */
export async function queryDocuments<T>(
  path: string, 
  constraints: QueryConstraint[] = [],
  cacheOptions?: CacheOptions
): Promise<T[]> {
  const fetchFn = async () => {
    const q = query(collection(db, path), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
  };
  return withCache(cacheOptions, fetchFn);
}

/**
 * Adds a new document to a collection (auto-generates ID).
 */
export async function createDocument<T extends WithFieldValue<DocumentData>>(
  path: string, 
  data: T
): Promise<string> {
  const ref = await addDoc(collection(db, path), data);
  return ref.id;
}

/**
 * Sets a document with a specific ID.
 */
export async function setDocument<T extends WithFieldValue<DocumentData>>(
  path: string, 
  id: string, 
  data: T
): Promise<void> {
  await setDoc(doc(db, path, id), data);
}

/**
 * Updates an existing document.
 */
export async function updateDocument<T extends UpdateData<DocumentData>>(
  path: string, 
  id: string, 
  data: T
): Promise<void> {
  await updateDoc(doc(db, path, id), data);
}

/**
 * Deletes a document.
 */
export async function removeDocument(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}
