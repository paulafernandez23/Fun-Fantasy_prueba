import { Link } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';

export default function Footer() {
  const language = useSettingsStore(state => state.language);
  const t = translations[language];
  const config = useSettingsStore();

  return (
    <footer className="bg-surface-container-high py-16 border-t border-outline-variant/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1">
            <Link to="/" className="font-headline italic text-xl text-primary font-bold mb-4 block">Fun Fantasy</Link>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {config.shortDescription || 'Un espacio dedicado a la venta de cartas y merchandising de Final Fantasy.'}
            </p>
            <div className="mt-6 space-y-2 text-sm text-on-surface-variant">
               <p className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">phone</span>
                 +34 602 41 30 55
               </p>
               <p className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">mail</span>
                 {config.contactEmail}
               </p>
               <p className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">location_on</span>
                 Murcia, España
               </p>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-on-background">{t.footer.explore || 'Explora'}</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant">
              <li><Link to="/" className="hover:text-primary transition-colors">{t.nav.home}</Link></li>
              <li><Link to="/cartas" className="hover:text-primary transition-colors">{t.nav.tcg}</Link></li>
              <li><Link to="/merchandising" className="hover:text-primary transition-colors">{t.nav.merch}</Link></li>
              <li><Link to="/noticias" className="hover:text-primary transition-colors">{t.nav.news || 'Noticias'}</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-on-background">{t.footer.help || 'Ayuda'}</h4>
            <ul className="space-y-4 text-sm text-on-surface-variant">
              <li><Link to="/contacto" className="hover:text-primary transition-colors">{t.nav.contact}</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">Preguntas Frecuentes (FAQ)</Link></li>
              <li><Link to="/politica-privacidad" className="hover:text-primary transition-colors">{t.footer.privacy || 'Privacidad'}</Link></li>
              <li><Link to="/terminos-venta" className="hover:text-primary transition-colors">{t.footer.terms || 'Términos'}</Link></li>
              <li><Link to="/envios-devoluciones" className="hover:text-primary transition-colors">{t.footer.shipping || 'Envíos'}</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-on-background">{t.footer.followUs || 'Síguenos'}</h4>
            <div className="flex gap-4 text-on-surface-variant">
              <a href="#" className="hover:text-primary transition-colors"><span className="material-symbols-outlined">public</span></a>
              <a href="#" className="hover:text-primary transition-colors"><span className="material-symbols-outlined">photo_camera</span></a>
              <a href="#" className="hover:text-primary transition-colors"><span className="material-symbols-outlined">campaign</span></a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-outline-variant/20 text-xs text-on-surface-variant flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Fun Fantasy. {t.footer.rights || 'Todos los derechos reservados.'}</p>
          <div className="flex gap-6">
            <span className="material-symbols-outlined text-2xl opacity-50">payments</span>
            <span className="material-symbols-outlined text-2xl opacity-50">credit_card</span>
            <span className="material-symbols-outlined text-2xl opacity-50">account_balance_wallet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
