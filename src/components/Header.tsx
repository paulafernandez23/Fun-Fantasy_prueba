import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';

export default function Header() {
  const language = useSettingsStore(state => state.language);
  const setLanguage = useSettingsStore(state => state.setLanguage);
  const t = translations[language];

  const mainCurrency = useSettingsStore(state => state.mainCurrency);
  const displayCurrency = useSettingsStore(state => state.displayCurrency);
  const setDisplayCurrency = useSettingsStore(state => state.setDisplayCurrency);
  const isDarkMode = useSettingsStore(state => state.isDarkMode);
  const toggleDarkMode = useSettingsStore(state => state.toggleDarkMode);
  
  const items = useCartStore(state => state.items);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined filled-icon text-primary text-3xl">auto_awesome</span>
          <span className="font-headline font-bold text-xl text-primary">Fun Fantasy</span>
        </Link>
        
        <nav className="hidden md:flex gap-6">
          <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors font-medium">{t.nav.home}</Link>
          <Link to="/cartas" className="text-on-surface-variant hover:text-primary transition-colors font-medium">{t.nav.tcg}</Link>
          <Link to="/merchandising" className="text-on-surface-variant hover:text-primary transition-colors font-medium">{t.nav.merch}</Link>
          <Link to="/noticias" className="text-on-surface-variant hover:text-primary transition-colors font-medium">{t.nav.news || 'Noticias'}</Link>
          <Link to="/contacto" className="text-on-surface-variant hover:text-primary transition-colors font-medium">{t.nav.contact}</Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-sm font-medium text-on-surface-variant outline-none cursor-pointer appearance-none hover:text-primary transition-colors"
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
            <select 
              value={displayCurrency} 
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="bg-transparent text-sm font-medium text-on-surface-variant outline-none cursor-pointer appearance-none hover:text-primary transition-colors"
            >
              <option value="USD ($)">USD</option>
              <option value="EUR (€)">EUR</option>
              <option value="GBP (£)">GBP</option>
            </select>
          </div>
          
          <button onClick={toggleDarkMode} className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <Link to="/mi-cuenta" className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">account_circle</span>
          </Link>

          <Link to="/carrito" className="text-on-surface-variant hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
