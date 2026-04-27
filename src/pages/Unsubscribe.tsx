import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { unsubscribeFromNewsletter } from '../lib/chatbot/newsletterService';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando tu solicitud...');

  useEffect(() => {
    const processUnsubscribe = async () => {
      if (!email) {
        setStatus('error');
        setMessage('No se ha proporcionado ningún correo electrónico.');
        return;
      }

      try {
        await unsubscribeFromNewsletter(email);
        setStatus('success');
        setMessage('Te has dado de baja de la newsletter correctamente.');
      } catch (err: any) {
        // If it's already unsubscribed, we can just show success or the specific error
        if (err.message.includes('No se encuentra suscrito') || err.message.includes('not found')) {
          setStatus('success');
          setMessage('Este correo ya no está suscrito a nuestra newsletter.');
        } else {
          setStatus('error');
          setMessage('Hubo un error al procesar tu baja. Es posible que el correo no esté suscrito.');
        }
      }
    };

    processUnsubscribe();
  }, [email]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 animate-fade-in">
      <div className="w-full max-w-md text-center">
        <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[3rem] border border-outline-variant/30 shadow-2xl shadow-black/5">
          
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Procesando baja</h1>
              <p className="text-on-surface-variant">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">¡Baja completada!</h1>
              <p className="text-on-surface-variant mb-8">{message}</p>
              
              <Link 
                to="/"
                className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-all active:scale-95 inline-flex items-center gap-2"
              >
                Volver a la tienda
                <span className="material-symbols-outlined">home</span>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl">error</span>
              </div>
              <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Error</h1>
              <p className="text-on-surface-variant mb-8">{message}</p>
              
              <Link 
                to="/"
                className="px-8 py-4 bg-surface-container text-on-surface rounded-full font-bold hover:bg-surface-container-high transition-all active:scale-95 inline-flex items-center gap-2"
              >
                Volver a la tienda
                <span className="material-symbols-outlined">home</span>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
