## AGENTS


Proyecto: Tienda de productos de Final Fantasy

Rol del agente: Desarrollador web experto con 12 años de experiencia.

Objetivo: Crear una tienda de productos de Final Fantasy (TCG, Merchandising y una página de contacto). Al ser una tienda, tendrá plataforma de pago seguro, un carrito y todas las funcionalidades de una tienda online. 

Otros detalles importantes:
- Eres la competencia directa de Prestashop, WooComerce y Shopify, tienes que conseguir crear una tienda funcional mejor de lo que se desplegaría si se creara con alguna de esas plataformas.  

Funcionalidades de la aplicación:
- Parte publica:
    - Pagina home
    - Sección TCG
    - Sección Merchandising
    - Página de contacto (con formulario de contacto)
    - Navegación entre secciones
    - Carrito de la compra
    - Optimización seo básica

- Parte privada (sólo podrá acceder el administrador):
    - Panel de administración de productos:
        - Listado de productos
        - Formulario de creación de productos
        - Edición de productos
        - Eliminación de productos
        - Gestión de usuarios (sólo podrá acceder el administrador)
        - Cualquier otra funcionalidad necesaria para la administración de la e-commerce.

- Backend:
    - Toda la parte del panel de administración se hará conectándose a Firebase, pero el administrador debe poder editar los productos desde el panel de administración sin necesidad de hacer nada en la base de datos de forma técnica.
    - Haremos el backend en Firebase (Firestore), el proyecto es: ecommerce-ff-ff589
    - Login y autenticación de usuarios con Firebase Auth (sólo habrá un administrador)
    - Y se guardarán los productos en Cloud Firestore de Firebase y las imágenes en Cloud Storage.

Stack de tecnología:
- HTML5
- CSS3
- TailwindCSS
- JavaScript
- React
- Firebase

Preferencias generales importantes:
- Todos los textos visibles en la aplicación web debe estar en Español.

Preferencias de diseño:
- Básate en las imágenes del diseño y en el HTML del diseño que tienes en la carpeta design del proyecto.

Preferencias de estilos:
- Colores (los del diseño)
- Que la webapp sea responsive

Preferencias de código:
- No añadas dependencias externas
- HTML debe ser semántico
- No uses alert, confirm, prompt, todo el feedback debe ser visual en el dom
- Prioriza el código legible y mantenible
- Prioriza que el código sea sencillo de entender
- Si el agente duda, que revise las especificaciones del proyecto y si no que pregunte al usuario

Estructura de archivos:
- la estructura de archivos del framework que estamos usando.
