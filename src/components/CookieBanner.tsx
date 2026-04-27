import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[9999] animate-in slide-in-from-bottom-10 duration-700">
      <div className="max-w-4xl mx-auto bg-surface-container-highest/95 backdrop-blur-xl border border-outline-variant/30 p-6 md:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">cookie</span>
        </div>
        
        <div className="flex-grow text-center md:text-left">
          <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">Aviso de Cookies 🍪</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Utilizamos cookies propias y de terceros para mejorar tu experiencia de navegación, analizar el tráfico y mostrarte contenido relacionado con Final Fantasy. Al continuar navegando, consideramos que aceptas su uso. Puedes leer más en nuestra <Link to="/politica-cookies" className="text-primary font-bold hover:underline">política de cookies</Link>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <Link 
            to="/politica-cookies"
            className="px-6 py-3 bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-outline-variant/20 transition-all text-center"
          >
            Configurar
          </Link>
          <button 
            onClick={acceptCookies}
            className="px-8 py-3 bg-primary text-on-primary rounded-xl text-sm font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-center"
          >
            Aceptar Todo
          </button>
        </div>
      </div>
    </div>
  );
}
