import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { getSEOImageUrl } from '../lib/seoUtils';

interface ProductCardProps {
  key?: React.Key | string | number;
  product: any;
  showSizes?: boolean;
}

export default function ProductCard({ product, showSizes = false }: ProductCardProps) {
  const currencySymbol = useSettingsStore(state => state.currencySymbol);
  const exchangeRate = useSettingsStore(state => state.exchangeRate);
  const addItem = useCartStore(state => state.addItem);

  const [selectedSize, setSelectedSize] = useState<string>('');

  const sizesObj = product.sizes || {};
  const availableSizes = Object.keys(sizesObj).filter(sz => sizesObj[sz] > 0);
  const hasSizes = availableSizes.length > 0;
  const sizeKeysOriginal = Object.keys(sizesObj);
  const hasNoStockSizes = sizeKeysOriginal.length > 0 && availableSizes.length === 0;

  const currentSize = selectedSize || availableSizes[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasNoStockSizes) return;

    addItem({
      ...product,
      cartItemId: currentSize ? `${product.id}-${currentSize}` : product.id,
      selectedSize: currentSize,
      quantity: 1
    });
  };

  const convertedPrice = (Number(product.price) * exchangeRate).toFixed(2);

  return (
    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-outline-variant/20 group flex flex-col h-full">
      <Link to={`/producto/${product.id}`} className="aspect-square relative overflow-hidden bg-surface-container p-4 flex items-center justify-center">
        <img 
          src={getSEOImageUrl(product.image_url) || `https://picsum.photos/seed/${product.id}/500/500`} 
          alt={product.title} 
          referrerPolicy="no-referrer" 
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
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

          {hasNoStockSizes && (
            <div className="text-error text-[10px] font-bold text-center bg-error/10 py-1 rounded uppercase tracking-widest">
              Agotado
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-bold text-xl text-primary">
              {currencySymbol}{convertedPrice}
            </span>
            <button 
              disabled={hasNoStockSizes}
              onClick={handleAddToCart}
              className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all shadow-sm active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Añadir al carrito"
            >
              <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
