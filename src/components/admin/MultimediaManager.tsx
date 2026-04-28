import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function MultimediaManager() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'multimedia'));
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching images:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `multimedia/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const newImg = {
        url,
        name: file.name,
        type: file.type,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'multimedia', `img_${Date.now()}`), newImg);
      fetchImages();
      setFeedback({ type: 'success', message: 'Imagen subida correctamente' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al subir imagen' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta imagen?")) return;
    try {
      await deleteDoc(doc(db, 'multimedia', id));
      setImages(images.filter(img => img.id !== id));
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Imágenes y Multimedia</h2>
        <div>
          <input 
            type="file" 
            id="multi-upload" 
            className="hidden" 
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label 
            htmlFor="multi-upload"
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold cursor-pointer flex items-center gap-2 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload_file'}</span>
            {uploading ? 'Subiendo...' : 'Subir Imagen'}
          </label>
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant">Cargando galería...</div>
        ) : images.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant italic">La galería está vacía.</div>
        ) : images.map(img => (
          <div key={img.id} className="group relative bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden aspect-square">
            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(img.url);
                  setFeedback({ type: 'success', message: 'URL copiada al portapapeles' });
                }}
                className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-xs font-bold"
              >
                Copiar URL
              </button>
              <button 
                onClick={() => handleDelete(img.id)}
                className="w-full py-2 bg-red-500/50 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Eliminar
              </button>
            </div>
            <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[8px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {img.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
