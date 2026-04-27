/**
 * Convierte una URL de Firebase Storage en una URL amigable para SEO servida por Hosting.
 * Ejemplo: https://firebasestorage.../o/product-images%2Fimagen.jpg?alt=media... 
 * se convierte en /pimg/imagen.jpg
 */
export const getSEOImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  // Si ya es una URL de proxy, un blob o base64, no hacer nada
  if (url.startsWith('/productos/') || url.startsWith('/pimg/') || url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Detectar si es una URL de Firebase Storage
  if (url.includes('firebasestorage.googleapis.com') || url.includes('appspot.com')) {
    // Extraer el nombre del archivo de la URL
    const matches = url.match(/\/o\/product-images%2F([^?#]+)/);
    
    if (matches && matches[1]) {
      // Limpiar el nombre del archivo: quitar timestamp y extensión para URL ultra-limpia
      // Ejemplo: peluche-kuja-123456789.png -> peluche-kuja
      const fileNameWithExt = matches[1];
      const cleanFileName = fileNameWithExt
        .replace(/-\d+(?=\.[a-z]+$|$)/i, '') // Quita el timestamp (-12345)
        .replace(/\.[a-z0-9]+$/i, '');       // Quita la extensión final de forma más robusta
      
      const proxyPath = `/productos/${cleanFileName}`;
      
      // Si estamos en localhost, necesitamos la URL completa de producción para que funcione el proxy
      if (typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return `https://ecommerce-ff-ff589.web.app${proxyPath}`;
      }
      
      return proxyPath;
    }
  }

  return url;
};

/**
 * Actualiza dinámicamente las etiquetas meta de la página para mejorar el SEO en SPAs.
 */
interface MetaTags {
  title: string;
  description: string;
  image?: string;
  keywords?: string;
  type?: string;
}

export const updateMetaTags = ({ title, description, image, keywords, type = 'website' }: MetaTags) => {
  if (typeof document === 'undefined') return;

  // Actualizar Título
  document.title = title;

  const updateMeta = (selector: string, attrName: string, attrValue: string, content: string) => {
    if (!content) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Meta Description
  updateMeta('meta[name="description"]', 'name', 'description', description);
  
  // Keywords
  if (keywords) {
    updateMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
  }

  // Open Graph / Facebook
  updateMeta('meta[property="og:title"]', 'property', 'og:title', title);
  updateMeta('meta[property="og:description"]', 'property', 'og:description', description);
  updateMeta('meta[property="og:type"]', 'property', 'og:type', type);
  
  if (image) {
    updateMeta('meta[property="og:image"]', 'property', 'og:image', image);
  }

  // Twitter
  updateMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  if (image) {
    updateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
  }
};
