import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import ProductCard from '../components/ProductCard';
import { updateMetaTags } from '../lib/seoUtils';
import TabSlider from '../components/TabSlider';

export default function Accesorios() {
  const language = useSettingsStore(state => state.language);
  const t = translations[language];

  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(t.cards.filterAll);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(9);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const pq = query(collection(db, 'products'), where('type', '==', 'accesorios'), where('category', '!=', 'SIN CATEGORÍA'));
        const pSnap = await getDocs(pq);
        setAllItems(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch categories for this section
        const cSnap = await getDocs(collection(db, 'categories'));
        const fetchedCats = cSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((cat: any) => cat.section === 'accesorios') 
          .map((cat: any) => cat.name)
          .filter(name => typeof name === 'string' && name.trim() !== '');
        setDynamicCategories(fetchedCats);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // SEO
    updateMetaTags({
      title: 'Accesorios Final Fantasy - Fundas, Tapetes y Más',
      description: 'Protege y mejora tu experiencia de juego con nuestros accesorios de Final Fantasy. Fundas premium, tapetes de juego exclusivos y cajas para mazos.',
      keywords: 'Final Fantasy Accesorios, Fundas de Cartas, Sleeves, Playmats, Tapetes, Deck Box, Dados',
      type: 'website'
    });
  }, []);

  const filteredItems = allItems.filter(item => {
    const matchesTab = activeTab === t.cards.filterAll || item.category === activeTab;
    const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs = [t.cards.filterAll, ...dynamicCategories];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-secondary/20">
          <span className="material-symbols-outlined text-sm">shield</span>
          Protección y Estilo
        </div>
        <h1 className="font-headline text-5xl md:text-6xl font-black text-on-background mb-6 tracking-tight">
          {t.accessories.title}
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
          Todo lo que necesitas para cuidar tu colección. Fundas, tapetes y accesorios de alta calidad para tus partidas.
        </p>
      </div>

      <div className="mb-12 flex flex-col md:flex-row gap-8 justify-between items-center bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/30 shadow-sm relative overflow-hidden">
        <div className="w-full md:flex-1 min-w-0">
          <TabSlider 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            colorVariant="secondary"
          />
        </div>
        
        <div className="relative w-full md:w-80 group shrink-0">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">search</span>
          <input 
            type="text" 
            placeholder={t.accessories.searchPlaceholder} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-surface-container rounded-[2rem] h-[450px]"></div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-lowest rounded-[3rem] border-2 border-dashed border-outline-variant/30">
          <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-outline">category</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">No se encontraron accesorios</h3>
          <p className="text-on-surface-variant text-lg">Vuelve pronto para ver las fundas y tapetes más exclusivos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredItems.slice(0, visibleCount).map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
      
      {!loading && filteredItems.length > visibleCount && (
        <div className="mt-20 flex flex-col items-center gap-6">
          <p className="text-on-surface-variant font-medium">Has visto {Math.min(visibleCount, filteredItems.length)} de {filteredItems.length} productos</p>
          <div className="w-64 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div 
              className="h-full bg-secondary transition-all duration-1000" 
              style={{ width: `${(Math.min(visibleCount, filteredItems.length) / filteredItems.length) * 100}%` }}
            ></div>
          </div>
          <button 
            onClick={() => setVisibleCount(prev => prev + 9)}
            className="px-10 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-bold hover:bg-outline-variant/20 transition-all transform hover:-translate-y-1 border border-outline-variant/50 shadow-sm active:scale-95"
          >
            Cargar más productos
          </button>
        </div>
      )}
    </div>
  );
}
