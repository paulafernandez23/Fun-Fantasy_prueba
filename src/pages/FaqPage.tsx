import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateMetaTags } from '../lib/seoUtils';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const language = useSettingsStore(state => state.language);
  const t = translations[language];
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    updateMetaTags({
      title: 'Preguntas Frecuentes (FAQ) | Final Fantasy Store',
      description: 'Encuentra respuestas a las preguntas más frecuentes sobre nuestra tienda, envíos y productos de Final Fantasy.',
      keywords: 'FAQ, Preguntas Frecuentes, Ayuda, Soporte, Final Fantasy Store'
    });
  }, []);

  useEffect(() => {
    const fetchFaqs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'legal_pages', 'faq');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().questions) {
          setFaqs(docSnap.data().questions);
          if (docSnap.data().questions.length > 0) {
            setOpenId(docSnap.data().questions[0].id);
          }
        } else {
          setFaqs([]);
        }
      } catch (err) {
        console.error('Error fetching FAQs:', err);
        setError('Ocurrió un error al cargar las preguntas frecuentes.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaqs();
  }, []);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="mb-12 text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-black text-on-background mb-6 tracking-tight">
          Preguntas Frecuentes (FAQ)
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-6">
          Encuentra rápidamente respuestas a las dudas más comunes de nuestra comunidad.
        </p>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface p-6 rounded-2xl animate-pulse border border-outline-variant/30">
              <div className="h-5 bg-outline-variant/20 rounded w-3/4"></div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-8 bg-surface rounded-3xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-4xl text-error mb-4 block">error</span>
            <p className="text-error">{error}</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-4 block">help_center</span>
            <p className="text-on-surface-variant">No hay preguntas frecuentes publicadas en este momento.</p>
          </div>
        ) : (
          faqs.map((faq) => (
            <div 
              key={faq.id} 
              className={`bg-surface border overflow-hidden transition-all duration-300 ${
                openId === faq.id 
                  ? 'border-primary/50 shadow-md rounded-[2rem]' 
                  : 'border-outline-variant/30 hover:border-outline-variant/60 rounded-2xl'
              }`}
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left focus:outline-none"
                onClick={() => toggleFaq(faq.id)}
              >
                <h3 className={`font-bold pr-8 ${openId === faq.id ? 'text-primary' : 'text-on-surface'}`}>
                  {faq.question}
                </h3>
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  openId === faq.id ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${openId === faq.id ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  openId === faq.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 pt-0">
                  <div className="w-full h-px bg-outline-variant/20 mb-4"></div>
                  <div 
                    className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-on-surface-variant"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
