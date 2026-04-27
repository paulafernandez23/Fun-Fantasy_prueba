import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  image_url?: string;
  category: string;
  type: 'cartas' | 'merchandising';
  tags?: string[];
  stock?: number;
  sizes?: Record<string, number>;
}

/**
 * Busca productos en Firestore por texto libre en el título.
 * Devuelve hasta 5 resultados.
 */
export async function searchProducts(searchTerm: string): Promise<Product[]> {
  const term = searchTerm.toLowerCase().trim();
  const snapshot = await getDocs(
    query(collection(db, 'products'), limit(20))
  );
  const all = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Product));
  // Filtrado client-side para búsqueda flexible (Firestore no soporta full-text search)
  return all
    .filter(p =>
      p.title.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.tags?.some(t => t.toLowerCase().includes(term))
    )
    .slice(0, 5);
}

/**
 * Devuelve los productos más recientes (hasta 4) para mostrar novedades.
 */
export async function getLatestProducts(productType?: 'cartas' | 'merchandising'): Promise<Product[]> {
  let q;
  if (productType) {
    q = query(collection(db, 'products'), where('type', '==', productType), limit(4));
  } else {
    q = query(collection(db, 'products'), limit(4));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Product));
}

/**
 * Comprueba el stock de un producto por nombre.
 */
export async function checkProductStock(productName: string): Promise<Product | null> {
  const results = await searchProducts(productName);
  return results.length > 0 ? results[0] : null;
}

/**
 * Formatea la información de stock de un producto en texto legible.
 */
export function formatStockInfo(product: Product): string {
  // Solo tratar como producto con tallas si sizes tiene claves reales
  const hasSizes = product.sizes && Object.keys(product.sizes).length > 0;

  if (hasSizes) {
    const sizesWithStock = Object.entries(product.sizes!)
      .filter(([, qty]) => qty > 0)
      .map(([size, qty]) => `${size}: ${qty} uds`);
    if (sizesWithStock.length === 0) return 'Sin stock disponible';
    return `Tallas disponibles: ${sizesWithStock.join(', ')}`;
  }

  if (product.stock !== undefined && product.stock !== null) {
    return product.stock > 0
      ? `${product.stock} unidades en stock`
      : 'Sin stock disponible';
  }

  // Si el campo stock no existe en el documento, asumir disponible
  return 'Disponible';
}

/**
 * Formatea una lista de productos como texto para incluir en el prompt de Gemini.
 * En búsquedas generales solo muestra nombre, categoría y precio.
 * El stock solo se detalla cuando el usuario lo pregunta explícitamente.
 */
export function formatProductsForGemini(products: Product[], includeStock = false): string {
  if (products.length === 0) return 'No se encontraron productos para esa búsqueda.';
  return products
    .map(p => {
      const line = `- **${p.title}** (${p.category}) — ${Number(p.price).toFixed(2)}€`;
      return includeStock ? `${line} | ${formatStockInfo(p)}` : line;
    })
    .join('\n');
}
