import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateMetaTags } from '../lib/seoUtils';

interface DynamicPageProps {
  slug: string;
  title: string;
}

export default function DynamicPage({ slug, title }: DynamicPageProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateMetaTags({
      title: `${title} | Final Fantasy Store`,
      description: `Información sobre ${title} en Final Fantasy Store.`,
      keywords: `${title}, Final Fantasy Store, Políticas`
    });
  }, [title]);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'legal_pages', slug);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setContent(docSnap.data().content || '');
        } else {
          setContent('<p>El contenido de esta página aún no ha sido publicado. Vuelve más tarde.</p>');
        }
      } catch (err) {
        console.error('Error fetching page content:', err);
        setError('Ocurrió un error al cargar la información.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [slug]);

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="mb-12 text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-black text-on-background mb-6 tracking-tight">
          {title}
        </h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="bg-surface p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-outline-variant/30">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-outline-variant/20 rounded w-3/4"></div>
            <div className="h-4 bg-outline-variant/20 rounded w-full"></div>
            <div className="h-4 bg-outline-variant/20 rounded w-5/6"></div>
            <div className="h-4 bg-outline-variant/20 rounded w-2/3"></div>
            <div className="h-4 bg-outline-variant/20 rounded w-4/5 pt-8"></div>
            <div className="h-4 bg-outline-variant/20 rounded w-full"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-error mb-4 block">error</span>
            <p className="text-error">{error}</p>
          </div>
        ) : (
          <div 
            className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-headline prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl prose-img:shadow-sm"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  );
}
