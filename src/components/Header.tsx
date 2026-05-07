import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';

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

  const [categories, setCategories] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'categories')).then(snap => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const navLinks = [
    { to: '/', label: t.nav.home },
    { to: '/cartas', label: t.nav.tcg },
    { to: '/merchandising', label: t.nav.merch },
    { to: '/juegos-de-mesa', label: t.nav.boardgames },
    { to: '/accesorios', label: t.nav.accessories },
    { to: '/noticias', label: t.nav.news || 'Noticias' },
    { to: '/contacto', label: t.nav.contact },
  ];

  return (
    <>
      <header className="glass-panel sticky top-0 z-50 border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined filled-icon text-primary text-3xl">auto_awesome</span>
            <span className="font-headline font-bold text-xl text-primary">Fun Fantasy</span>
          </Link>
          
          <nav className="hidden md:flex gap-6">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className="text-on-surface-variant hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
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

            <button 
              className="md:hidden text-on-surface-variant hover:text-primary transition-colors flex items-center"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMenuOpen(false)} 
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 glass-panel border-l border-outline-variant/30 p-6 flex flex-col gap-8 shadow-2xl animate-fade-in overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="font-headline font-bold text-xl text-primary">Menú</span>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-4">
              {navLinks.map(link => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className="text-lg font-medium text-on-surface-variant hover:text-primary transition-colors py-2 border-b border-outline-variant/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-6 pt-4 mt-auto">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-outline">Ajustes</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-on-surface-variant">Idioma</label>
                    <select 
                      value={language} 
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="bg-surface-container-high rounded-lg px-3 py-2 text-sm font-medium text-on-surface outline-none cursor-pointer hover:bg-surface-container-highest transition-colors"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-on-surface-variant">Moneda</label>
                    <select 
                      value={displayCurrency} 
                      onChange={(e) => setDisplayCurrency(e.target.value)}
                      className="bg-surface-container-high rounded-lg px-3 py-2 text-sm font-medium text-on-surface outline-none cursor-pointer hover:bg-surface-container-highest transition-colors"
                    >
                      <option value="USD ($)">USD</option>
                      <option value="EUR (€)">EUR</option>
                      <option value="GBP (£)">GBP</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <span className="text-sm font-medium text-on-surface-variant">Modo Oscuro</span>
                <button 
                  onClick={toggleDarkMode} 
                  className="w-12 h-6 rounded-full bg-primary/20 relative transition-colors"
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-300 flex items-center justify-center ${isDarkMode ? 'translate-x-6 bg-primary' : 'bg-outline-variant'}`}>
                    <span className="material-symbols-outlined text-[10px] text-on-primary">
                      {isDarkMode ? 'dark_mode' : 'light_mode'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

