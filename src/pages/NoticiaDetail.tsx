import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { getSEOImageUrl, updateMetaTags } from '../lib/seoUtils';

export default function NoticiaDetail() {
  const { id } = useParams<{ id: string }>();
  const language = useSettingsStore(state => state.language);
  const t = translations[language];

  const [newsItem, setNewsItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const toDate = (date: any) => {
    if (!date) return new Date();
    if (typeof date.toDate === 'function') return date.toDate();
    return new Date(date);
  };

  useEffect(() => {
    if (!id) return;

    const fetchNewsItem = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'news', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data: any = { id: docSnap.id, ...docSnap.data() };
          setNewsItem(data);
          
          // SEO
          updateMetaTags({
            title: `${data.title} | Noticias Final Fantasy`,
            description: data.content?.replace(/<[^>]*>/g, '').substring(0, 160) || 'Lee la noticia completa en nuestra tienda.',
            image: data.image_url,
            type: 'article'
          });
        }
      } catch (error) {
        console.error('Error fetching news item:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsItem();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-headline font-bold text-on-background mb-4">{t.common.error}</h1>
        <p className="text-on-surface-variant mb-8">La noticia que buscas no existe o ha sido eliminada.</p>
        <Link to="/noticias" className="inline-flex items-center justify-center px-8 py-3 bg-primary text-on-primary rounded-full font-medium transition-transform hover:scale-105">
          Volver a Noticias
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest min-h-screen">
      {/* Hero Header */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img 
          src={getSEOImageUrl(newsItem.image_url) || `https://picsum.photos/seed/news-${id}/1920/1080`} 
          alt={newsItem.title} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-7xl mx-auto w-full">
          <div className="inline-flex px-4 py-1 bg-primary text-on-primary rounded-full text-xs font-black uppercase tracking-widest mb-6">
            {newsItem.category}
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-black text-on-background mb-6 tracking-tight leading-tight">
            {newsItem.title}
          </h1>
          <div className="flex items-center gap-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {toDate(newsItem.published_at || newsItem.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">person</span>
              {(!newsItem.author || newsItem.author.includes('@')) ? 'Fun Fantasy' : newsItem.author}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        <div 
          className="prose prose-xl prose-invert prose-primary max-w-none text-on-surface-variant leading-relaxed"
          dangerouslySetInnerHTML={{ __html: newsItem.content }}
        />
        
        <div className="mt-16 pt-16 border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <span className="text-on-surface-variant font-bold uppercase tracking-widest text-xs">Compartir:</span>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-xl">share</span>
              </button>
              <button className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-xl">link</span>
              </button>
            </div>
          </div>
          
          <Link 
            to="/noticias" 
            className="inline-flex items-center gap-3 px-8 py-4 bg-surface-container-high text-on-surface rounded-2xl font-bold hover:bg-outline-variant/20 transition-all border border-outline-variant/50"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Volver a Noticias
          </Link>
        </div>
      </article>
    </div>
  );
}
