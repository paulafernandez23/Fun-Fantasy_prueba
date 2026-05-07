import React from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { getSEOImageUrl } from '../lib/seoUtils';
import { useProductStock } from '../hooks/useProductStock';

interface ProductCardProps {
  key?: React.Key | string | number;
  product: any;
  showSizes?: boolean;
}

export default React.memo(function ProductCard({ product, showSizes = false }: ProductCardProps) {
  const currencySymbol = useSettingsStore(state => state.currencySymbol);
  const addItem = useCartStore(state => state.addItem);

  const {
    availableSizes,
    hasSizes,
    isOutOfStock,
    convertedPrice,
    currentSize,
    setSelectedSize
  } = useProductStock(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) return;

    addItem({
      ...product,
      cartItemId: currentSize ? `${product.id}-${currentSize}` : product.id,
      selectedSize: currentSize,
      quantity: 1
    });
  };



  return (
    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-outline-variant/20 group flex flex-col h-full">
      <Link to={`/producto/${product.id}`} className="aspect-square relative overflow-hidden bg-surface-container p-4 flex items-center justify-center">
        <img 
          src={getSEOImageUrl(product.image_url) || `https://picsum.photos/seed/${product.id}/500/500`} 
          alt={product.title} 
          referrerPolicy="no-referrer" 
          className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''}`} 
        />
        <div className="absolute top-3 left-3 bg-secondary-container/80 backdrop-blur-sm text-on-secondary-container px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          {product.category}
        </div>
        {product.isFeatured && (
          <div className="absolute top-3 right-3 bg-primary text-on-primary px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
            Destacado
          </div>
        )}
      </Link>
      
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/producto/${product.id}`}>
          <h3 className="font-headline font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1" title={product.title}>
            {product.title}
          </h3>
        </Link>
        <p className="text-sm text-on-surface-variant mb-4 line-clamp-2 flex-grow">
          {product.description}
        </p>

        <div className="mt-auto space-y-4">
          {showSizes && hasSizes && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Talla:</span>
              <select 
                value={currentSize} 
                onChange={(e) => setSelectedSize(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface-container-high border border-outline-variant text-xs rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-primary transition-colors"
              >
                {availableSizes.map((sz: string) => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </div>
          )}

          {isOutOfStock && (
            <div className="text-error text-[10px] font-black text-center bg-error/10 py-2 rounded-xl uppercase tracking-widest border border-error/20">
              Agotado temporalmente
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-bold text-xl text-primary">
              {currencySymbol}{convertedPrice}
            </span>
            <button 
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
              title="Añadir al carrito"
            >
              <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
