import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';

// Sub-components
import ProductManager from '../components/admin/ProductManager';
import CategoryManager from '../components/admin/CategoryManager';
import CMSManager from '../components/admin/CMSManager';
import MultimediaManager from '../components/admin/MultimediaManager';

// We'll keep these simpler managers in Admin for now or move them later if requested
// For now, let's focus on the ones the user explicitly mentioned as broken.

function AdminContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const config = useSettingsStore();
  const language = config.language as 'es' | 'en';
  const t = translations[language];

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const productsSnap = await getDocs(collection(db, 'products'));
      setAllProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const ordersSnap = await getDocs(collection(db, 'orders'));
      setAllOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const catsSnap = await getDocs(collection(db, 'categories'));
      setAllCategories(catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const contentSnap = await getDocs(collection(db, 'site_content'));
      const contentMap: Record<string, any> = {};
      contentSnap.docs.forEach(doc => { contentMap[doc.id] = doc.data(); });
      setSiteContent(contentMap);
    } catch (err) {
      console.error("Error loading base admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const totalSales = allOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const lowStockCount = allProducts.filter(p => Number(p.stock) < 5).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-black text-on-background">Panel de Resumen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface-container-high p-6 rounded-3xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">payments</span>
                <p className="text-on-surface-variant font-bold uppercase text-xs tracking-widest">Ventas Totales</p>
                <h3 className="text-3xl font-black">{totalSales.toFixed(2)}€</h3>
              </div>
              <div className="bg-surface-container-high p-6 rounded-3xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-secondary text-4xl mb-4">inventory_2</span>
                <p className="text-on-surface-variant font-bold uppercase text-xs tracking-widest">Productos</p>
                <h3 className="text-3xl font-black">{allProducts.length}</h3>
              </div>
              <div className="bg-surface-container-high p-6 rounded-3xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-red-500 text-4xl mb-4">warning</span>
                <p className="text-on-surface-variant font-bold uppercase text-xs tracking-widest">Stock Bajo</p>
                <h3 className="text-3xl font-black text-red-500">{lowStockCount}</h3>
              </div>
              <div className="bg-surface-container-high p-6 rounded-3xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-cyan-500 text-4xl mb-4">shopping_cart</span>
                <p className="text-on-surface-variant font-bold uppercase text-xs tracking-widest">Pedidos</p>
                <h3 className="text-3xl font-black">{allOrders.length}</h3>
              </div>
            </div>
            {/* Recent Orders Table could go here */}
          </div>
        );
      case 'productos':
        return <ProductManager categories={allCategories} />;
      case 'categorias':
        return <CategoryManager categories={allCategories} onRefresh={loadBaseData} />;
      case 'contenido':
        return <CMSManager initialCMS={siteContent} language={language} />;
      case 'multimedia':
        return <MultimediaManager />;
      default:
        return <div className="p-12 text-center text-on-surface-variant italic">Sección en desarrollo...</div>;
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'productos', icon: 'inventory_2', label: 'Productos' },
    { id: 'categorias', icon: 'category', label: 'Categorías' },
    { id: 'contenido', icon: 'auto_awesome', label: 'Contenido Web' },
    { id: 'multimedia', icon: 'image', label: 'Multimedia' },
    { id: 'pedidos', icon: 'shopping_cart', label: 'Pedidos' },
    { id: 'usuarios', icon: 'group', label: 'Usuarios' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`bg-surface-container-high border-r border-outline-variant transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'} flex flex-col sticky top-0 h-screen`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <span className="font-headline font-black text-xl text-primary tracking-tighter uppercase">Admin Panel</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-surface-container-highest rounded-xl transition-colors">
            <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                  : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {isSidebarOpen && <span className="font-bold">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold"
          >
            <span className="material-symbols-outlined">logout</span>
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto overflow-y-auto h-screen">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : renderContent()}
      </main>
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError('Credenciales incorrectas. Solo el administrador tiene acceso.');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-scale-in">
        <div className="text-center">
          <div className="inline-flex p-4 bg-primary/10 rounded-3xl mb-6">
            <span className="material-symbols-outlined text-5xl text-primary">admin_panel_settings</span>
          </div>
          <h1 className="text-4xl font-black text-on-background tracking-tight">Acceso Admin</h1>
          <p className="text-on-surface-variant mt-2">Gestiona tu tienda Final Fantasy</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface-container-high p-8 rounded-[2.5rem] border border-outline-variant shadow-2xl space-y-6">
          {authError && (
            <div className="p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {authError}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-bold ml-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="admin@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold ml-2">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all transform active:scale-95"
          >
            Entrar al Panel
          </button>
        </form>

        <div className="text-center">
          <Link to="/" className="text-on-surface-variant hover:text-primary font-bold text-sm transition-colors">
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );

  return <AdminContent />;
}
