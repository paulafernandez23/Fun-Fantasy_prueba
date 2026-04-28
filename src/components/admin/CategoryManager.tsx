import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

interface CategoryManagerProps {
  categories: any[];
  onRefresh: () => void;
}

export default function CategoryManager({ categories, onRefresh }: CategoryManagerProps) {
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    section: 'cartas' // 'cartas' or 'merchandising'
  });

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      section: category.section || 'cartas'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro? Los productos en esta categoría no se eliminarán, pero perderán su etiqueta de categoría.")) return;
    
    try {
      await deleteDoc(doc(db, 'categories', id));
      onRefresh();
      setFeedback({ type: 'success', message: 'Categoría eliminada' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al eliminar' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), formData);
        setFeedback({ type: 'success', message: 'Categoría actualizada' });
      } else {
        await addDoc(collection(db, 'categories'), formData);
        setFeedback({ type: 'success', message: 'Categoría creada' });
      }
      
      setShowForm(false);
      setEditingCategory(null);
      onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al guardar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Categorías</h2>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', section: 'cartas' });
            setShowForm(true);
          }}
          className="px-6 py-3 bg-secondary text-on-secondary rounded-xl font-bold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">category</span>
          Nueva Categoría
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

      {showForm && (
        <div className="bg-surface-container-high p-8 rounded-3xl border border-outline-variant shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-4">
              <label className="block text-sm font-bold">Nombre de la Categoría</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
                placeholder="Ej: Figuras de Acción"
              />
            </div>
            <div className="w-full md:w-64 space-y-4">
              <label className="block text-sm font-bold">Sección de la Tienda</label>
              <select 
                value={formData.section}
                onChange={e => setFormData({...formData, section: e.target.value})}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl"
              >
                <option value="cartas">Cartas TCG</option>
                <option value="merchandising">Merchandising</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-50"
              >
                {isSubmitting ? '...' : editingCategory ? 'Actualizar' : 'Crear'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-surface-container-highest text-on-surface rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* TCG Categories */}
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">playing_cards</span>
            Categorías TCG
          </h3>
          <div className="space-y-2">
            {categories.filter(c => c.section === 'cartas').map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-3 bg-surface-container-high rounded-xl border border-outline-variant/30">
                <span className="font-medium">{cat.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
            {categories.filter(c => c.section === 'cartas').length === 0 && (
              <p className="text-sm text-on-surface-variant italic">No hay categorías para TCG.</p>
            )}
          </div>
        </div>

        {/* Merchandising Categories */}
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">shopping_bag</span>
            Categorías Merchandising
          </h3>
          <div className="space-y-2">
            {categories.filter(c => c.section === 'merchandising').map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-3 bg-surface-container-high rounded-xl border border-outline-variant/30">
                <span className="font-medium">{cat.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
            {categories.filter(c => c.section === 'merchandising').length === 0 && (
              <p className="text-sm text-on-surface-variant italic">No hay categorías para Merchandising.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
