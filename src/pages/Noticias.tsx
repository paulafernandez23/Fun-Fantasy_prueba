import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { updateMetaTags } from '../lib/seoUtils';

export default function Noticias() {
  const language = useSettingsStore(state => state.language);
  const t = translations[language];

  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todas');
  const [visibleCount, setVisibleCount] = useState(6);

  const toDate = (date: any) => {
    if (!date) return new Date();
    if (typeof date.toDate === 'function') return date.toDate();
    return new Date(date);
  };

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        // Usamos 'published_at' que es el campo que guarda el Admin
        const q = query(collection(db, 'news'), orderBy('published_at', 'desc'));
        const snapshot = await getDocs(q);
        setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();

    // SEO
    updateMetaTags({
      title: 'Noticias Final Fantasy - TCG, Eventos y Lanzamientos',
      description: 'Mantente al día con las últimas noticias del mundo de Final Fantasy. Lanzamientos de TCG, eventos de la comunidad, torneos y mucho más.',
      keywords: 'Noticias Final Fantasy, TCG News, Eventos FF, Torneos Cartas',
      type: 'website'
    });
  }, []);

  const categories = ['Todas', 'Lanzamientos', 'Eventos', 'Torneos', 'Comunidad', 'General'];

  const filteredNews = filter === 'Todas' 
    ? news 
    : news.filter(item => item.category === filter);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-16 text-center">
        <h1 className="font-headline text-5xl md:text-6xl font-black text-on-background mb-6 tracking-tight">
          {t.news.title}
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
          {t.news.subtitle}
        </p>
      </div>

      <div className="mb-12 flex overflow-x-auto pb-4 gap-3 justify-center hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-8 py-3 rounded-2xl whitespace-nowrap font-bold transition-all ${
              filter === cat 
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105' 
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-surface-container rounded-[2.5rem] h-[500px]"></div>
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-lowest rounded-[3rem] border-2 border-dashed border-outline-variant/30">
          <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-outline">newspaper</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">{t.news.noNews}</h3>
          <p className="text-on-surface-variant text-lg">Vuelve pronto para enterarte de todo lo que ocurre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredNews.slice(0, visibleCount).map((item) => (
            <article key={item.id} className="bg-surface-container-lowest rounded-[2.5rem] overflow-hidden border border-outline-variant/20 group flex flex-col hover:shadow-xl transition-all duration-500">
              <Link to={`/noticia/${item.id}`} className="aspect-video relative overflow-hidden">
                <img 
                  src={item.image_url || `https://picsum.photos/seed/news-${item.id}/800/600`} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-md text-on-primary px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  {item.category}
                </div>
              </Link>
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-3 text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {toDate(item.published_at || item.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <Link to={`/noticia/${item.id}`}>
                  <h2 className="font-headline font-bold text-2xl mb-4 group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h2>
                </Link>
                <p className="text-on-surface-variant mb-8 line-clamp-3 leading-relaxed">
                  {item.content.replace(/<[^>]*>/g, '')}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {(!item.author || item.author.includes('@')) ? 'F' : item.author[0]}
                    </div>
                    <span className="text-xs font-bold text-on-surface">{(!item.author || item.author.includes('@')) ? 'Fun Fantasy' : item.author}</span>
                  </div>
                  <Link 
                    to={`/noticia/${item.id}`} 
                    className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest hover:gap-3 transition-all"
                  >
                    {t.news.readMore}
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && filteredNews.length > visibleCount && (
        <div className="mt-20 flex flex-col items-center gap-6">
          <p className="text-on-surface-variant font-medium">Has visto {Math.min(visibleCount, filteredNews.length)} de {filteredNews.length} noticias</p>
          <div className="w-64 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ width: `${(Math.min(visibleCount, filteredNews.length) / filteredNews.length) * 100}%` }}
            ></div>
          </div>
          <button 
            onClick={() => setVisibleCount(prev => prev + 6)}
            className="px-10 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-bold hover:bg-outline-variant/20 transition-all transform hover:-translate-y-1 border border-outline-variant/50 shadow-sm active:scale-95"
          >
            Cargar más noticias
          </button>
        </div>
      )}
    </div>
  );
}
