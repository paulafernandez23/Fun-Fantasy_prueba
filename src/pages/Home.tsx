import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, limit, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import ProductCard from '../components/ProductCard';
import { subscribeToNewsletter } from '../lib/chatbot/newsletterService';
import { getSEOImageUrl, updateMetaTags } from '../lib/seoUtils';

import newsBanner from '../assets/ff_news_banner.png';

export default function Home() {
  const language = useSettingsStore(state => state.language);
  const t = translations[language];
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [siteContent, setSiteContent] = useState<any>(null);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    if (!newsletterConsent) {
      setNewsletterStatus('error');
      setNewsletterMessage('Debes aceptar la política de privacidad para suscribirte.');
      return;
    }

    setNewsletterStatus('loading');
    try {
      await subscribeToNewsletter('Invitado', newsletterEmail, true);
      setNewsletterStatus('success');
      setNewsletterMessage('¡Te has suscrito correctamente a nuestra newsletter!');
      setNewsletterEmail('');
      setNewsletterConsent(false);
    } catch (error: any) {
      setNewsletterStatus('error');
      setNewsletterMessage(error.message || 'Hubo un error al suscribirse.');
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Fetch newest products
        const newestQ = query(collection(db, 'products'), limit(20)); // Limit higher to account for filter
        const newestSnap = await getDocs(newestQ);
        const newestData = newestSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(newestData.filter((p: any) => p.category !== 'SIN CATEGORÍA').slice(0, 8));

        // Fetch featured products
        const featuredQ = query(collection(db, 'products'), where('isFeatured', '==', true), limit(20));
        const featuredSnap = await getDocs(featuredQ);
        const featuredData = featuredSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeaturedProducts(featuredData.filter((p: any) => p.category !== 'SIN CATEGORÍA').slice(0, 4));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchContent = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'site_content', 'home'));
        if (docSnap.exists()) {
          setSiteContent(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      }
    };

    fetchProducts();
    fetchContent();
    
    // SEO
    updateMetaTags({
      title: 'Final Fantasy Store - TCG, Merchandising y Coleccionismo',
      description: 'Tu tienda definitiva de Final Fantasy. Encuentra cartas TCG, figuras exclusivas y merchandising oficial. ¡Únete a la mayor comunidad de fans!',
      keywords: 'Final Fantasy, TCG, Merchandising, Cartas coleccionables, Figuras, RPG',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000'
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, search just redirects to cartas or merchandising with the query
      // Better yet, we could have a search results page, but let's stick to the plan
      navigate(`/cartas?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-container/20 to-background"></div>
        <img 
          src={getSEOImageUrl(siteContent?.heroImage) || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000"} 
          alt="Fantasy World" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 scale-105 animate-slow-zoom" 
        />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold mb-6 backdrop-blur-sm border border-primary/20">
            <span className="material-symbols-outlined text-sm">stars</span>
            {t.home.featured}
          </div>
          <h1 className="font-headline text-5xl md:text-8xl font-black text-on-background mb-8 tracking-tight leading-[1.1]">
            {siteContent?.heroTitle || t.home.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-on-surface-variant mb-12 max-w-2xl mx-auto font-medium">
            {siteContent?.heroSubtitle || t.home.heroSubtitle}
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-12 group">
            <input 
              type="text" 
              placeholder={t.cards.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-32 py-5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-xl group-hover:border-outline-variant"
            />
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-3xl group-focus-within:text-primary transition-colors">search</span>
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/cartas" className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 bg-primary text-on-primary rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] transition-all transform hover:-translate-y-1">
              {t.nav.tcg}
            </Link>
            <Link to="/merchandising" className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 bg-surface-container-high text-on-surface rounded-2xl font-bold text-lg hover:bg-surface-container-highest transition-all transform hover:-translate-y-1 border border-outline-variant/50">
              {t.nav.merch}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-16">
            <div className="space-y-2">
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-on-background">{t.home.featured}</h2>
              <div className="h-1.5 w-24 bg-primary rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Latest News CTA or Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-[3rem] overflow-hidden bg-primary p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="relative z-10 max-w-xl text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black text-on-primary mb-6 leading-tight">
              {siteContent?.newsTitle || "¿Buscas las últimas noticias?"}
            </h2>
            <p className="text-on-primary/80 text-xl mb-10 font-medium">
              {siteContent?.newsDescription || "Entérate de los nuevos lanzamientos de TCG y eventos de la comunidad."}
            </p>
            <Link to={siteContent?.newsButtonUrl || "/noticias"} className="inline-flex items-center justify-center px-10 py-5 bg-on-primary text-primary rounded-2xl font-bold text-lg hover:bg-surface transition-all transform hover:scale-105 shadow-2xl">
              {siteContent?.newsButtonText || "Ir a Noticias"}
              <span className="material-symbols-outlined ml-2">newspaper</span>
            </Link>
          </div>
          <div className="relative z-10 w-full max-w-md aspect-video bg-on-primary/10 backdrop-blur-md rounded-3xl border border-on-primary/20 flex items-center justify-center overflow-hidden">
             <img src={getSEOImageUrl(siteContent?.newsBannerImage) || newsBanner} alt="News Preview" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-6xl opacity-50">play_circle</span>
             </div>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-16">
          <div className="space-y-2">
            <h2 className="font-headline text-4xl md:text-5xl font-bold text-on-background">{t.home.newest}</h2>
            <div className="h-1.5 w-24 bg-primary rounded-full"></div>
          </div>
          <Link to="/cartas" className="group flex items-center gap-2 text-primary font-bold hover:underline mb-2">
            {t.common.viewMore}
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-square bg-surface-container rounded-3xl"></div>
                <div className="h-6 bg-surface-container rounded w-3/4"></div>
                <div className="h-4 bg-surface-container rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-surface-container/30 rounded-3xl border-2 border-dashed border-outline-variant">
                <span className="material-symbols-outlined text-5xl text-outline mb-4">inventory_2</span>
                <p className="text-xl text-on-surface-variant font-medium">No hay productos disponibles en este momento.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Newsletter Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-surface-container-lowest relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-3xl mb-8">
            <span className="material-symbols-outlined text-4xl">drafts</span>
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold text-on-surface mb-6">Únete a nuestra Newsletter</h2>
          <p className="text-xl text-on-surface-variant mb-12 max-w-2xl mx-auto leading-relaxed">
            Recibe las últimas noticias, ofertas exclusivas y novedades sobre nuevas cartas y artículos de merchandising de Final Fantasy directamente en tu correo.
          </p>

            <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto relative">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={newsletterStatus === 'loading'}
                  className="flex-1 bg-surface-container px-6 py-4 rounded-full border-2 border-outline-variant/30 focus:border-primary hover:border-primary/30 outline-none transition-all font-medium text-lg"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === 'loading'}
                  className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {newsletterStatus === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Suscribirse
                      <span className="material-symbols-outlined">send</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-start gap-3 px-4 mb-6">
                <div className="flex items-center h-5 mt-1">
                  <input
                    id="newsletter-consent"
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded focus:ring-primary focus:ring-2 transition-all cursor-pointer"
                  />
                </div>
                <label htmlFor="newsletter-consent" className="text-sm text-left text-on-surface-variant cursor-pointer select-none leading-snug">
                  He leído y acepto la <Link to="/politica-privacidad" className="text-primary hover:underline font-bold">política de privacidad</Link> y doy mi consentimiento para el tratamiento de mis datos personales.
                </label>
              </div>
            
            {newsletterStatus === 'success' && (
              <p className="mt-4 text-green-600 dark:text-green-400 font-medium animate-fade-in flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                {newsletterMessage}
              </p>
            )}
            {newsletterStatus === 'error' && (
              <p className="mt-4 text-red-600 dark:text-red-400 font-medium animate-fade-in flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">error</span>
                {newsletterMessage}
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
