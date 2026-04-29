import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { auth, db, storage } from '../lib/firebase';
import { getSEOImageUrl } from '../lib/seoUtils';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, query, where, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../lib/translations';
import { getAppointments, updateAppointmentStatus, formatDate, type Appointment } from '../lib/chatbot/appointmentService';
import { getAllSubscribers, type NewsletterSubscriber, unsubscribeFromNewsletter } from '../lib/chatbot/newsletterService';
import { getAllLoyaltyUsers, addPoints, type LoyaltyAccount, getLoyaltyConfig, updateLoyaltyConfig, type LoyaltyConfig, deleteLoyaltyAccount } from '../lib/chatbot/loyaltyService';
import { sendNewsletterEmail } from '../lib/emailService';

function AdminContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orderFilter, setOrderFilter] = useState('Todos los estados');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const config = useSettingsStore();
  const storeSymbol = config.mainCurrency.includes('€') ? '€' : config.mainCurrency.includes('£') ? '£' : '$';

  // Función segura para parsear fechas de Firestore (Timestamp o string)
  const toDate = (date: any) => {
    if (!date) return new Date();
    if (typeof date.toDate === 'function') return date.toDate();
    return new Date(date);
  };

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [allLoyaltyUsers, setAllLoyaltyUsers] = useState<LoyaltyAccount[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);
  const [allSubscribers, setAllSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // New States for Contact Messages and Legal Pages
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageFilter, setMessageFilter] = useState('Todos'); // Todos, Leídos, No Leídos
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  const [legalPages, setLegalPages] = useState<any[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageContent, setEditingPageContent] = useState<any>(null); // Object to hold title, content, or faq questions

  // Newsletter form state
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterContent, setNewsletterContent] = useState('');
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  const [selectedSubscribers, setSelectedSubscribers] = useState<Set<string>>(new Set());
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);
  
  // Search and Filter states
  const [userSearch, setUserSearch] = useState('');
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [stockFilter, setStockFilter] = useState('Todos');

  // New CMS and Categories States
  const [siteContent, setSiteContent] = useState<Record<string, any>>({});
  const [localCMS, setLocalCMS] = useState<Record<string, any>>({ 
    home: { heroTitle: '', heroSubtitle: '', heroImage: '' }, 
    contacto: { title: '', email: '' } 
  });
  const [contentLoading, setContentLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', subcategories: '', section: 'merchandising' }); // section added
  
  // Custom Confirm/Alert Modal State
  const [modal, setModal] = useState<{ show: boolean; title: string; message: string; onConfirm?: () => void; type: 'confirm' | 'alert' }>({
    show: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'bronce': return 'bg-[#CD7F32]/10 text-[#8B4513] border border-[#CD7F32]/20';
      case 'plata': return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'oro': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'cristal': return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      default: return 'bg-secondary/10 text-secondary';
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ show: true, title, message, onConfirm, type: 'confirm' });
  };

  const showAlert = (title: string, message: string) => {
    setModal({ show: true, title, message, type: 'alert' });
  };

  const loadData = async () => {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    setAllOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    const productsSnap = await getDocs(collection(db, 'products'));
    setAllProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    const newsSnap = await getDocs(query(collection(db, 'news'), orderBy('published_at', 'desc')));
    setAllNews(newsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    getAppointments().then(setAllAppointments);
    getLoyaltyConfig().then(setLoyaltyConfig);
    
    // Cargar mensajes para notificaciones
    getDocs(query(collection(db, 'contact_messages'), orderBy('timestamp', 'desc')))
      .then(snap => setAllMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    // Cargar categorías
    getDocs(collection(db, 'categories'))
      .then(snap => setAllCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    // Cargar contenido web
    getDocs(collection(db, 'site_content'))
      .then(snap => {
        const content: Record<string, any> = {};
        snap.docs.forEach(doc => { content[doc.id] = doc.data(); });
        setSiteContent(content);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recargar cuando se accede a la pestaña de citas o usuarios
  useEffect(() => {
    if (activeTab === 'citas') {
      setAppointmentsLoading(true);
      getAppointments()
        .then(setAllAppointments)
        .finally(() => setAppointmentsLoading(false));
    }
    if (activeTab === 'usuarios') {
      setUsersLoading(true);
      Promise.all([getAllSubscribers(), getAllLoyaltyUsers()])
        .then(([subs, users]) => {
          setAllSubscribers(subs);
          setAllLoyaltyUsers(users);
          setSelectedSubscribers(new Set(subs.map(s => s.email)));
        })
        .finally(() => setUsersLoading(false));
    }
    if (activeTab === 'mensajes') {
      // Ya se cargan en loadData, pero podemos refrescar si se desea
      setMessagesLoading(true);
      getDocs(query(collection(db, 'contact_messages'), orderBy('timestamp', 'desc')))
        .then(snap => setAllMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
        .finally(() => setMessagesLoading(false));
    }
    if (activeTab === 'paginas') {
      setPagesLoading(true);
      getDocs(collection(db, 'legal_pages'))
        .then(snap => setLegalPages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
        .finally(() => setPagesLoading(false));
    }
    if (activeTab === 'categorias') {
      setCategoriesLoading(true);
      getDocs(collection(db, 'categories'))
        .then(snap => setAllCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
        .finally(() => setCategoriesLoading(false));
    }
    if (activeTab === 'contenido') {
      setContentLoading(true);
      getDocs(collection(db, 'site_content'))
        .then(snap => {
          const fetched: Record<string, any> = {};
          snap.docs.forEach(d => { fetched[d.id] = d.data(); });
          setSiteContent(fetched);
          
          const siteFallbackHome = {
            heroTitle: translations[config.language].home.heroTitle,
            heroSubtitle: translations[config.language].home.heroSubtitle,
            heroImage: '',
            newsTitle: "¿Buscas las últimas noticias?",
            newsDescription: "Entérate de los nuevos lanzamientos de TCG y eventos de la comunidad.",
            newsButtonText: "Ir a Noticias",
            newsButtonUrl: "/noticias",
            newsBannerImage: ''
          };
          
          const siteFallbackContacto = { 
            title: translations[config.language].contact.title,
            email: "soporte@esfantasia.es",
            phone: "+34 602 413 055",
            location: "Murcia, España",
            address: '',
            schedule: ''
          };
          
          const homeMerged = { ...siteFallbackHome, ...(fetched['home'] || {}) };
          const contactoMerged = { ...siteFallbackContacto, ...(fetched['contacto'] || {}) };
          
          setLocalCMS({ 
            ...fetched, 
            home: homeMerged, 
            contacto: contactoMerged 
          });
        })
        .catch(err => {
          console.error("Error loading site content:", err);
          const t = translations[config.language];
          setLocalCMS({
            home: { heroTitle: t.home.heroTitle, heroSubtitle: t.home.heroSubtitle, heroImage: '' },
            contacto: { title: t.contact.title, email: '', phone: '', location: '' }
          });
        })
        .finally(() => setContentLoading(false));
    }
  }, [activeTab, config.language]);

  // Cálculos derivados de los datos reales
  const totalSales = allOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const ordersToday = allOrders.filter(order => {
    if (!order.created_at) return false;
    try {
      const orderDate = toDate(order.created_at).toISOString().split('T')[0];
      return orderDate === todayStr;
    } catch (e) {
      return false;
    }
  });

  // Cálculo de ventas para la gráfica (últimos 7 días)
  const salesHistory = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayTotal = allOrders.filter(o => {
        if (!o.created_at) return false;
        return toDate(o.created_at).toISOString().split('T')[0] === dayStr;
      }).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      
      days.push({
        date: dayStr,
        display: d.toLocaleDateString(undefined, { weekday: 'short' }),
        total: dayTotal
      });
    }
    return days;
  }, [allOrders]);

  // C├ílculo de categor├¡as para la gr├ífica
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allProducts.forEach(p => {
      stats[p.category] = (stats[p.category] || 0) + 1;
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allProducts]);

  // Productos m├ís vendidos (simulado con pedidos)
  const topProducts = useMemo(() => {
    const counts: Record<string, { title: string, count: number, total: number }> = {};
    allOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (!counts[item.id]) {
          counts[item.id] = { title: item.title, count: 0, total: 0 };
        }
        counts[item.id].count += item.quantity || 1;
        counts[item.id].total += (item.price * (item.quantity || 1));
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allOrders]);

  const maxSale = Math.max(...salesHistory.map(d => d.total), 1);

  const lowStockProducts = allProducts.filter(p => Number(p.stock) < 5);
  
  // Conteo de usuarios únicos (fidelidad + pedidos)
  const uniqueCustomerEmails = new Set([
    ...allLoyaltyUsers.map(u => u.email),
    ...allOrders.map(o => o.customer_email).filter(Boolean)
  ]);

  const pendingAppointments = allAppointments.filter(a => a.status === 'pending');
  const todayAppointments = allAppointments
    .filter(a => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const unreadMessages = allMessages.filter(m => !m.read);

  // Form for New/Edit Product
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ 
    title: '', 
    category: '', 
    subcategory: '',
    price: '', 
    stock: '', 
    type: 'cartas', 
    description: '', 
    tags: '', 
    expansion: '', 
    image_url: '', 
    isFeatured: false, 
    sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } as Record<string, number> 
  });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [productError, setProductError] = useState('');

  const [showAddNews, setShowAddNews] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newNews, setNewNews] = useState({ title: '', category: 'General', excerpt: '', content: '', image_url: '', author: 'Administrador' });
  const [newsImage, setNewsImage] = useState<File | null>(null);
  const [newsError, setNewsError] = useState('');

  const handleSendNewsletter = async () => {
    if (!newsletterSubject.trim() || !newsletterContent.trim()) {
      showAlert('Error', 'Por favor, completa el asunto y el contenido de la newsletter.');
      return;
    }
    if (selectedSubscribers.size === 0) {
      showAlert('Error', 'No hay destinatarios seleccionados.');
      return;
    }

    setIsSendingNewsletter(true);
    try {
      const toAddresses = Array.from(selectedSubscribers) as string[];
      await sendNewsletterEmail(toAddresses, newsletterSubject, newsletterContent);
      setNewsletterSubject('');
      setNewsletterContent('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showAlert('Éxito', 'Newsletter enviada con éxito.');
    } catch (error) {
      console.error('Error enviando newsletter:', error);
      showAlert('Error', 'Error enviando newsletter.');
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  const handleExportSubscribers = () => {
    if (allSubscribers.length === 0) {
      showAlert('Aviso', 'No hay suscriptores para exportar.');
      return;
    }

    const headers = ['Nombre', 'Email', 'Suscrito el', 'Consentimiento', 'Fecha Consentimiento'];
    const rows = allSubscribers.map(sub => [
      sub.name,
      sub.email,
      sub.subscribedAt ? toDate(sub.subscribedAt).toLocaleString() : 'N/A',
      sub.consentGiven ? 'S├ì' : 'NO',
      sub.consentDate ? toDate(sub.consentDate).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `suscriptores_newsletter_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleAddProduct = async () => {
    setIsSaving(true);
    setProductError('');
    try {
      let image_url = newProduct.image_url;
      if (newImage) {
        const fileExt = newImage.name.split('.').pop();
        const slug = slugify(newProduct.title || 'producto');
        const fileName = `${slug}.${fileExt}`;
        const storageRef = ref(storage, `product-images/${fileName}`);
        try {
          await uploadBytes(storageRef, newImage);
          image_url = await getDownloadURL(storageRef);
        } catch (error) {
          console.error(error);
        }
      }

      const tagsArray = newProduct.tags ? newProduct.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      let isClothing = newProduct.category.toLowerCase() === 'ropa';
      let calculatedStock = isClothing 
        ? (Object.values(newProduct.sizes) as number[]).reduce((sum, val) => sum + val, 0)
        : parseInt(newProduct.stock, 10) || 0;

      const payload = {
        title: newProduct.title || 'Producto sin nombre',
        category: newProduct.category || 'General',
        price: parseFloat(newProduct.price) || 0,
        stock: calculatedStock || 0,
        type: newProduct.type || 'cartas',
        description: newProduct.description || '',
        image_url: image_url || '',
        tags: tagsArray,
        expansion: newProduct.type === 'cartas' ? newProduct.expansion : '',
        isFeatured: newProduct.isFeatured || false,
        sizes: isClothing ? newProduct.sizes : {},
        subcategory: newProduct.subcategory || ''
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), payload);
      } else {
        await addDoc(collection(db, 'products'), payload);
      }

      const snapshot = await getDocs(collection(db, 'products'));
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setShowAddProduct(false);
      setEditingProductId(null);
      setNewProduct({ title: '', category: '', subcategory: '', price: '', stock: '', type: 'cartas', description: '', tags: '', expansion: '', image_url: '', isFeatured: false, sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } as Record<string, number> });
      setNewImage(null);
      showAlert('Éxito', 'Producto guardado correctamente.');
    } catch (error: any) {
      console.error(error);
      showAlert('Error', error.message || 'Hubo un error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNews = async () => {
    setIsSaving(true);
    setNewsError('');
    try {
      let finalImageUrl = newNews.image_url;

      if (newsImage) {
        const storageRef = ref(storage, `news/${Date.now()}_${newsImage.name}`);
        await uploadBytes(storageRef, newsImage);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const newsData = {
        title: newNews.title,
        excerpt: newNews.excerpt,
        content: newNews.content,
        category: newNews.category,
        image_url: finalImageUrl,
        published_at: Timestamp.now(),
        author: 'Fun Fantasy',
        readTime: `${Math.ceil(newNews.content.split(' ').length / 200)} min`
      };

      if (editingNewsId) {
        await updateDoc(doc(db, 'news', editingNewsId), newsData);
      } else {
        await addDoc(collection(db, 'news'), newsData);
      }

      const snapshot = await getDocs(query(collection(db, 'news'), orderBy('published_at', 'desc')));
      setAllNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setShowAddNews(false);
      setEditingNewsId(null);
      setNewNews({ title: '', excerpt: '', content: '', category: 'General', image_url: '', author: 'Administrador' });
      setNewsImage(null);
      showAlert('Éxito', 'Noticia guardada con éxito.');
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'Hubo un error al guardar la noticia.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrders = orderFilter === 'Todos los estados' 
    ? allOrders 
    : allOrders.filter(o => o.status === orderFilter);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const handleCategoryAction = async () => {
    if (!newCategory.name) return;
    setIsSaving(true);
    try {
      const categoryData = {
        name: newCategory.name,
        section: newCategory.section || 'merchandising',
        subcategories: (newCategory.subcategories || '').split(',').map(s => s.trim()).filter(s => s !== '')
      };

      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
      } else {
        await addDoc(collection(db, 'categories'), categoryData);
      }

      const snap = await getDocs(collection(db, 'categories'));
      setAllCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setShowAddCategory(false);
      setEditingCategory(null);
      setNewCategory({ name: '', subcategories: '', section: 'merchandising' });
      showAlert('Éxito', 'Categoría guardada correctamente.');
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudo guardar la categoría.');
    } finally {
      setIsSaving(false);
    }
  };

  // CMS state is now managed in the main loadData and activeTab effect above
  // to prevent redundant state overrides.
  const t = translations[config.language];

  const handleBulkUpload = async (file: File) => {
    setIsSaving(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      let products: any[] = [];

      try {
        if (file.name.endsWith('.json')) {
          products = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          products = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = values[i]; });
            return obj;
          });
        } else if (file.name.endsWith('.xml')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");
          
          let items = xmlDoc.getElementsByTagName("producto");
          if (items.length === 0) {
            items = xmlDoc.getElementsByTagName("product");
          }

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const getVal = (tagName: string) => {
              const el = item.getElementsByTagName(tagName)[0];
              return el ? el.textContent?.trim() || "" : "";
            };

            const rawName = getVal("name_es") || getVal("title") || getVal("name");
            if (!rawName.toUpperCase().includes("FINAL FANTASY")) continue;

            const obj: any = {
              title: rawName,
              price: parseFloat(getVal("price").replace(',', '.')) || 0,
              image_url: getVal("image") || getVal("image_url"),
              description: getVal("description_es") || getVal("description"),
              product_model: getVal("product_model"),
              ean: getVal("EAN"),
              isFeatured: false
            };
            
            const rawQty = getVal("quantity") || getVal("stock");
            obj.stock = rawQty.toUpperCase() === "SIN STOCK" ? 0 : (parseInt(rawQty) || 0);

            const rawCat = getVal("category");
            obj.category = rawCat.split('>')[0].trim() || "General";
            
            const catLower = rawCat.toLowerCase();
            const nameLower = rawName.toLowerCase();
            
            if (catLower.includes('cartas') || catLower.includes('tcg') || catLower.includes('card') || catLower.includes('sobre')) {
              obj.type = 'cartas';
            } else if (catLower.includes('mesa') || catLower.includes('tablero') || catLower.includes('board game') || catLower.includes('juego de rol') || nameLower.includes('juego de rol') || nameLower.includes('starter set')) {
              obj.type = 'juegos-de-mesa';
            } else if (catLower.includes('accesorio') || catLower.includes('funda') || catLower.includes('sleeves') || catLower.includes('tapete') || catLower.includes('playmat') || catLower.includes('deck box') || catLower.includes('dados') || catLower.includes('album')) {
              obj.type = 'accesorios';
            } else {
              obj.type = 'merchandising';
            }

            products.push(obj);
          }
        }

        // Auto-creación de categorías faltantes
        let createdCategories = 0;
        const existingCategoryNames = new Set(allCategories.map(c => c.name.toLowerCase()));
        const uploadedCategories = new Set<string>();
        
        products.forEach(p => {
          if (p.category) uploadedCategories.add(p.category.trim());
        });

        for (const catName of Array.from(uploadedCategories)) {
          if (!existingCategoryNames.has(catName.toLowerCase())) {
            const sampleProduct = products.find(p => p.category === catName);
            const section = sampleProduct?.type || 'merchandising';
            
            await addDoc(collection(db, 'categories'), {
              name: catName,
              section: section,
              subcategories: []
            });
            createdCategories++;
            existingCategoryNames.add(catName.toLowerCase());
          }
        }

        // Lógica de Upsert (Actualizar si existe por título, si no crear)
        let updatedCount = 0;
        let createdCount = 0;

        for (const pData of products) {
          if (!pData.title) continue;
          
          const q = query(collection(db, 'products'), where('title', '==', pData.title));
          const querySnap = await getDocs(q);
          
          const cleanData = {
            ...pData,
            updated_at: Timestamp.now()
          };

          if (!querySnap.empty) {
            await updateDoc(doc(db, 'products', querySnap.docs[0].id), cleanData);
            updatedCount++;
          } else {
            await addDoc(collection(db, 'products'), {
              ...cleanData,
              created_at: Timestamp.now()
            });
            createdCount++;
          }
        }

        loadData();
        showAlert('Carga Completada', `Se han creado ${createdCount} productos de Final Fantasy y actualizado ${updatedCount}. ${createdCategories > 0 ? `Se han creado ${createdCategories} categorías nuevas.` : ''}`);
      } catch (err) {
        console.error(err);
        showAlert('Error', 'Hubo un problema procesando el archivo.');
      } finally {
        setIsSaving(false);
      }
    };

    reader.readAsText(file);
  };

  const handleSaveContent = async (pageId: string) => {
    setIsSaving(true);
    console.log(`Guardando contenido para ${pageId}...`, localCMS[pageId]);
    try {
      const data = localCMS[pageId] || {};
      const docRef = doc(db, 'site_content', pageId);
      await setDoc(docRef, data, { merge: true });
      
      setSiteContent(prev => ({ 
        ...prev, 
        [pageId]: data 
      }));
      
      showAlert('Éxito', `El contenido de ${pageId === 'home' ? 'Inicio' : 'Contacto'} se ha guardado correctamente.`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error al guardar contenido:", error);
      showAlert('Error', `No se pudo guardar: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCMSImageUpload = async (pageId: string, field: string, file: File) => {
    setIsSaving(true);
    try {
      const storageRef = ref(storage, `cms/${pageId}_${field}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const updatedPageData = { ...(localCMS[pageId] || {}), [field]: url };
      
      // Actualizar localmente primero
      setLocalCMS(prev => ({
        ...prev,
        [pageId]: updatedPageData
      }));

      // Guardar en Firestore
      await setDoc(doc(db, 'site_content', pageId), { [field]: url }, { merge: true });
      
      setSiteContent(prev => ({
        ...prev,
        [pageId]: { ...(prev[pageId] || {}), [field]: url }
      }));

      showAlert('Imagen Subida', 'La imagen se ha actualizado correctamente.');
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudo subir la imagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {/* Alerta de citas pendientes */}
            {pendingAppointments.length > 0 && (
              <button
                onClick={() => setActiveTab('citas')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-warning/10 border border-warning/30 hover:bg-warning/20 transition-colors text-left w-full mb-6"
              >
                <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">notifications_active</span>
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-on-surface">
                    {pendingAppointments.length === 1
                      ? '1 cita pendiente de confirmar'
                      : `${pendingAppointments.length} citas pendientes de confirmar`}
                  </p>
                  <p className="text-sm text-on-surface-variant">Haz clic para gestionarlas en la secci├│n Citas.</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            )}

            {/* Alerta de Stock Bajo */}
            {lowStockProducts.length > 0 && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-error/10 border border-error/30 mb-6">
                <div className="w-10 h-10 rounded-xl bg-error/20 text-error flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">running_with_errors</span>
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-on-surface">
                    {lowStockProducts.length === 1
                      ? '1 producto con stock crítico'
                      : `${lowStockProducts.length} productos con stock crítico`}
                  </p>
                  <p className="text-sm text-on-surface-variant">Revisa el inventario para evitar roturas de stock.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('productos')}
                  className="px-4 py-1.5 bg-error text-white rounded-lg text-sm font-medium hover:bg-error/90 transition-colors"
                >
                  Gestionar
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Ventas Totales', value: `${storeSymbol}${allOrders.length > 0 ? totalSales.toLocaleString() : '0'}`, icon: 'payments', trend: 'Total Histórico' },
                { label: 'Pedidos Hoy', value: ordersToday.length.toString(), icon: 'shopping_bag', trend: `+${ordersToday.length}` },
                { label: 'Usuarios Club', value: uniqueCustomerEmails.size.toString(), icon: 'group', trend: 'Únicos' },
                { label: 'Productos', value: allProducts.length.toString(), icon: 'inventory_2', trend: 'Activos' },
              ].map((stat, i) => (
                <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">{stat.icon}</span>
                    </div>
                    <span className="text-sm font-bold text-success">
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm mb-1">{stat.label}</p>
                  <p className="font-headline font-bold text-2xl">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Gráfica de Ventas (SVG Custom) */}
              <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-bold text-lg">Evolución de Ventas</h2>
                  <span className="text-xs text-on-surface-variant">Últimos 7 días</span>
                </div>
                <div className="h-64 flex items-end justify-between gap-4 pt-4">
                  {salesHistory.map((day, i) => (
                    <div key={i} className="flex-grow flex flex-col items-center gap-2 group">
                      <div className="w-full relative flex items-end justify-center h-48">
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-on-surface text-surface text-[10px] px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-10">
                          {storeSymbol}{day.total.toLocaleString()}
                        </div>
                        <div 
                          className="w-full max-w-[40px] bg-primary/20 rounded-t-lg group-hover:bg-primary transition-all duration-500"
                          style={{ height: `${(day.total / maxSale) * 100}%`, minHeight: '4px' }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">{day.display}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agenda del día */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="font-bold text-lg">Agenda de hoy</h2>
                    <p className="text-sm text-on-surface-variant">{formatDate(todayStr)}</p>
                  </div>
                  <button className="text-primary text-sm font-medium hover:underline" onClick={() => setActiveTab('citas')}>Ver todas</button>
                </div>
                <div className="flex-grow overflow-auto">
                  {todayAppointments.length === 0 ? (
                    <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-outline mb-2">event_available</span>
                      <p className="text-on-surface-variant text-sm">No hay citas para hoy.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/10">
                      {todayAppointments.map(appt => (
                        <div key={appt.id} className="px-6 py-4 flex items-center gap-4">
                          <div className="w-12 text-center shrink-0">
                            <span className="font-bold text-primary">{appt.time}</span>
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="font-medium text-on-surface">{appt.name}</p>
                            <p className="text-xs text-on-surface-variant truncate">{appt.cardDescription}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Productos más vendidos */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  <h2 className="font-bold text-lg">Top Ventas</h2>
                </div>
                <div className="space-y-4">
                  {topProducts.length > 0 ? (
                    topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold truncate max-w-[150px]">{p.title}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase font-bold">{p.count} uds. vendidas</p>
                          </div>
                        </div>
                        <span className="font-headline font-bold text-sm text-primary">{storeSymbol}{p.total.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant text-center py-4">No hay datos de ventas disponibles.</p>
                  )}
                </div>
              </div>

              {/* Distribución por Categorías */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-secondary">pie_chart</span>
                  <h2 className="font-bold text-lg">Inventario por Categoría</h2>
                </div>
                <div className="space-y-4">
                  {categoryStats.map(([cat, count], i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold uppercase tracking-wider">{cat}</span>
                        <span className="text-on-surface-variant">{count} productos</span>
                      </div>
                      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary transition-all duration-1000"
                          style={{ width: `${(count / allProducts.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
                <h2 className="font-bold text-lg">Pedidos Recientes</h2>
                <button className="text-primary text-sm font-medium hover:underline" onClick={() => setActiveTab('pedidos')}>Ver todos</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-sm">
                      <th className="p-4 font-medium">ID Pedido</th>
                      <th className="p-4 font-medium">Cliente</th>
                      <th className="p-4 font-medium">Fecha</th>
                      <th className="p-4 font-medium">Estado</th>
                      <th className="p-4 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {allOrders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-medium text-primary">#{order.id.slice(0, 8)}</td>
                        <td className="p-4">{order.customer_name}</td>
                        <td className="p-4 text-on-surface-variant">{toDate(order.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'Completado' ? 'bg-success/20 text-success' :
                            order.status === 'Procesando' ? 'bg-primary-container text-on-primary-container' :
                            'bg-surface-variant text-on-surface-variant'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 font-bold">{storeSymbol}{order.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      case 'productos':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg">Gestión de Productos</h2>
                  <p className="text-sm text-on-surface-variant">Inventario total: {allProducts.length}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input 
                    type="file" 
                    id="bulk-upload" 
                    className="hidden" 
                    accept=".csv,.json,.xml" 
                    onChange={e => e.target.files && handleBulkUpload(e.target.files[0])} 
                  />
                  <label 
                    htmlFor="bulk-upload" 
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl font-bold hover:bg-secondary/20 transition-all cursor-pointer text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Carga Masiva
                  </label>
                  <button 
                    onClick={() => {
                      setEditingProductId(null);
                      setNewProduct({ title: '', category: '', subcategory: '', price: '', stock: '', type: 'cartas', description: '', tags: '', image_url: '', isFeatured: false, sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } as Record<string, number> });
                      setNewImage(null);
                      setShowAddProduct(true);
                    }} 
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Añadir Producto
                  </button>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-grow md:flex-grow-0">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                  <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full md:w-64 pl-9 pr-4 py-2 bg-surface-container rounded-xl border border-outline-variant/30 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <select 
                  value={categoryFilter} 
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-sm outline-none font-medium"
                >
                  <option value="Todas">Todas las categorías</option>
                  {allCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name} ({cat.section})</option>
                  ))}
                </select>
                <select 
                  value={stockFilter} 
                  onChange={e => setStockFilter(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-sm outline-none font-medium"
                >
                  <option value="Todos">Todo el stock</option>
                  <option value="Stock bajo">Stock bajo (&lt; 5)</option>
                  <option value="Sin stock">Sin stock (0)</option>
                </select>
              </div>
            </div>
            
            {showAddProduct && (
              <div className="p-6 border-b border-outline-variant/20 bg-surface-container-high">
                <h3 className="font-bold mb-4">{editingProductId ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Tipo de Producto</label>
                      <select 
                        value={newProduct.type} 
                        onChange={e => setNewProduct({...newProduct, type: e.target.value, category: '', subcategory: ''})} 
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm font-bold"
                      >
                        <option value="cartas">Cartas (TCG)</option>
                        <option value="merchandising">Merchandising</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Categoría</label>
                      <select 
                        value={newProduct.category} 
                        onChange={e => setNewProduct({...newProduct, category: e.target.value, subcategory: ''})} 
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm font-bold"
                      >
                        <option value="">Seleccionar Categoría</option>
                        {allCategories.filter(cat => !cat.section || cat.section === newProduct.type).map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input type="text" placeholder="Título" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm" />
                  
                  {newProduct.category && allCategories.find(c => c.name === newProduct.category)?.subcategories?.length > 0 && (
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase mb-1 ml-1 text-on-surface-variant">Subcategoría</label>
                      <select 
                        value={newProduct.subcategory} 
                        onChange={e => setNewProduct({...newProduct, subcategory: e.target.value})} 
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm"
                      >
                        <option value="">Seleccionar Subcategoría (Opcional)</option>
                        {allCategories.find(c => c.name === newProduct.category)?.subcategories?.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="relative">
                    <input type="number" placeholder="Precio" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">€</span>
                  </div>
                  
                  {newProduct.category.toLowerCase() !== 'ropa' && (
                    <input type="number" placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm" />
                  )}
                  
                  <label className="flex items-center gap-2 px-3 py-2.5 cursor-pointer bg-surface-container rounded-xl border border-outline-variant/30">
                    <input type="checkbox" checked={newProduct.isFeatured} onChange={e => setNewProduct({...newProduct, isFeatured: e.target.checked})} className="w-4 h-4 accent-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">Destacado</span>
                  </label>
                  <input type="text" placeholder="Etiquetas (separadas por coma)" value={newProduct.tags} onChange={e => setNewProduct({...newProduct, tags: e.target.value})} className="col-span-2 px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm" />

                  {newProduct.category.toLowerCase() === 'ropa' && (
                    <div className="col-span-2 bg-surface-container border border-outline-variant/30 px-4 py-3 rounded">
                      <span className="block text-sm mb-2 text-on-surface-variant font-medium">Inventario por Tallas:</span>
                      <div className="grid grid-cols-5 gap-2">
                        {['S', 'M', 'L', 'XL', 'XXL'].map(sz => (
                          <label key={sz} className="flex flex-col gap-1 text-[10px] font-bold text-center uppercase">
                            {sz}
                            <input 
                              type="number" 
                              min="0"
                              value={newProduct.sizes[sz] || 0}
                              onChange={(e) => setNewProduct({...newProduct, sizes: { ...newProduct.sizes, [sz]: parseInt(e.target.value) || 0 }})}
                              className="px-1 py-1 text-center rounded border border-outline-variant/30 bg-surface-container-lowest text-xs"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewImage(e.target.files ? e.target.files[0] : null)} className="col-span-2 block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-on-primary cursor-pointer" />
                  <textarea placeholder="Descripción" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="col-span-2 px-3 py-2 rounded bg-surface-container border border-outline-variant/30 resize-none h-20" />
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button onClick={() => setShowAddProduct(false)} className="px-4 py-2 font-medium">Cancelar</button>
                  <button onClick={handleAddProduct} disabled={isSaving} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium disabled:opacity-50">
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-sm">
                    <th className="p-4 font-medium">Producto</th>
                    <th className="p-4 font-medium">Categoría</th>
                    <th className="p-4 font-medium">Precio</th>
                    <th className="p-4 font-medium">Stock</th>
                    <th className="p-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {allProducts
                    .filter(p => {
                      const matchesSearch = p.title.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase());
                      const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
                      const matchesStock = stockFilter === 'Todos' || 
                        (stockFilter === 'Stock bajo' && p.stock > 0 && p.stock < 5) || 
                        (stockFilter === 'Sin stock' && p.stock === 0);
                      return matchesSearch && matchesCategory && matchesStock;
                    })
                    .map((prod) => (
                    <tr key={prod.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        <img src={getSEOImageUrl(prod.image_url) || `https://picsum.photos/seed/${prod.id}/40/40`} alt={prod.title} className="w-10 h-10 rounded bg-surface-container object-cover" />
                        <div className="flex flex-col">
                          <span className="font-medium">{prod.title}</span>
                          {prod.isFeatured && (
                            <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[12px] filled-icon">star</span>
                              Destacado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-on-surface-variant">{prod.category}</td>
                      <td className="p-4 font-bold">{storeSymbol}{prod.price}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${prod.stock > 10 ? 'bg-success/20 text-success' : prod.stock > 0 ? 'bg-primary-container text-on-primary-container' : 'bg-error/20 text-error'}`}>
                          {prod.stock > 0 ? `${prod.stock} en stock` : 'Agotado'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors" onClick={() => {
                          setEditingProductId(prod.id);
                          setNewProduct({
                            title: prod.title,
                            category: prod.category,
                            price: prod.price.toString(),
                            stock: prod.stock.toString(),
                            type: prod.type,
                            description: prod.description || '',
                            tags: prod.tags?.join(', ') || '',
                            expansion: prod.expansion || '',
                            image_url: prod.image_url || '',
                            isFeatured: prod.isFeatured || false,
                            sizes: prod.sizes && Object.keys(prod.sizes).length > 0 ? prod.sizes : { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
                            subcategory: prod.subcategory || ''
                          });
                          setShowAddProduct(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}>
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button className="text-error p-2 hover:bg-error/10 rounded-full transition-colors" onClick={() => {
                          showConfirm(
                            'Eliminar Producto',
                            `¿Estás seguro de que quieres eliminar "${prod.title}"?`,
                            async () => {
                              await deleteDoc(doc(db, 'products', prod.id));
                              setAllProducts(prev => prev.filter(p => p.id !== prod.id));
                            }
                          );
                        }}>
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'pedidos':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
              <h2 className="font-bold text-lg">Pedidos</h2>
              <select 
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm outline-none"
              >
                <option>Todos los estados</option>
                <option>Completado</option>
                <option>Procesando</option>
                <option>Cancelado</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-sm">
                    <th className="p-4 font-medium">ID Pedido</th>
                    <th className="p-4 font-medium">Cliente</th>
                    <th className="p-4 font-medium">Fecha</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-medium text-primary">#{order.id.slice(0, 8)}</td>
                        <td className="p-4">{order.customer_name}</td>
                        <td className="p-4 text-on-surface-variant">{toDate(order.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'Completado' ? 'bg-success/20 text-success' :
                            order.status === 'Procesando' ? 'bg-primary-container text-on-primary-container' :
                            'bg-surface-variant text-on-surface-variant'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 font-bold">{storeSymbol}{order.total}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">No se han encontrado pedidos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'noticias':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
              <h2 className="font-bold text-lg">Noticias y Blog</h2>
              <button 
                onClick={() => {
                  setEditingNewsId(null);
                  setNewNews({ title: '', excerpt: '', content: '', category: 'General', image_url: '', author: 'Fun Fantasy' });
                  setNewsImage(null);
                  setShowAddNews(true);
                }} 
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Nueva Noticia
              </button>
            </div>

            {showAddNews && (
              <div className="p-6 border-b border-outline-variant/20 bg-surface-container-high">
                <h3 className="font-bold mb-4">{editingNewsId ? 'Editar Noticia' : 'Crear Nueva Noticia'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Título" value={newNews.title} onChange={e => setNewNews({...newNews, title: e.target.value})} className="col-span-2 px-3 py-2 rounded bg-surface-container border border-outline-variant/30" />
                  <select value={newNews.category} onChange={e => setNewNews({...newNews, category: e.target.value})} className="px-3 py-2 rounded bg-surface-container border border-outline-variant/30">
                    <option value="General">General</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Lanzamientos">Lanzamientos</option>
                    <option value="Torneos">Torneos</option>
                  </select>
                  <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewsImage(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-on-primary cursor-pointer" />
                  <textarea placeholder="Resumen corto" value={newNews.excerpt} onChange={e => setNewNews({...newNews, excerpt: e.target.value})} className="col-span-2 px-3 py-2 rounded bg-surface-container border border-outline-variant/30 resize-none h-16" />
                  <textarea placeholder="Contenido (HTML)" value={newNews.content} onChange={e => setNewNews({...newNews, content: e.target.value})} className="col-span-2 px-3 py-2 rounded bg-surface-container border border-outline-variant/30 resize-none h-48" />
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button onClick={() => setShowAddNews(false)} className="px-4 py-2 font-medium">Cancelar</button>
                  <button onClick={handleAddNews} disabled={isSaving} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium disabled:opacity-50">
                    {isSaving ? 'Guardando...' : 'Publicar'}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-sm">
                    <th className="p-4 font-medium">Noticia</th>
                    <th className="p-4 font-medium">Categoría</th>
                    <th className="p-4 font-medium">Fecha</th>
                    <th className="p-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {allNews.map((news) => (
                    <tr key={news.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        <img src={getSEOImageUrl(news.image_url) || `https://picsum.photos/seed/${news.id}/40/40`} alt={news.title} className="w-10 h-10 rounded bg-surface-container object-cover" />
                        <span className="font-medium max-w-[200px] truncate">{news.title}</span>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-primary/10 text-primary">{news.category}</span></td>
                      <td className="p-4 text-xs text-on-surface-variant">{news.published_at ? toDate(news.published_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-4 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors" onClick={() => {
                          setEditingNewsId(news.id);
                          setNewNews({ title: news.title, category: news.category, excerpt: news.excerpt || '', content: news.content || '', image_url: news.image_url || '', author: news.author || 'Fun Fantasy' });
                          setShowAddNews(true);
                        }}>
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button className="text-error p-2 hover:bg-error/10 rounded-full transition-colors" onClick={() => {
                          showConfirm(
                            'Eliminar Noticia',
                            `¿Estás seguro de eliminar "${news.title}"?`,
                            async () => {
                              await deleteDoc(doc(db, 'news', news.id));
                              setAllNews(prev => prev.filter(n => n.id !== news.id));
                            }
                          );
                        }}>
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'citas':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20">
              <h2 className="font-bold text-lg">Citas de Valoración</h2>
              <p className="text-sm text-on-surface-variant mt-1">Solicitudes recibidas desde el chatbot.</p>
            </div>
            {appointmentsLoading ? (
              <div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-4xl text-primary mb-3">progress_activity</span><p>Cargando citas...</p></div>
            ) : allAppointments.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-5xl mb-4">event_busy</span><p>No hay citas registradas.</p></div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {allAppointments.map(appt => (
                  <div key={appt.id} className="p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between hover:bg-surface-container-lowest/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{appt.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${appt.status === 'confirmed' ? 'bg-success/20 text-success' : appt.status === 'rejected' ? 'bg-error/20 text-error' : 'bg-primary-container text-on-primary-container'}`}>
                          {appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span> {formatDate(appt.date)} — {appt.time}h | {appt.contact}
                      </p>
                      <p className="text-sm text-on-surface-variant"><span className="font-medium text-on-surface">Material:</span> {appt.cardDescription}</p>
                    </div>
                    {appt.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={async () => { await updateAppointmentStatus(appt.id!, 'confirmed'); loadData(); }} className="px-3 py-1.5 bg-success/20 text-success rounded-lg font-bold text-xs hover:bg-success/30 transition-colors">Confirmar</button>
                        <button onClick={async () => { await updateAppointmentStatus(appt.id!, 'rejected'); loadData(); }} className="px-3 py-1.5 bg-error/10 text-error rounded-lg font-bold text-xs hover:bg-error/20 transition-colors">Rechazar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'usuarios':
        return (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-6">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-secondary">settings_suggest</span>Equivalencia de Puntos</h2>
              {loyaltyConfig && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div>
                    <label className="block text-sm font-medium mb-1">Puntos por 1€</label>
                    <input type="number" value={loyaltyConfig.pointsPerEuro} onChange={e => setLoyaltyConfig({...loyaltyConfig, pointsPerEuro: parseInt(e.target.value) || 1})} className="w-full px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Puntos para canje</label>
                    <input type="number" value={loyaltyConfig.pointsToRedeem} onChange={e => setLoyaltyConfig({...loyaltyConfig, pointsToRedeem: parseInt(e.target.value) || 1})} className="w-full px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 outline-none" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-grow">
                      <label className="block text-sm font-medium mb-1">Valor canje (€)</label>
                      <input type="number" value={loyaltyConfig.rewardAmount} onChange={e => setLoyaltyConfig({...loyaltyConfig, rewardAmount: parseInt(e.target.value) || 1})} className="w-full px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 outline-none" />
                    </div>
                    <button onClick={async () => { await updateLoyaltyConfig(loyaltyConfig); showAlert('Éxito', 'Configuración actualizada.'); }} className="px-6 py-2 bg-secondary text-on-secondary rounded-lg font-bold hover:bg-secondary/90 transition-colors">Actualizar</button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col max-h-[650px]">
                <div className="p-6 border-b border-outline-variant/20 flex flex-col gap-4 shrink-0">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg">Newsletter ({allSubscribers.length})</h2>
                    <button 
                      onClick={handleExportSubscribers}
                      className="px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-secondary/20 transition-colors"
                      title="Exportar a CSV"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Exportar CSV
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                    <input type="text" placeholder="Buscar..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-8 pr-4 py-1.5 bg-surface-container rounded-lg border border-outline-variant/30 text-xs outline-none w-full" />
                  </div>
                </div>
                <div className="flex-grow overflow-auto">
                  <div className="divide-y divide-outline-variant/10">
                    {allSubscribers
                      .filter(s => s.email.toLowerCase().includes(userSearch.toLowerCase()) || s.name.toLowerCase().includes(userSearch.toLowerCase()))
                      .map(sub => (
                      <div key={sub.id} className="p-4 flex items-center justify-between group hover:bg-surface-container-lowest/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={selectedSubscribers.has(sub.email)} onChange={e => {
                            const n = new Set(selectedSubscribers);
                            if (e.target.checked) n.add(sub.email); else n.delete(sub.email);
                            setSelectedSubscribers(n);
                          }} className="w-4 h-4 accent-primary" />
                          <div>
                            <p className="font-bold text-sm">{sub.name}</p>
                            <p className="text-xs text-primary">{sub.email}</p>
                          </div>
                        </div>
                        <button onClick={() => showConfirm('Eliminar', `¿Borrar a ${sub.name}?`, async () => { await unsubscribeFromNewsletter(sub.email); loadData(); })} className="p-2 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 border-t border-outline-variant/20 shrink-0">
                   <h3 className="text-sm font-bold mb-3">Redactar Envío</h3>
                   <input type="text" placeholder="Asunto" value={newsletterSubject} onChange={e => setNewsletterSubject(e.target.value)} className="w-full px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 mb-3 outline-none text-sm" />
                   <textarea placeholder="Contenido..." value={newsletterContent} onChange={e => setNewsletterContent(e.target.value)} className="w-full px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 mb-4 h-24 outline-none text-sm resize-none"></textarea>
                   <button onClick={handleSendNewsletter} disabled={isSendingNewsletter || selectedSubscribers.size === 0} className="w-full py-2 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                     <span className="material-symbols-outlined text-[18px]">send</span> Enviar a {selectedSubscribers.size}
                   </button>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col max-h-[650px]">
                <div className="p-6 border-b border-outline-variant/20 flex flex-col gap-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg">Club Fun Fantasy ({allLoyaltyUsers.length})</h2>
                    <div className="bg-secondary/10 px-2 py-1 rounded text-xs font-bold text-secondary uppercase tracking-tighter">Miembros</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">search</span>
                      <input 
                        type="text" 
                        placeholder="Buscar miembro..." 
                        value={loyaltySearch} 
                        onChange={e => setLoyaltySearch(e.target.value)} 
                        className="w-full pl-8 pr-4 py-1.5 bg-surface-container rounded-lg border border-outline-variant/30 text-[10px] outline-none" 
                      />
                    </div>
                    <select 
                      value={levelFilter}
                      onChange={e => setLevelFilter(e.target.value)}
                      className="bg-surface-container border border-outline-variant/30 rounded-lg px-2 py-1 text-[10px] outline-none font-bold"
                    >
                      <option value="Todos">Niveles</option>
                      <option value="Bronce">Bronce</option>
                      <option value="Plata">Plata</option>
                      <option value="Oro">Oro</option>
                      <option value="Cristal">Cristal</option>
                    </select>
                  </div>
                </div>
                <div className="flex-grow overflow-auto">
                  <div className="divide-y divide-outline-variant/10">
                    {allLoyaltyUsers
                      .filter(u => {
                        const matchesSearch = u.email.toLowerCase().includes(loyaltySearch.toLowerCase()) || u.name.toLowerCase().includes(loyaltySearch.toLowerCase());
                        const matchesLevel = levelFilter === 'Todos' || u.level === levelFilter;
                        return matchesSearch && matchesLevel;
                      })
                      .map(u => (
                      <div key={u.email} className="p-4 flex items-center justify-between group hover:bg-surface-container-lowest/50 transition-colors">
                        <div>
                          <p className="font-bold text-sm">{u.name}</p>
                          <p className="text-xs text-on-surface-variant mb-1">{u.email}</p>
                          <div className="flex gap-2 items-center">
                             <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getLevelColor(u.level)}`}>{u.level}</span>
                             <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-0.5">
                               <span className="material-symbols-outlined text-[12px] text-secondary">database</span>
                               {u.points}
                             </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={async () => { await addPoints(u.email, 10); loadData(); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"><span className="material-symbols-outlined text-[16px]">add</span></button>
                          <button onClick={() => showConfirm('Eliminar', `¿Quitar a ${u.name} del club?`, async () => { await deleteLoyaltyAccount(u.email); loadData(); })} className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"><span className="material-symbols-outlined text-[16px]">person_remove</span></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'mensajes':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-lg">Mensajes Entrantes</h2>
                <p className="text-sm text-on-surface-variant mt-1">Mensajes del formulario de contacto.</p>
              </div>
              <div className="flex gap-2">
                {['Todos', 'No Leídos', 'Leídos'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setMessageFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      messageFilter === filter ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            {messagesLoading ? (
              <div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-4xl text-primary mb-3">progress_activity</span><p>Cargando mensajes...</p></div>
            ) : allMessages.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-5xl mb-4">forum</span><p>No hay mensajes en la bandeja de entrada.</p></div>
            ) : (
              <div className="flex-grow overflow-auto p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-sm border-b border-outline-variant/20">
                      <th className="p-4 font-medium w-12">Estado</th>
                      <th className="p-4 font-medium">Remitente</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Fecha</th>
                      <th className="p-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {allMessages
                      .filter(m => messageFilter === 'Todos' || (messageFilter === 'Leídos' ? m.read : !m.read))
                      .map(m => (
                      <tr key={m.id} className={`hover:bg-surface-container-lowest transition-colors group ${!m.read ? 'font-bold bg-primary/5' : ''}`}>
                        <td className="p-4">
                          <button onClick={async () => {
                            await updateDoc(doc(db, 'contact_messages', m.id), { read: !m.read });
                            setAllMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, read: !m.read } : msg));
                          }} className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none">
                            <span className="material-symbols-outlined text-[20px]">
                              {m.read ? 'drafts' : 'mark_email_unread'}
                            </span>
                          </button>
                        </td>
                        <td className="p-4">{m.name} {m.lastName}</td>
                        <td className="p-4">{m.email}</td>
                        <td className="p-4 text-xs text-on-surface-variant">{toDate(m.timestamp).toLocaleString()}</td>
                        <td className="p-4 text-right space-x-1">
                          <button className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors" onClick={() => setSelectedMessage(m)}>
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          <button className="text-error p-2 hover:bg-error/10 rounded-full transition-colors opacity-0 group-hover:opacity-100" onClick={() => {
                            showConfirm('Eliminar Mensaje', '¿Seguro que quieres borrar este mensaje?', async () => {
                              await deleteDoc(doc(db, 'contact_messages', m.id));
                              setAllMessages(prev => prev.filter(msg => msg.id !== m.id));
                            });
                          }}>
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedMessage && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl overflow-hidden shadow-xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-xl">Mensaje de {selectedMessage.name}</h3>
                    <button onClick={async () => {
                      if (!selectedMessage.read) {
                        await updateDoc(doc(db, 'contact_messages', selectedMessage.id), { read: true });
                        setAllMessages(prev => prev.map(msg => msg.id === selectedMessage.id ? { ...msg, read: true } : msg));
                      }
                      setSelectedMessage(null);
                    }} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4">
                    <div className="flex gap-4 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {selectedMessage.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold">{selectedMessage.name} {selectedMessage.lastName}</p>
                        <p className="text-sm text-primary"><a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></p>
                        <p className="text-xs text-on-surface-variant mt-1">{toDate(selectedMessage.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-surface-container p-6 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed text-on-surface border border-outline-variant/30">
                      {selectedMessage.message}
                    </div>
                  </div>
                  <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-end gap-2 shrink-0">
                    <a href={`mailto:${selectedMessage.email}`} className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">reply</span>
                      Responder
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'paginas':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant/20 shrink-0">
              <h2 className="font-bold text-lg">Páginas y Legal</h2>
              <p className="text-sm text-on-surface-variant mt-1">Edita el contenido de las páginas estáticas.</p>
            </div>
            
            {editingPageId ? (
              <div className="flex-grow flex flex-col overflow-hidden">
                <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low shrink-0">
                  <h3 className="font-bold">Editando: {editingPageId === 'politica-privacidad' ? 'Política de Privacidad' : editingPageId === 'terminos-venta' ? 'Términos de Venta' : editingPageId === 'envios-devoluciones' ? 'Envíos y Devoluciones' : 'Preguntas Frecuentes'}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingPageId(null)} className="px-4 py-2 font-medium">Cancelar</button>
                    <button onClick={async () => {
                      setIsSaving(true);
                      try {
                        const pageData = editingPageId === 'faq' ? { questions: editingPageContent } : { content: editingPageContent };
                        // Guardar en Firestore usando setDoc (con merge: true) para asegurar que se crea o se actualiza
                        await setDoc(doc(db, 'legal_pages', editingPageId), pageData, { merge: true });
                        setLegalPages(prev => {
                           const newPages = [...prev];
                           const idx = newPages.findIndex(p => p.id === editingPageId);
                           if (idx >= 0) newPages[idx] = { id: editingPageId, ...pageData };
                           else newPages.push({ id: editingPageId, ...pageData });
                           return newPages;
                        });
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3000);
                        showAlert('Guardado', 'La página se ha actualizado correctamente.');
                        setEditingPageId(null);
                      } catch (err) {
                        console.error('Error saving page:', err);
                        showAlert('Error', 'No se pudo guardar la página.');
                      } finally {
                        setIsSaving(false);
                      }
                    }} disabled={isSaving} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                      {isSaving ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                      Guardar
                    </button>
                  </div>
                </div>
                <div className="flex-grow p-6 overflow-auto bg-surface-container-lowest">
                  {editingPageId === 'faq' ? (
                    <div className="space-y-4">
                      {editingPageContent.map((faq: any, idx: number) => (
                        <div key={faq.id} className="p-4 border border-outline-variant/30 rounded-xl bg-surface-container space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">Pregunta {idx + 1}</span>
                            <button onClick={() => {
                              const newFaqs = [...editingPageContent];
                              newFaqs.splice(idx, 1);
                              setEditingPageContent(newFaqs);
                            }} className="text-error hover:bg-error/10 p-1.5 rounded-full transition-colors">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                          <input type="text" placeholder="Pregunta" value={faq.question} onChange={e => {
                            const newFaqs = [...editingPageContent];
                            newFaqs[idx].question = e.target.value;
                            setEditingPageContent(newFaqs);
                          }} className="w-full px-3 py-2 rounded bg-surface-container-lowest border border-outline-variant/30" />
                          <textarea placeholder="Respuesta (Soporta HTML básico)" value={faq.answer} onChange={e => {
                            const newFaqs = [...editingPageContent];
                            newFaqs[idx].answer = e.target.value;
                            setEditingPageContent(newFaqs);
                          }} className="w-full px-3 py-2 rounded bg-surface-container-lowest border border-outline-variant/30 h-24 resize-y" />
                        </div>
                      ))}
                      <button onClick={() => {
                        setEditingPageContent([...editingPageContent, { id: Date.now().toString(), question: '', answer: '' }]);
                      }} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">add</span>
                        Añadir Pregunta
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <label className="block text-sm font-bold mb-2">Contenido de la página (HTML soportado)</label>
                      <textarea 
                        value={editingPageContent} 
                        onChange={e => setEditingPageContent(e.target.value)} 
                        className="w-full flex-grow p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 resize-none font-mono text-sm leading-relaxed"
                        placeholder="<h1>Título</h1><p>Contenido...</p>"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-grow overflow-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'politica-privacidad', title: 'Política de Privacidad', icon: 'policy' },
                    { id: 'politica-cookies', title: 'Política de Cookies', icon: 'cookie' },
                    { id: 'terminos-condiciones', title: 'Términos y Condiciones', icon: 'gavel' },
                    { id: 'terminos-venta', title: 'Términos de Venta', icon: 'receipt_long' },
                    { id: 'envios-devoluciones', title: 'Envíos y Devoluciones', icon: 'local_shipping' },
                    { id: 'politica-devolucion', title: 'Política de Devolución', icon: 'assignment_return' },
                    { id: 'actualizaciones-normativa', title: 'Actualizaciones de Normativa', icon: 'update' },
                    { id: 'faq', title: 'Preguntas Frecuentes (FAQ)', icon: 'help_center' },
                  ].map(page => (
                    <div key={page.id} className="p-6 border border-outline-variant/20 rounded-2xl bg-surface-container hover:border-primary/30 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined">{page.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold">{page.title}</h3>
                          <p className="text-xs text-on-surface-variant">Ruta: /{page.id}</p>
                        </div>
                      </div>
                      <button onClick={() => {
                        const existingData = legalPages.find(p => p.id === page.id);
                        setEditingPageId(page.id);
                        if (page.id === 'faq') {
                          setEditingPageContent(existingData?.questions || []);
                        } else {
                          setEditingPageContent(existingData?.content || '');
                        }
                      }} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20">
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'categorias':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestión de Categorías</h2>
              <button 
                onClick={() => { 
                  setShowAddCategory(true); 
                  setEditingCategory(null); 
                  setNewCategory({ name: '', subcategories: '', section: 'merchandising' }); 
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg"
              >
                <span className="material-symbols-outlined">add</span>
                Nueva Categoría
              </button>
            </div>

            {showAddCategory && (
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="font-bold mb-4">{editingCategory ? 'Editar Categoría' : 'Añadir Categoría'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-2">Sección</label>
                    <select 
                      value={newCategory.section || 'merchandising'}
                      onChange={(e) => setNewCategory({...newCategory, section: e.target.value})}
                      className="w-full p-4 bg-surface-container-highest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="cartas">Cartas</option>
                      <option value="merchandising">Merchandising</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-2">Nombre de la Categoría</label>
                    <input 
                      type="text" 
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      className="w-full p-4 bg-surface-container-highest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ej: Figuras, Mazos..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase mb-1">Subcategorías (separadas por coma)</label>
                    <input 
                      type="text" 
                      value={newCategory.subcategories} 
                      onChange={e => setNewCategory({...newCategory, subcategories: e.target.value})}
                      placeholder="Ej: Cartas Sueltas, Sobres, Accesorios..."
                      className="w-full bg-surface-container border border-outline-variant/30 px-3 py-2 rounded-lg outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAddCategory(false)} className="px-4 py-2 text-on-surface-variant font-bold hover:bg-surface-container rounded-lg transition-colors">Cancelar</button>
                  <button onClick={handleCategoryAction} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container/50 text-on-surface-variant text-xs font-bold uppercase">
                    <tr>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Sección</th>
                      <th className="px-6 py-4">Subcategorías</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {allCategories.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant italic">No hay categorías configuradas.</td></tr>
                    ) : (
                      allCategories.map(cat => (
                        <tr key={cat.id} className="hover:bg-surface-container/30 transition-colors group">
                          <td className="px-6 py-4 font-bold">{cat.name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${cat.section === 'cartas' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                              {cat.section || 'merchandising'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {cat.subcategories?.map((sub: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-surface-container border border-outline-variant/30 rounded text-[10px] font-bold uppercase">{sub}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setNewCategory({ 
                                    name: cat.name, 
                                    subcategories: cat.subcategories?.join(', ') || '',
                                    section: cat.section || 'merchandising'
                                  });
                                  setShowAddCategory(true);
                                }}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setModal({
                                    show: true,
                                    title: 'Eliminar Categoría',
                                    message: `¿Estás seguro de que quieres eliminar la categoría "${cat.name}"? Esto no afectará a los productos pero perderán su clasificación.`,
                                    type: 'confirm',
                                    onConfirm: async () => {
                                      await deleteDoc(doc(db, 'categories', cat.id));
                                      setAllCategories(prev => prev.filter(c => c.id !== cat.id));
                                    }
                                  });
                                }}
                                className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'contenido': {
        const homeData = localCMS.home || {};
        const contactData = localCMS.contacto || {};

        if (contentLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Cargando contenido de tu web...</p>
            </div>
          );
        }

        const updateLocalField = (pageId: string, field: string, value: any) => {
          setLocalCMS(prev => ({
            ...prev,
            [pageId]: { ...(prev[pageId] || {}), [field]: value }
          }));
        };

        return (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-4xl">web</span>
                Personalización Web
              </h2>
              <p className="text-on-surface-variant mt-1">Cambia los textos e imágenes que aparecen en tu tienda. Los cambios se guardan al pulsar <strong>Guardar</strong>.</p>
            </div>

            {/* Aviso informativo */}
            <div className="flex items-start gap-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl">
              <span className="material-symbols-outlined text-primary mt-0.5 shrink-0">tips_and_updates</span>
              <p className="text-sm text-on-surface-variant"><strong className="text-on-surface">Cómo funciona:</strong> Lo que ves en los campos es exactamente lo que aparece ahora en tu web. Modifica el texto que quieras y pulsa el botón Guardar de esa sección. Los cambios se reflejan en la tienda al instante.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ===== Home Page CMS ===== */}
              <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-outline-variant/20 bg-surface-container/30 flex items-center justify-between">
                  <h3 className="font-black flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">home</span>
                    </div>
                    Página de Inicio
                  </h3>
                  <button
                    onClick={() => handleSaveContent('home')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {isSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                    Guardar
                  </button>
                </div>
                <div className="p-6 space-y-5 flex-grow">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-primary ml-1">Título principal</label>
                    <p className="text-[10px] text-on-surface-variant ml-1 mb-1">El texto grande que aparece en la portada de la web.</p>
                    <input
                      type="text"
                      value={homeData.heroTitle ?? ''}
                      onChange={e => updateLocalField('home', 'heroTitle', e.target.value)}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-primary ml-1">Subtítulo</label>
                    <p className="text-[10px] text-on-surface-variant ml-1 mb-1">El texto más pequeño que aparece debajo del título.</p>
                    <textarea
                      value={homeData.heroSubtitle ?? ''}
                      onChange={e => updateLocalField('home', 'heroSubtitle', e.target.value)}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium h-20 resize-none"
                    ></textarea>
                  </div>

                  {/* Visual Preview for Hero */}
                  <div className="mt-4 space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Vista Previa del Cabezal</label>
                    <div className="relative h-48 rounded-2xl overflow-hidden bg-black flex items-center justify-center text-center p-4 shadow-inner border border-outline-variant/20">
                      <img 
                        src={homeData.heroImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000"} 
                        alt="Preview" 
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                      />
                      <div className="relative z-10">
                        <h4 className="text-white font-headline text-lg md:text-xl font-black mb-2 leading-tight tracking-tight px-4 drop-shadow-lg">
                          {homeData.heroTitle || t.home.heroTitle}
                        </h4>
                        <p className="text-white/80 text-[10px] md:text-xs max-w-[250px] mx-auto line-clamp-2 px-4 font-medium drop-shadow-md">
                          {homeData.heroSubtitle || t.home.heroSubtitle}
                        </p>
                      </div>
                      <div className="absolute inset-0 border-2 border-primary/20 rounded-2xl pointer-events-none"></div>
                    </div>
                    <p className="text-[9px] text-on-surface-variant italic text-center">Vista previa: Así se verá el título sobre la imagen de fondo.</p>
                  </div>
                  <div className="border-t border-outline-variant/20 pt-4 space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Banner de noticias</p>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Título del banner</label>
                      <input
                        type="text"
                        value={homeData.newsTitle ?? ''}
                        onChange={e => updateLocalField('home', 'newsTitle', e.target.value)}
                        className="w-full bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant/30 outline-none focus:border-primary transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Descripción del banner</label>
                      <textarea
                        value={homeData.newsDescription ?? ''}
                        onChange={e => updateLocalField('home', 'newsDescription', e.target.value)}
                        className="w-full bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant/30 outline-none focus:border-primary transition-all text-sm font-medium h-16 resize-none"
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Texto del botón</label>
                        <input
                          type="text"
                          value={homeData.newsButtonText ?? ''}
                          onChange={e => updateLocalField('home', 'newsButtonText', e.target.value)}
                          className="w-full bg-surface-container px-3 py-2 rounded-xl border border-outline-variant/30 outline-none focus:border-primary transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant ml-1">Enlace URL</label>
                        <input
                          type="text"
                          value={homeData.newsButtonUrl ?? ''}
                          onChange={e => updateLocalField('home', 'newsButtonUrl', e.target.value)}
                          className="w-full bg-surface-container px-3 py-2 rounded-xl border border-outline-variant/30 outline-none focus:border-primary transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== Contact Page CMS ===== */}
              <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-outline-variant/20 bg-surface-container/30 flex items-center justify-between">
                  <h3 className="font-black flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">contact_support</span>
                    </div>
                    Página de Contacto
                  </h3>
                  <button
                    onClick={() => handleSaveContent('contacto')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {isSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                    Guardar
                  </button>
                </div>
                <div className="p-6 space-y-5 flex-grow">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-primary ml-1">Título de la página</label>
                    <p className="text-[10px] text-on-surface-variant ml-1 mb-1">El título grande que ven los visitantes al entrar en Contacto.</p>
                    <input
                      type="text"
                      value={contactData.title ?? ''}
                      onChange={e => updateLocalField('contacto', 'title', e.target.value)}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-primary ml-1">Email de contacto</label>
                    <p className="text-[10px] text-on-surface-variant ml-1 mb-1">El email que se muestra públicamente para que los clientes te escriban.</p>
                    <input
                      type="email"
                      value={contactData.email ?? ''}
                      onChange={e => updateLocalField('contacto', 'email', e.target.value)}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-primary ml-1">Teléfono</label>
                    <p className="text-[10px] text-on-surface-variant ml-1 mb-1">El teléfono visible en la página de contacto.</p>
                    <input
                      type="text"
                      value={contactData.phone ?? ''}
                      onChange={e => updateLocalField('contacto', 'phone', e.target.value)}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-primary ml-1">Ubicación / Dirección</label>
                    <p className="text-[10px] text-on-surface-variant ml-1 mb-1">La dirección que aparece en el mapa de la página de contacto.</p>
                    <input
                      type="text"
                      value={contactData.location ?? ''}
                      onChange={e => updateLocalField('contacto', 'location', e.target.value)}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Media Management ===== */}
            <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/30 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant/20 bg-surface-container/30 flex items-center justify-between">
                <h3 className="font-black flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">image</span>
                  </div>
                  Imágenes y Multimedia
                </h3>
                <button
                  onClick={() => handleSaveContent('home')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
                >
                  {isSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                  Guardar
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hero Image */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-primary">Imagen de portada (Hero)</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1">La imagen de fondo que aparece al entrar en la web. Se muestra con efecto de transparencia sobre el fondo oscuro.</p>
                    </div>
                    <label className="cursor-pointer shrink-0 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-xs hover:bg-primary/20 transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Subir imagen
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && handleCMSImageUpload('home', 'heroImage', e.target.files[0])} />
                    </label>
                  </div>
                  <div className="relative w-full rounded-3xl overflow-hidden border-4 border-outline-variant/30 shadow-2xl" style={{ aspectRatio: '16/8', background: '#0a0a0f' }}>
                    {/* Simulaci├│n del Hero Real */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-[#0a0a0f] z-10"></div>
                    {homeData.heroImage ? (
                      <img src={homeData.heroImage} alt="Preview Hero" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/5 bg-surface-container">
                        <span className="material-symbols-outlined text-8xl">image</span>
                      </div>
                    )}
                    
                    {/* Contenido exactamente igual a Home.tsx */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-[8px] font-black uppercase tracking-tighter mb-4 backdrop-blur-md border border-primary/30">
                        <span className="material-symbols-outlined text-[10px]">stars</span>
                        {t.home.featured}
                      </div>
                      <h1 className="font-headline text-2xl md:text-4xl font-black text-white mb-4 tracking-tight leading-[1.1] drop-shadow-2xl max-w-lg">
                        {homeData.heroTitle || t.home.heroTitle}
                      </h1>
                      <p className="text-[10px] md:text-sm text-white/70 mb-8 max-w-md font-medium drop-shadow-lg line-clamp-2">
                        {homeData.heroSubtitle || t.home.heroSubtitle}
                      </p>
                      
                      {/* Barra de b├║squeda simulada */}
                      <div className="w-full max-w-sm relative group">
                        <div className="w-full h-10 bg-white border border-outline-variant/30 rounded-xl flex items-center px-4 shadow-xl">
                          <span className="material-symbols-outlined text-on-surface-variant text-lg">search</span>
                          <span className="ml-3 text-on-surface-variant/40 text-[10px] font-medium">{t.cards.searchPlaceholder}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute top-4 right-4 z-30 bg-primary px-3 py-1 rounded-full text-[8px] font-black text-on-primary uppercase tracking-widest shadow-lg">Vista Previa Exacta</div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button 
                      onClick={() => handleSaveContent('home')}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50"
                    >
                      {isSaving ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">save</span>
                      )}
                      Guardar Cambios Multimedia
                    </button>
                  </div>
                </div>
                {/* News Banner Image */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-primary">Imagen del banner de noticias</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1">La imagen que aparece en el bloque de noticias de la p├ígina de inicio.</p>
                    </div>
                    <label className="cursor-pointer shrink-0 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-xs hover:bg-primary/20 transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Subir imagen
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && handleCMSImageUpload('home', 'newsBannerImage', e.target.files[0])} />
                    </label>
                  </div>
                  <div className="relative w-full rounded-2xl overflow-hidden border border-outline-variant/30 bg-primary" style={{ aspectRatio: '16/7' }}>
                    <div className="absolute inset-0 z-10 flex items-center px-6 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-on-primary text-xs leading-tight line-clamp-2">{homeData.newsTitle || '┬┐Buscas las ├║ltimas noticias?'}</p>
                        <p className="text-on-primary/70 text-[8px] mt-1 line-clamp-2">{homeData.newsDescription || 'Ent├®rate de los nuevos lanzamientos...'}</p>
                        <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-on-primary text-primary rounded-xl text-[8px] font-bold">{homeData.newsButtonText || 'Ir a Noticias'}</div>
                      </div>
                      <div className="relative shrink-0 rounded-2xl overflow-hidden bg-on-primary/10 border border-on-primary/20 flex items-center justify-center" style={{width: '45%', aspectRatio: '16/10'}}>
                        {homeData.newsBannerImage ? (
                          <img src={homeData.newsBannerImage} alt="Preview Banner" className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/20 w-full h-full">
                            <span className="material-symbols-outlined text-2xl">image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary/50 text-3xl">play_circle</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 z-30 bg-black/60 px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest">Vista Previa Real</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'configuracion':
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden max-w-2xl">
            <div className="p-6 border-b border-outline-variant/20">
              <h2 className="font-bold text-lg">Configuración de la Tienda</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase mb-1">Nombre Tienda</label><input type="text" value={config.storeName} onChange={e => config.updateSettings({ storeName: e.target.value })} className="w-full bg-surface-container border border-outline-variant/30 px-3 py-2 rounded-lg outline-none text-sm" /></div>
                <div><label className="block text-xs font-bold uppercase mb-1">Email Soporte</label><input type="email" value={config.contactEmail} onChange={e => config.updateSettings({ contactEmail: e.target.value })} className="w-full bg-surface-container border border-outline-variant/30 px-3 py-2 rounded-lg outline-none text-sm" /></div>
              </div>
              <div><label className="block text-xs font-black uppercase mb-1">Descripción</label><textarea value={config.shortDescription} onChange={e => config.updateSettings({ shortDescription: e.target.value })} className="w-full bg-surface-container border border-outline-variant/30 px-4 py-3 rounded-xl outline-none text-sm h-24 resize-none"></textarea></div>
              <div className="pt-4 border-t border-outline-variant/20 flex justify-end">
                 <button onClick={handleSaveSettings} disabled={isSaving} className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50">
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                 </button>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'productos', label: 'Productos', icon: 'inventory_2' },
    { id: 'categorias', label: 'Categorías', icon: 'category' },
    { id: 'contenido', label: 'Contenido Web', icon: 'edit_note' },
    { id: 'pedidos', label: 'Pedidos', icon: 'shopping_bag' },
    { id: 'mensajes', label: 'Mensajes', icon: 'forum' },
    { id: 'citas', label: 'Citas', icon: 'event' },
    { id: 'usuarios', label: 'Usuarios', icon: 'group' },
    { id: 'noticias', label: 'Noticias', icon: 'newspaper' },
    { id: 'paginas', label: 'Páginas y Legal', icon: 'article' },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container border-r border-outline-variant/20 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined filled-icon text-primary text-2xl">auto_awesome</span>
            <span className="font-headline font-bold text-lg text-primary">Admin Panel</span>
          </div>
        </div>
        
        <nav className="flex-grow py-6 px-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-primary-container text-on-primary-container' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="flex-grow text-left text-sm">{item.label}</span>
              {item.id === 'citas' && pendingAppointments.length > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-warning text-on-warning text-[10px] font-bold flex items-center justify-center">
                  {pendingAppointments.length}
                </span>
              )}
              {item.id === 'mensajes' && unreadMessages.length > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
                  {unreadMessages.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-outline-variant/20 flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-lg text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Ir a Tienda
          </Link>
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 px-4 py-2 text-error hover:bg-error/10 rounded-lg text-sm transition-colors text-left">
            <span className="material-symbols-outlined text-[20px]">exit_to_app</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between px-8 shrink-0 z-10 relative">
          <h1 className="font-headline font-bold text-xl capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors relative"
            >
              <span className="material-symbols-outlined">notifications</span>
              {(pendingAppointments.length > 0 || unreadMessages.length > 0) && <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>}
            </button>
            
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)} 
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold relative focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            >
              {auth.currentUser?.email?.charAt(0).toUpperCase() || 'A'}
            </button>
            
            {showProfileMenu && (
              <div className="absolute top-full right-8 mt-2 w-48 bg-surface-container-lowest border border-outline-variant/20 shadow-lg rounded-xl overflow-hidden z-20">
                <div className="p-4 border-b border-outline-variant/20 flex flex-col gap-1">
                  <span className="font-bold text-sm text-on-surface">Administrador</span>
                  <span className="text-xs text-on-surface-variant truncate">{auth.currentUser?.email}</span>
                </div>
                <div className="p-2 flex flex-col">
                  <button onClick={() => { setShowProfileMenu(false); setActiveTab('configuracion') }} className="px-4 py-2 text-xs text-left hover:bg-surface-container-high rounded-lg transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">settings</span> Ajustes
                  </button>
                  <button onClick={() => signOut(auth)} className="px-4 py-2 text-xs text-left text-error hover:bg-error/10 rounded-lg transition-colors mt-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">logout</span> Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-grow p-8 overflow-y-auto bg-surface-container-lowest/50">
          {renderContent()}
        </div>
      </main>

      {/* Custom Modal for Alerts and Confirmations */}
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-surface/80 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => modal.type === 'alert' && setModal({ ...modal, show: false })}
          />
          <div className="relative bg-surface-container-high rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-outline-variant/30 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-on-surface mb-2">{modal.title}</h3>
            <p className="text-on-surface-variant mb-6 text-sm">{modal.message}</p>
            <div className="flex justify-end gap-3">
              {modal.type === 'confirm' && (
                <button 
                  onClick={() => setModal({ ...modal, show: false })}
                  className="px-6 py-2 rounded-xl font-bold text-xs text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  setModal({ ...modal, show: false });
                }}
                className={`px-6 py-2 rounded-xl font-bold text-xs transition-colors ${
                  modal.type === 'confirm' ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-secondary text-on-secondary hover:bg-secondary/90'
                }`}
              >
                {modal.type === 'confirm' ? 'Confirmar' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError('Credenciales incorrectas');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest text-primary"><span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span></div>;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest p-4">
        <div className="mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined filled-icon text-primary text-5xl">auto_awesome</span>
          <span className="font-headline font-bold text-4xl text-primary">Fun Fantasy</span>
        </div>
        <form onSubmit={handleLogin} className="bg-surface-container p-8 rounded-3xl w-full max-w-md border border-outline-variant/30 shadow-2xl">
          <h2 className="font-bold text-2xl mb-2 text-center text-on-surface">Acceso Admin</h2>
          <p className="text-on-surface-variant text-center mb-8 text-sm">Gestiona tu e-commerce de Final Fantasy</p>
          
          {authError && <div className="bg-error/10 text-error p-4 rounded-xl text-sm mb-6 flex items-center gap-2 font-medium border border-error/20"><span className="material-symbols-outlined text-[18px]">error</span>{authError}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1 ml-1 text-on-surface-variant">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant/50 focus:ring-2 focus:ring-primary outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1 ml-1 text-on-surface-variant">Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant/50 focus:ring-2 focus:ring-primary outline-none transition-all" />
            </div>
          </div>
          
          <button type="submit" className="w-full py-4 bg-primary text-on-primary font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 mt-8 active:scale-[0.98]">
            Entrar al Panel
          </button>
          
          <div className="mt-6 text-center">
             <Link to="/" className="text-sm font-bold text-primary hover:underline">Volver a la tienda pública</Link>
          </div>
        </form>
      </div>
    );
  }

  return <AdminContent />;
}
