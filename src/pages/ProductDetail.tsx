import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { getSEOImageUrl, updateMetaTags } from '../lib/seoUtils';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const language = useSettingsStore(state => state.language);
  const t = translations[language];
  const currencySymbol = useSettingsStore(state => state.currencySymbol);
  const exchangeRate = useSettingsStore(state => state.exchangeRate);
  const addItem = useCartStore(state => state.addItem);

  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setProduct(data);
          setActiveImage(data.image_url);

          // Actualizar SEO
          updateMetaTags({
            title: `${data.title} | Final Fantasy Store`,
            description: data.description?.substring(0, 160) || `Compra ${data.title} en nuestra tienda especializada de Final Fantasy.`,
            image: getSEOImageUrl(data.image_url)
          });
          
          // Fetch related products
          const q = query(
            collection(db, 'products'),
            where('category', '==', data.category),
            where('__name__', '!=', id),
            limit(4)
          );
          const relatedSnap = await getDocs(q);
          setRelatedProducts(relatedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      const sizesObj = product.sizes || {};
      const availableSizes = Object.keys(sizesObj).filter(sz => sizesObj[sz] > 0);
      const currentSize = selectedSize || (availableSizes.length > 0 ? availableSizes[0] : undefined);

      if (availableSizes.length > 0 && !currentSize) {
        // If there are sizes but none is selected (edge case), do nothing or could show an error
        return;
      }

      addItem({
        ...product,
        cartItemId: currentSize ? `${product.id}-${currentSize}` : product.id,
        selectedSize: currentSize,
        quantity: quantity
      });
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/carrito');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-outline mb-4">inventory_2</span>
        <h1 className="text-4xl font-headline font-bold text-on-background mb-4">{t.common.error}</h1>
        <p className="text-on-surface-variant mb-8">El producto que buscas no existe o ha sido retirado.</p>
        <Link to="/" className="inline-flex items-center justify-center px-8 py-3 bg-primary text-on-primary rounded-full font-medium transition-transform hover:scale-105">
          {t.common.backToHome}
        </Link>
      </div>
    );
  }

  const convertedPrice = (Number(product.price) * exchangeRate).toFixed(2);
  const sizesObj = product.sizes || {};
  const availableSizes = Object.keys(sizesObj).filter(sz => sizesObj[sz] > 0);
  const isOutOfStock = (Object.keys(sizesObj).length > 0 && availableSizes.length === 0) || (Object.keys(sizesObj).length === 0 && Number(product.stock) <= 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-8 overflow-x-auto whitespace-nowrap pb-2">
        <Link to="/" className="hover:text-primary transition-colors">{t.nav.home}</Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <Link 
          to={product.type === 'cartas' ? '/cartas' : '/merchandising'} 
          className="hover:text-primary transition-colors capitalize"
        >
          {product.type === 'cartas' ? t.nav.tcg : t.nav.merch}
        </Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-on-surface font-medium truncate">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-surface-container rounded-3xl overflow-hidden border border-outline-variant/30 group">
            <button 
              onClick={() => setShowLightbox(true)}
              className="w-full h-full cursor-zoom-in"
            >
              <img 
                src={getSEOImageUrl(activeImage) || `https://picsum.photos/seed/${product.id}/800/800`} 
                alt={product.title}
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
              />
            </button>
          </div>
          {/* Thumbnails if multiple images (simulated for now) */}
          <div className="flex gap-4">
            {[product.image_url, ...(product.extra_images || [])].map((img, index) => (
              <button 
                key={index}
                onClick={() => setActiveImage(img)}
                className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  activeImage === img ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={getSEOImageUrl(img) || `https://picsum.photos/seed/${product.id}-${index}/200/200`} alt={`${product.title} ${index}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-6">
            <div className="inline-flex px-3 py-1 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold uppercase tracking-wider mb-4">
              {product.category}
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-background mb-2">{product.title}</h1>
            <div className="flex items-center gap-4 mb-4">
              <p className="text-2xl font-bold text-primary">{currencySymbol}{convertedPrice}</p>
              {isOutOfStock && (
                <span className="px-3 py-1 bg-error/10 text-error rounded-full text-xs font-bold uppercase tracking-widest border border-error/20">
                  Agotado temporalmente
                </span>
              )}
            </div>
          </div>

          <div className="prose prose-sm text-on-surface-variant mb-8 max-w-none">
            <p className="text-lg leading-relaxed">{product.description}</p>
          </div>

          {product.sizes && Object.keys(product.sizes).length > 0 && (
            <div className="mb-8">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-tighter mb-3 block">Selecciona una talla</span>
              <div className="flex flex-wrap gap-3">
                {Object.keys(product.sizes).map((sz) => {
                  const stock = product.sizes[sz];
                  const isAvailable = stock > 0;
                  // If no size is selected yet, default to the first available one in UI
                  const isSelected = selectedSize === sz || (!selectedSize && isAvailable && Object.keys(product.sizes).filter(s => product.sizes[s] > 0)[0] === sz);
                  
                  return (
                    <button
                      key={sz}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(sz)}
                      className={`min-w-[3rem] h-12 px-4 rounded-xl font-bold transition-all border-2 flex flex-col items-center justify-center ${
                        isSelected 
                          ? 'border-primary bg-primary-container text-on-primary-container' 
                          : isAvailable 
                            ? 'border-outline-variant hover:border-primary text-on-surface' 
                            : 'border-outline-variant/30 text-on-surface/30 cursor-not-allowed bg-surface-container-highest/30'
                      }`}
                    >
                      <span>{sz}</span>
                      {!isAvailable && <span className="text-[9px] font-normal uppercase tracking-widest mt-0.5">Agotado</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 mb-8">
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">{t.common.quantity}</span>
                <div className={`flex items-center bg-surface-container rounded-full p-1 border border-outline-variant/30 ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button 
                    disabled={isOutOfStock}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    disabled={isOutOfStock}
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
              
              <div className="flex-grow flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs font-bold text-transparent select-none uppercase">.</span>
                <button 
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-primary-container text-on-primary-container rounded-full font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-on-primary transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                  {isOutOfStock ? 'Sin Stock' : t.common.addCart}
                </button>
              </div>
            </div>

            <button 
              disabled={isOutOfStock}
              onClick={handleBuyNow}
              className="w-full py-4 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">bolt</span>
              {isOutOfStock ? 'No disponible' : t.common.buyNow}
            </button>
          </div>

          {/* Product Details Table/Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
              <span className="block text-on-surface-variant mb-1">ID Producto</span>
              <span className="font-mono text-xs">{id}</span>
            </div>
            {product.tags && product.tags.length > 0 && (
              <div className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                <span className="block text-on-surface-variant mb-1">Etiquetas</span>
                <div className="flex flex-wrap gap-1">
                  {product.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] bg-outline-variant/20 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {product.expansion && (
              <div className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                <span className="block text-on-surface-variant mb-1">Expansión</span>
                <span className="font-bold text-primary">{product.expansion}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-24">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-headline text-3xl font-bold text-on-background">También te puede gustar</h2>
            <Link to={product.type === 'cartas' ? '/cartas' : '/merchandising'} className="text-primary font-medium hover:underline flex items-center gap-1">
              {t.common.viewMore} <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <Link key={rel.id} to={`/producto/${rel.id}`} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-outline-variant/20 group">
                <div className="aspect-[3/4] relative overflow-hidden bg-surface-container">
                  <img src={getSEOImageUrl(rel.image_url) || `https://picsum.photos/seed/card${rel.id}/400/600`} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-surface/80 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-primary">{rel.category}</div>
                </div>
                <div className="p-4 flex flex-col">
                  <h3 className="font-headline font-bold text-lg mb-1 truncate">{rel.title}</h3>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-lg text-primary">{currencySymbol}{(Number(rel.price) * exchangeRate).toFixed(2)}</span>
                    <button className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {showLightbox && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl animate-in fade-in duration-300"></div>
          <button 
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-all z-10 shadow-lg"
            onClick={() => setShowLightbox(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <div 
            className="relative max-w-5xl w-full max-h-full flex items-center justify-center animate-in zoom-in-95 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={getSEOImageUrl(activeImage) || `https://picsum.photos/seed/${product.id}/1200/1200`} 
              alt={product.title}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
