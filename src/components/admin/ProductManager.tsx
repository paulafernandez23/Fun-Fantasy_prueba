import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ProductManagerProps {
  categories: any[];
}

export default function ProductManager({ categories }: ProductManagerProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    type: 'cartas', // 'cartas' or 'merchandising'
    category: '',
    description: '',
    stock: '10',
    image: '',
    isFeatured: false,
    expansion: '',
    rarity: '',
    tags: [] as string[]
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('title', 'asc'));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      title: product.title || '',
      price: product.price || '',
      type: product.type || 'cartas',
      category: product.category || '',
      description: product.description || '',
      stock: product.stock || '10',
      image: product.image || '',
      isFeatured: product.isFeatured || false,
      expansion: product.expansion || '',
      rarity: product.rarity || '',
      tags: product.tags || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
    
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
      setFeedback({ type: 'success', message: 'Producto eliminado correctamente' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al eliminar el producto' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const dataToSave = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), dataToSave);
        setFeedback({ type: 'success', message: 'Producto actualizado correctamente' });
      } else {
        await addDoc(collection(db, 'products'), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
        setFeedback({ type: 'success', message: 'Producto creado correctamente' });
      }
      
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Error saving product:", err);
      setFeedback({ type: 'error', message: 'Error al guardar el producto' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, image: url });
    } catch (err) {
      console.error("Error uploading image:", err);
    }
  };

  const filteredCategories = categories.filter(cat => cat.section === formData.type);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-on-surface">Gestión de Productos</h2>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              title: '', price: '', type: 'cartas', category: '', description: '',
              stock: '10', image: '', isFeatured: false, expansion: '', rarity: '', tags: []
            });
            setShowForm(true);
          }}
          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo Producto
        </button>
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

      {showForm ? (
        <div className="bg-surface-container-high p-8 rounded-3xl border border-outline-variant shadow-xl animate-scale-in">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</h3>
            <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda: Datos Básicos */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Título del Producto</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary"
                    placeholder="Ej: Cloud Strife - Play Arts Kai"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Precio (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Stock</label>
                    <input 
                      type="number" 
                      required
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Sección</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any, category: ''})}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                    >
                      <option value="cartas">Cartas TCG</option>
                      <option value="merchandising">Merchandising</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Categoría</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                    >
                      <option value="">Seleccionar categoría...</option>
                      {filteredCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Descripción</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                  />
                </div>
              </div>

              {/* Columna Derecha: Imagen y Extras */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Imagen del Producto</label>
                  <div className="mt-2 flex items-center gap-4">
                    {formData.image && (
                      <img src={formData.image} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-outline-variant" />
                    )}
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden" 
                        id="prod-image-upload" 
                      />
                      <label 
                        htmlFor="prod-image-upload"
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant border-dashed rounded-xl cursor-pointer hover:bg-surface-container-highest flex flex-col items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <span className="text-xs font-bold uppercase">Subir Imagen</span>
                      </label>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    placeholder="O pega una URL de imagen..."
                    value={formData.image}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    className="mt-3 w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs"
                  />
                </div>

                {formData.type === 'cartas' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Expansión</label>
                      <input 
                        type="text" 
                        value={formData.expansion}
                        onChange={e => setFormData({...formData, expansion: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                        placeholder="Ej: Opus XIV"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Rareza</label>
                      <select 
                        value={formData.rarity}
                        onChange={e => setFormData({...formData, rarity: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Common">Common (C)</option>
                        <option value="Rare">Rare (R)</option>
                        <option value="Hero">Hero (H)</option>
                        <option value="Legend">Legend (L)</option>
                        <option value="Special">Special (S)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <input 
                    type="checkbox" 
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={e => setFormData({...formData, isFeatured: e.target.checked})}
                    className="w-5 h-5 rounded accent-primary"
                  />
                  <label htmlFor="isFeatured" className="font-bold text-primary">Producto Destacado en Inicio</label>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-8 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-6 py-4 font-bold text-sm">Producto</th>
                  <th className="px-6 py-4 font-bold text-sm">Sección</th>
                  <th className="px-6 py-4 font-bold text-sm">Categoría</th>
                  <th className="px-6 py-4 font-bold text-sm">Precio</th>
                  <th className="px-6 py-4 font-bold text-sm">Stock</th>
                  <th className="px-6 py-4 font-bold text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">Cargando productos...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">No hay productos registrados.</td>
                  </tr>
                ) : products.map(product => (
                  <tr key={product.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.image} alt="" className="w-10 h-10 object-cover rounded-lg bg-surface" />
                        <div>
                          <p className="font-bold leading-none">{product.title}</p>
                          {product.isFeatured && <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Destacado</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">{product.type}</td>
                    <td className="px-6 py-4 text-sm">{product.category}</td>
                    <td className="px-6 py-4 font-bold">{product.price}€</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${Number(product.stock) < 5 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(product)} className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
