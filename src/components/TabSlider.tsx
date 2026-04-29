import React, { useRef, useState, useEffect } from 'react';

interface TabSliderProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  colorVariant?: 'primary' | 'secondary';
}

export default function TabSlider({ tabs, activeTab, onTabChange, colorVariant = 'primary' }: TabSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    // Pequeño delay para asegurar que el DOM ha renderizado las tabs
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [tabs]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative flex items-center w-full overflow-hidden group/slider">
      {/* Botón Izquierda */}
      {showLeftArrow && (
        <div className="absolute left-0 z-10 h-full flex items-center pr-12 bg-gradient-to-r from-surface-container-low via-surface-container-low/80 to-transparent pointer-events-none">
          <button
            onClick={() => scroll('left')}
            className="w-10 h-10 flex items-center justify-center bg-surface-container-highest text-primary rounded-full shadow-lg border border-outline-variant/30 hover:scale-110 active:scale-95 transition-all pointer-events-auto"
            aria-label="Desplazar a la izquierda"
          >
            <span className="material-symbols-outlined font-black text-xl">chevron_left</span>
          </button>
        </div>
      )}

      {/* Contenedor de Tabs */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex overflow-x-auto gap-3 py-2 px-1 hide-scrollbar w-full scroll-smooth"
      >
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-8 py-3 rounded-2xl whitespace-nowrap font-bold transition-all shrink-0 ${
              activeTab === tab 
                ? colorVariant === 'primary'
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105'
                  : 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20 scale-105'
                : 'bg-surface-container-highest text-on-surface hover:bg-outline-variant/20 border border-outline-variant/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Botón Derecha */}
      {showRightArrow && (
        <div className="absolute right-0 z-10 h-full flex items-center pl-12 bg-gradient-to-l from-surface-container-low via-surface-container-low/80 to-transparent pointer-events-none">
          <button
            onClick={() => scroll('right')}
            className="w-10 h-10 flex items-center justify-center bg-surface-container-highest text-primary rounded-full shadow-lg border border-outline-variant/30 hover:scale-110 active:scale-95 transition-all pointer-events-auto"
            aria-label="Desplazar a la derecha"
          >
            <span className="material-symbols-outlined font-black text-xl">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
