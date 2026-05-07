import { useState, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function useProductStock(product: any, initialSize?: string) {
  const exchangeRate = useSettingsStore(state => state.exchangeRate);
  
  const [selectedSize, setSelectedSize] = useState<string>(initialSize || '');

  const stockInfo = useMemo(() => {
    if (!product) {
      return {
        availableSizes: [],
        hasSizes: false,
        isOutOfStock: true,
        convertedPrice: '0.00'
      };
    }

    const sizesObj = product.sizes || {};
    const availableSizes = Object.keys(sizesObj).filter(sz => sizesObj[sz] > 0);
    const hasSizes = Object.keys(sizesObj).length > 0;
    
    const isOutOfStock = (hasSizes && availableSizes.length === 0) || (!hasSizes && Number(product.stock) <= 0);
    
    const convertedPrice = (Number(product.price) * exchangeRate).toFixed(2);

    return {
      availableSizes,
      hasSizes,
      isOutOfStock,
      convertedPrice
    };
  }, [product, exchangeRate]);

  // Derived current size (either user selected or the first available)
  const currentSize = selectedSize || (stockInfo.availableSizes.length > 0 ? stockInfo.availableSizes[0] : '');

  return {
    ...stockInfo,
    selectedSize,
    currentSize,
    setSelectedSize
  };
}
