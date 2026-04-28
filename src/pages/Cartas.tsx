import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import ProductCard from '../components/ProductCard';
import { updateMetaTags } from '../lib/seoUtils';

export default function Cartas() {
  const language = useSettingsStore(state => state.language);
  const t = translations[language];
  const [searchParams] = useSearchParams();
  
  const [allCards, setAllCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(t.cards.filterAll);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(9);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const pq = query(collection(db, 'products'), where('type', '==', 'cartas'));
        const pSnap = await getDocs(pq);
        setAllCards(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch categories for this section
        const cq = query(collection(db, 'categories'), where('section', '==', 'cartas'));
        const cSnap = await getDocs(cq);
        const fetchedCats = cSnap.docs
          .map(doc => doc.data().name)
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
      title: 'Cartas TCG Final Fantasy - Colección Completa',
      description: 'Explora nuestra vasta colección de cartas de Final Fantasy TCG. Desde ediciones clásicas hasta las últimas novedades y cartas legendarias.',
      keywords: 'Final Fantasy TCG, Cartas, Coleccionismo, Opus, Mazos, Cartas Raras',
      type: 'website'
    });
  }, []);

  const toggleFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const filteredCards = allCards.filter(card => {
    const matchesTab = activeTab === t.cards.filterAll || card.category === activeTab;
    const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const cardTags = card.tags || [];
    const matchesRarity = selectedRarities.length === 0 || selectedRarities.some(r => cardTags.includes(r));
    const matchesElement = selectedElements.length === 0 || selectedElements.some(e => cardTags.includes(e));
    const matchesExpansion = selectedExpansions.length === 0 || selectedExpansions.includes(card.expansion);
    
    return matchesTab && matchesSearch && matchesRarity && matchesElement && matchesExpansion;
  });

  const availableRarities = ['Común', 'Poco Común', 'Rara', 'Mítica', 'Legendaria', 'L', 'R', 'S', 'H', 'C'].filter(r => 
    allCards.some(card => (card.tags || []).includes(r))
  );
  const availableElements = ['Fuego', 'Agua', 'Tierra', 'Aire', 'Éter', 'Ice', 'Lightning', 'Wind', 'Earth', 'Water', 'Fire', 'Light', 'Dark'].filter(e => 
    allCards.some(card => (card.tags || []).includes(e))
  );
  const availableExpansions = (Array.from(new Set(
    allCards
      .map(card => card.expansion)
      .filter(exp => exp)
  )) as string[]).sort();

  const tabs = [t.cards.filterAll, ...dynamicCategories];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-black text-on-background mb-4 tracking-tight">
          {t.cards.title}
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl">
          Explora nuestra vasta colección de cartas de Final Fantasy. Desde clásicos hasta las ediciones más raras.
        </p>
      </div>

      <div className="mb-10 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-surface-container-low p-6 rounded-3xl border border-outline-variant/30">
        <div className="flex overflow-x-auto pb-2 lg:pb-0 gap-3 w-full lg:w-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-2xl whitespace-nowrap font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105' 
                  : 'bg-surface-container-highest text-on-surface hover:bg-outline-variant/20'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="relative w-full lg:w-96 group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder={t.cards.searchPlaceholder} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30 sticky top-24 shadow-sm">
            <h2 className="font-headline font-bold text-xl mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">filter_list</span>
              Filtros
            </h2>
            
            <div className="space-y-10">
              {availableRarities.length > 0 && (
                <FilterGroup 
                  title={t.cards.rarity} 
                  options={availableRarities} 
                  selected={selectedRarities} 
                  onToggle={(item) => toggleFilter(selectedRarities, setSelectedRarities, item)} 
                />
              )}
              {availableElements.length > 0 && (
                <FilterGroup 
                  title={t.cards.element} 
                  options={availableElements} 
                  selected={selectedElements} 
                  onToggle={(item) => toggleFilter(selectedElements, setSelectedElements, item)} 
                />
              )}
              {availableExpansions.length > 0 && (
                <FilterGroup 
                  title={t.cards.expansion} 
                  options={availableExpansions} 
                  selected={selectedExpansions} 
                  onToggle={(item) => toggleFilter(selectedExpansions, setSelectedExpansions, item)} 
                />
              )}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-8 bg-surface-container-lowest px-6 py-4 rounded-2xl border border-outline-variant/10">
            <span className="text-on-surface-variant font-medium">Mostrando <span className="text-primary font-bold">{filteredCards.length}</span> resultados</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest hidden sm:inline">Ordenar:</span>
              <select className="bg-transparent border-none outline-none font-bold text-primary cursor-pointer">
                <option>Más recientes</option>
                <option>Precio: Menor a Mayor</option>
                <option>Precio: Mayor a Menor</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse bg-surface-container rounded-3xl h-96"></div>
              ))}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-24 bg-surface-container-lowest rounded-[3rem] border-2 border-dashed border-outline-variant/30">
              <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
              </div>
              <h3 className="text-2xl font-bold text-on-surface mb-2">No se encontraron cartas</h3>
              <p className="text-on-surface-variant text-lg">Intenta ajustar los filtros o los términos de búsqueda.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRarities([]);
                  setSelectedElements([]);
                  setSelectedExpansions([]);
                }}
                className="mt-8 px-8 py-3 bg-primary/10 text-primary rounded-full font-bold hover:bg-primary/20 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredCards.slice(0, visibleCount).map((card) => (
                <ProductCard key={card.id} product={card} />
              ))}
            </div>
          )}
          
          {!loading && filteredCards.length > visibleCount && (
            <div className="mt-20 flex flex-col items-center gap-6">
              <p className="text-on-surface-variant font-medium text-center">
                Has visto {Math.min(visibleCount, filteredCards.length)} de {filteredCards.length} cartas
              </p>
              <div className="w-64 h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-700 ease-out" 
                  style={{ width: `${(Math.min(visibleCount, filteredCards.length) / filteredCards.length) * 100}%` }}
                ></div>
              </div>
              <button 
                onClick={() => setVisibleCount(prev => prev + 9)}
                className="px-10 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-bold hover:bg-outline-variant/20 transition-all transform hover:-translate-y-1 border border-outline-variant/50 shadow-sm active:scale-95"
              >
                Cargar más cartas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, options, selected, onToggle }: { title: string, options: string[], selected: string[], onToggle: (item: string) => void }) {
  return (
    <div>
      <h3 className="font-headline font-bold mb-5 text-sm text-on-surface-variant uppercase tracking-[0.2em]">{title}</h3>
      <div className="space-y-4">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-4 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" 
                className="peer hidden" 
                checked={selected.includes(opt)}
                onChange={() => onToggle(opt)}
              />
              <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                selected.includes(opt) 
                  ? 'bg-primary border-primary shadow-lg shadow-primary/20' 
                  : 'border-outline-variant group-hover:border-primary'
              }`}>
                <span className={`material-symbols-outlined text-[18px] transition-all ${
                  selected.includes(opt) ? 'text-on-primary scale-110 opacity-100' : 'scale-0 opacity-0'
                }`}>check</span>
              </div>
            </div>
            <span className={`text-on-surface font-medium transition-colors ${
              selected.includes(opt) ? 'text-primary font-bold' : 'group-hover:text-primary'
            }`}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
