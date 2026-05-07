/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Cartas from './pages/Cartas';
import Merchandising from './pages/Merchandising';
import Contacto from './pages/Contacto';
import JuegosMesa from './pages/JuegosMesa';
import Accesorios from './pages/Accesorios';
import Carrito from './pages/Carrito';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';
import Noticias from './pages/Noticias';
import NoticiaDetail from './pages/NoticiaDetail';
import MiCuenta from './pages/MiCuenta';
import Unsubscribe from './pages/Unsubscribe';
import ScrollToTop from './components/ScrollToTop';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from './store/authStore';
import { getLoyaltyByEmail } from './lib/chatbot/loyaltyService';

import AdminRoute from './components/AdminRoute';
import DynamicPage from './pages/DynamicPage';
import FaqPage from './pages/FaqPage';
import CookieBanner from './components/CookieBanner';

export default function App() {
  const isDarkMode = useSettingsStore(state => state.isDarkMode);
  const setUser = useAuthStore(state => state.setUser);
  const setAdmin = useAuthStore(state => state.setAdmin);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const setInitialized = useAuthStore(state => state.setInitialized);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      const handleAuthUpdate = async () => {
        if (user) {
          try {
            // Forzar recarga del token para obtener los claims más recientes
            const tokenResult = await user.getIdTokenResult(true);
            const isUserAdmin = !!tokenResult.claims.admin;
            
            setAdmin(isUserAdmin);
            
            if (user.email) {
              const loyalty = await getLoyaltyByEmail(user.email);
              useAuthStore.getState().setLoyaltyAccount(loyalty);
            }
          } catch (error) {
            console.error("Error verificando claims:", error);
            setAdmin(false);
          }
        } else {
          setAdmin(false);
          useAuthStore.getState().setLoyaltyAccount(null);
        }
      };

      handleAuthUpdate().finally(() => {
        setInitialized(true);
      });
    });
    return () => unsubscribe();
  }, [setUser, setAdmin, setInitialized]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest text-primary">
        <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cartas" element={<Cartas />} />
          <Route path="/merchandising" element={<Merchandising />} />
          <Route path="/juegos-de-mesa" element={<JuegosMesa />} />
          <Route path="/accesorios" element={<Accesorios />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/admin" element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/noticia/:id" element={<NoticiaDetail />} />
          <Route path="/mi-cuenta" element={<MiCuenta />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          {/* Páginas Legales */}
          <Route path="/politica-privacidad" element={<DynamicPage slug="politica-privacidad" title="Política de Privacidad" />} />
          <Route path="/terminos-venta" element={<DynamicPage slug="terminos-venta" title="Términos de Venta" />} />
          <Route path="/envios-devoluciones" element={<DynamicPage slug="envios-devoluciones" title="Envíos y Devoluciones" />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/politica-cookies" element={<DynamicPage slug="politica-cookies" title="Política de Cookies" />} />
          <Route path="/terminos-condiciones" element={<DynamicPage slug="terminos-condiciones" title="Términos y Condiciones" />} />
          <Route path="/politica-devolucion" element={<DynamicPage slug="politica-devolucion" title="Política de Devolución" />} />
          <Route path="/actualizaciones-normativa" element={<DynamicPage slug="actualizaciones-normativa" title="Actualizaciones de Normativa" />} />
        </Routes>
      </Layout>
      <CookieBanner />
    </Router>
  );
}
