import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { Link } from 'react-router-dom';
import { addDoc, collection, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateMetaTags } from '../lib/seoUtils';
import { sendContactNotification } from '../lib/emailService';

export default function Contacto() {
  const isDarkMode = useSettingsStore(state => state.isDarkMode);
  const language = useSettingsStore(state => state.language);
  const t = translations[language];

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [siteContent, setSiteContent] = useState<any>(null);

  useEffect(() => {
    updateMetaTags({
      title: 'Contacto | Final Fantasy Store',
      description: '¿Tienes dudas sobre cartas TCG o merchandising de Final Fantasy? Contacta con nuestro equipo de expertos. Estamos en Murcia, España.',
      keywords: 'Contacto, Soporte, Final Fantasy Store, Murcia, Ayuda TCG'
    });

    const fetchContent = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'site_content', 'contacto'));
        if (docSnap.exists()) {
          setSiteContent(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching contact content:', error);
      }
    };
    fetchContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    if (!consentAccepted) {
      setError('Debes aceptar la política de privacidad antes de enviar el mensaje.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // 1. Guardar mensaje en Firestore
      await addDoc(collection(db, 'contact_messages'), {
        ...formData,
        timestamp: new Date().toISOString(),
        read: false,
        consentGiven: true,
        consentDate: Timestamp.now()
      });

      // 2. Notificar al administrador por email
      try {
        await sendContactNotification({
          name: `${formData.name} ${formData.lastName}`,
          email: formData.email,
          message: formData.message
        });
      } catch (emailErr) {
        console.error('Error sending email notification:', emailErr);
        // We don't fail the whole operation if email fails, as it's already in Firestore
      }

      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', lastName: '', email: '', message: '' });
      
      setTimeout(() => setSubmitted(false), 8000);
    } catch (err: any) {
      console.error('Error al enviar el mensaje:', err);
      setError('Lo sentimos, ha ocurrido un error al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-16 text-center">
        <h1 className="font-headline text-5xl md:text-6xl font-black text-on-background mb-6 tracking-tight">
          {siteContent?.title || t.contact.title}
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
          ¿Tienes alguna duda sobre nuestras cartas o merchandising? Estamos aquí para ayudarte a completar tu colección.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-blue-50/30 dark:bg-blue-500/5 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-500/20 group hover:border-blue-500/50 transition-colors shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">mail</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-900/40 dark:text-blue-100/40">Email</h3>
            </div>
            <p className="text-xl font-bold text-on-surface">{siteContent?.email || 'soporte@esfantasia.es'}</p>
            <p className="text-sm text-on-surface-variant mt-2">Te responderemos en menos de 24h.</p>
          </div>

          <div className="bg-emerald-50/30 dark:bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-500/20 group hover:border-emerald-500/50 transition-colors shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">phone</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-900/40 dark:text-emerald-100/40">Teléfono</h3>
            </div>
            <p className="text-xl font-bold text-on-surface">{siteContent?.phone || '+34 602 413 055'}</p>
            <p className="text-sm text-on-surface-variant mt-2">Lunes a Viernes, 9:00h - 14:00h.</p>
          </div>

          <div className="bg-orange-50/30 dark:bg-orange-500/5 p-8 rounded-[2.5rem] border border-orange-100 dark:border-orange-500/20 group hover:border-orange-500/50 transition-colors shadow-sm overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-orange-900/40 dark:text-orange-100/40">Ubicación</h3>
              </div>
              <p className="text-xl font-bold text-on-surface">{siteContent?.location || 'Murcia, España'}</p>
            </div>
            <div className="mt-6 h-48 rounded-3xl overflow-hidden border border-outline-variant/20 grayscale hover:grayscale-0 transition-all duration-700">
              <iframe 
                title="Ubicación"
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: isDarkMode ? 'invert(90%) hue-rotate(180deg)' : 'none' }} 
                src={`https://www.google.com/maps?q=${encodeURIComponent(siteContent?.location || 'Murcia, España')}&output=embed`}
              ></iframe>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-8">
          <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[3rem] border border-outline-variant/30 shadow-xl shadow-black/5 group hover:border-primary/50 transition-all duration-300">
            {submitted ? (
              <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-5xl text-primary">check_circle</span>
                </div>
                <h3 className="text-3xl font-headline font-black text-on-background mb-4">
                  {t.contact.success}
                </h3>
                <p className="text-on-surface-variant text-lg max-w-md">
                  Hemos recibido tu mensaje correctamente. Nuestro equipo de soporte lo revisará y te contactará muy pronto.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-10 px-8 py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-outline-variant/20 transition-all"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">
                      {t.contact.name}
                    </label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="Squall"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">
                      Apellidos
                    </label>
                    <input 
                      required
                      type="text" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="Leonhart"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">
                    {t.contact.email}
                  </label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                    placeholder="seeD@balamb.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">
                    ¿En qué podemos ayudarte?
                  </label>
                  <textarea 
                    required
                    rows={13}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-surface-container-low px-6 py-4 rounded-2xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium resize-none"
                    placeholder="Escribe tu mensaje aquí..."
                  ></textarea>
                </div>

                <div className="flex items-start gap-3 px-4">
                  <div className="flex items-center h-5 mt-1">
                    <input
                      id="legal-consent"
                      type="checkbox"
                      required
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="w-4 h-4 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary focus:ring-2 transition-all cursor-pointer"
                    />
                  </div>
                  <label htmlFor="legal-consent" className="text-sm text-on-surface-variant cursor-pointer select-none leading-snug">
                    He leído y acepto la <Link to="/politica-privacidad" className="text-primary hover:underline font-bold">política de privacidad</Link> y doy mi consentimiento para el tratamiento de mis datos personales según lo establecido por el RGPD.
                  </label>
                </div>

                {error && (
                  <div className="bg-error/10 text-error p-4 rounded-2xl text-sm font-bold flex items-center gap-3">
                    <span className="material-symbols-outlined">error</span>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {t.contact.send}
                      <span className="material-symbols-outlined">send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
