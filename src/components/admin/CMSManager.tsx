import React, { useState } from 'react';
import { db, storage } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { translations } from '../../lib/translations';

interface CMSManagerProps {
  initialCMS: Record<string, any>;
  language: 'es' | 'en';
}

export default function CMSManager({ initialCMS, language }: CMSManagerProps) {
  const [localCMS, setLocalCMS] = useState(initialCMS);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'contacto'>('home');

  const t = translations[language];

  const handleSave = async (pageId: string) => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await setDoc(doc(db, 'site_content', pageId), localCMS[pageId], { merge: true });
      setFeedback({ type: 'success', message: `Contenido de ${pageId} guardado correctamente` });
    } catch (err) {
      console.error("Error saving CMS content:", err);
      setFeedback({ type: 'error', message: 'Error al guardar el contenido' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (pageId: string, field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storageRef = ref(storage, `cms/${pageId}_${field}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLocalCMS({
        ...localCMS,
        [pageId]: { ...localCMS[pageId], [field]: url }
      });
    } catch (err) {
      console.error("Error uploading CMS image:", err);
    }
  };

  const homeData = localCMS.home || {};
  const contactData = localCMS.contacto || {};

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Contenido Web</h2>
        <div className="flex bg-surface-container-high p-1 rounded-2xl border border-outline-variant">
          <button 
            onClick={() => setActiveSubTab('home')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeSubTab === 'home' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
          >
            Página de Inicio
          </button>
          <button 
            onClick={() => setActiveSubTab('contacto')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeSubTab === 'contacto' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
          >
            Contacto
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          <span className="material-symbols-outlined">
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Editor Form */}
        <div className="space-y-8 bg-surface-container-low p-8 rounded-3xl border border-outline-variant">
          {activeSubTab === 'home' ? (
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">home</span>
                Editar Inicio (Hero)
              </h3>
              
              <div className="space-y-4">
                <label className="block text-sm font-bold">Título Principal (Hero)</label>
                <input 
                  type="text" 
                  value={homeData.heroTitle ?? ''}
                  placeholder={t.home.heroTitle}
                  onChange={e => setLocalCMS({...localCMS, home: {...homeData, heroTitle: e.target.value}})}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                />
                <p className="text-[10px] text-on-surface-variant italic">Default: {t.home.heroTitle}</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold">Subtítulo (Hero)</label>
                <textarea 
                  rows={3}
                  value={homeData.heroSubtitle ?? ''}
                  placeholder={t.home.heroSubtitle}
                  onChange={e => setLocalCMS({...localCMS, home: {...homeData, heroSubtitle: e.target.value}})}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                />
                <p className="text-[10px] text-on-surface-variant italic">Default: {t.home.heroSubtitle}</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold">Imagen de Fondo (Hero)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => handleImageUpload('home', 'heroImage', e)}
                    className="hidden" 
                    id="hero-image-upload" 
                  />
                  <label 
                    htmlFor="hero-image-upload"
                    className="flex-1 px-4 py-3 bg-surface-container-lowest border border-outline-variant border-dashed rounded-xl cursor-pointer hover:bg-surface-container-highest flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">cloud_upload</span>
                    Subir Nueva Imagen
                  </label>
                  {homeData.heroImage && (
                    <button 
                      onClick={() => setLocalCMS({...localCMS, home: {...homeData, heroImage: ''}})}
                      className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={() => handleSave('home')}
                disabled={isSaving}
                className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">{isSaving ? 'sync' : 'save'}</span>
                {isSaving ? 'Guardando...' : 'Guardar Cambios de Inicio'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">contact_support</span>
                Editar Página de Contacto
              </h3>
              
              <div className="space-y-4">
                <label className="block text-sm font-bold">Título de la Página</label>
                <input 
                  type="text" 
                  value={contactData.title ?? ''}
                  placeholder={t.contact.title}
                  onChange={e => setLocalCMS({...localCMS, contacto: {...contactData, title: e.target.value}})}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="block text-sm font-bold">Email de Soporte</label>
                  <input 
                    type="email" 
                    value={contactData.email ?? ''}
                    onChange={e => setLocalCMS({...localCMS, contacto: {...contactData, email: e.target.value}})}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-bold">Teléfono</label>
                  <input 
                    type="text" 
                    value={contactData.phone ?? ''}
                    onChange={e => setLocalCMS({...localCMS, contacto: {...contactData, phone: e.target.value}})}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold">Ubicación (Ciudad/País)</label>
                <input 
                  type="text" 
                  value={contactData.location ?? ''}
                  onChange={e => setLocalCMS({...localCMS, contacto: {...contactData, location: e.target.value}})}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                />
              </div>

              <button 
                onClick={() => handleSave('contacto')}
                disabled={isSaving}
                className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">{isSaving ? 'sync' : 'save'}</span>
                {isSaving ? 'Guardando...' : 'Guardar Cambios de Contacto'}
              </button>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Vista Previa Real-Time</h3>
            <span className="material-symbols-outlined text-primary">visibility</span>
          </div>
          
          <div className="bg-background rounded-[2rem] border-8 border-surface-container-high shadow-2xl overflow-hidden aspect-[9/16] md:aspect-video relative group">
            {activeSubTab === 'home' ? (
              <div className="h-full w-full relative flex items-center justify-center p-8 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background/80"></div>
                <img 
                  src={homeData.heroImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000"} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" 
                />
                <div className="relative z-10 space-y-4">
                  <h1 className="text-3xl md:text-5xl font-black text-on-background leading-tight">
                    {homeData.heroTitle || t.home.heroTitle}
                  </h1>
                  <p className="text-sm md:text-lg text-on-surface-variant max-w-md mx-auto">
                    {homeData.heroSubtitle || t.home.heroSubtitle}
                  </p>
                  <div className="pt-4 flex justify-center">
                    <div className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-widest">
                      {t.home.shopNow}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full w-full bg-surface p-8 flex flex-col items-center justify-center text-center space-y-6">
                <h1 className="text-3xl font-black">{contactData.title || t.contact.title}</h1>
                <div className="space-y-4 w-full max-w-sm">
                  <div className="flex items-center gap-4 p-4 bg-surface-container rounded-2xl">
                    <span className="material-symbols-outlined text-primary">mail</span>
                    <span className="font-medium text-sm">{contactData.email || 'soporte@esfantasia.es'}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-surface-container rounded-2xl">
                    <span className="material-symbols-outlined text-primary">phone</span>
                    <span className="font-medium text-sm">{contactData.phone || '+34 602 413 055'}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-surface-container rounded-2xl">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <span className="font-medium text-sm">{contactData.location || 'Murcia, España'}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md text-[10px] text-white rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              MOCKUP DE PÁGINA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
