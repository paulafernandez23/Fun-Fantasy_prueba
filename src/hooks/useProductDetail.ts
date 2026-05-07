import { useState, useEffect } from 'react';
import { getDocument, queryDocuments } from '../lib/db/firestoreService';
import { where, limit } from 'firebase/firestore';
import { getSEOImageUrl, updateMetaTags } from '../lib/seoUtils';

export function useProductDetail(id: string | undefined) {
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await getDocument<any>('products', id);

        if (isMounted) {
          if (!data || data.category === 'SIN CATEGORÍA') {
            setProduct(null);
            setLoading(false);
            return;
          }

          setProduct(data);

          // Actualizar SEO
          updateMetaTags({
            title: `${data.title} | Final Fantasy Store`,
            description: data.description?.substring(0, 160) || `Compra ${data.title} en nuestra tienda especializada de Final Fantasy.`,
            image: getSEOImageUrl(data.image_url)
          });
          
          // Fetch related products using queryDocuments wrapper
          // Note: __name__ (document ID) filtering in Firestore requires special handling, 
          // we can just fetch slightly more and filter client-side or use where('__name__', '!=', id)
          // The where() clause works directly with our firestoreService generic wrapper.
          
          const relatedSnap = await queryDocuments<any>('products', [
            where('category', '==', data.category),
            limit(5)
          ]);
          
          // Filter out the current product client-side to be safe with __name__ inequalities
          const related = relatedSnap.filter(p => p.id !== id).slice(0, 4);
          setRelatedProducts(related);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { product, relatedProducts, loading };
}
