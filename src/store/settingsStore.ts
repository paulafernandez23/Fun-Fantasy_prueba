import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  storeName: string;
  contactEmail: string;
  shortDescription: string;
  mainCurrency: string; // The base currency set by the admin
  defaultTax: string;
  
  displayCurrency: string; // The currency selected by the user to display
  currencySymbol: string;  // The symbol for the displayCurrency
  exchangeRate: number;    // Multiplier to convert from mainCurrency to displayCurrency
  
  isDarkMode: boolean;
  language: 'es' | 'en';
  toggleDarkMode: () => void;
  updateSettings: (settings: Partial<SettingsStore>) => void;
  setDisplayCurrency: (currency: string) => void;
  setLanguage: (lang: 'es' | 'en') => void;
}

const getSymbol = (currency: string) => {
  if (currency.includes('€')) return '€';
  if (currency.includes('£')) return '£';
  return '$';
};

const getCurrencyRatio = (currency: string) => {
  if (currency.includes('€')) return 0.92; // 1 USD = 0.92 EUR
  if (currency.includes('£')) return 0.79; // 1 USD = 0.79 GBP
  return 1.0; // Base: USD
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      storeName: 'Fun Fantasy',
      contactEmail: 'soporte@funfantasy.com',
      shortDescription: 'Un espacio dedicado a la venta de cartas y merchandising de Final Fantasy.',
      mainCurrency: 'EUR (€)',
      defaultTax: '21',
      displayCurrency: 'EUR (€)',
      currencySymbol: '€',
      exchangeRate: 1.0,
      isDarkMode: false,
      language: 'es',
      toggleDarkMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        if (newMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { isDarkMode: newMode };
      }),
      updateSettings: (settings) => set((state) => {
         const newSettings = { ...state, ...settings };
         if (settings.mainCurrency !== undefined) {
             const storeRatio = getCurrencyRatio(newSettings.mainCurrency);
             const displayRatio = getCurrencyRatio(newSettings.displayCurrency);
             newSettings.exchangeRate = displayRatio / storeRatio;
         }
         return newSettings;
      }),
      setDisplayCurrency: (currency) => set((state) => {
         const storeRatio = getCurrencyRatio(state.mainCurrency);
         const displayRatio = getCurrencyRatio(currency);
         return {
           displayCurrency: currency,
           currencySymbol: getSymbol(currency),
           exchangeRate: displayRatio / storeRatio
         };
      }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'ecommerce-settings' }
  )
);
