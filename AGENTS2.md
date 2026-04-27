## AGENTS

Proyecto: Tienda de productos de Final Fantasy

Rol del agente: Desarrollador web experto con 12 años de experiencia.

Objetivo: Optimizar la tienda que ya hemos creado con las especificaciones que nos ha pedido implementar el cliente.

Otros detalles importantes:
- Ten en cuenta que somos la competencia directa de Prestashop, WooComerce y Shopify, tienes que conseguir crear una tienda funcional mejor de lo que se desplegaría si se creara con alguna de esas plataformas.  

Funcionalidades nuevas pedidas por el cliente:
- Cada vez que se crea un producto, se debe generar una página exclusiva para ese producto.
- En la página de producto debe aparecer un botón de comprar y seleccionar cantidades.
- La imagen del producto debe poder ampliarse.
- Al comprar un producto, se debe guardar el producto en el carrito.
- El carrito debe mostrar todos los productos que se han añadido.
    - Debe ofrecer 3 métodos de pago: tarjeta, bizum o Paypal.
- Cuando se crea un producto, que se pueda elegir si es "Destacado" o no.
    - Si es destacado, debe aparecer en la página principal.
    - Si tiene una subcategoría asociada, debe aparecer en la página de la subcategoría.
    - Si tiene una categoría asociada, debe aparecer en la página de la categoría.
        Si las categorias no están, se crean automáticamente, igual que las subcategorias si tampoco existen.
    - Con los filtros lo mismo, si no existen, se crean automáticamente.
    De la misma manera, si no hay productos en ninguna categoria, subcategoria o sección, no deben aparecer esas categorias, subcategorias o secciones ni los filtros. SÍ deben aparecer si hay productos.
- Crear una página con el nombre "Noticias", que muestre todas las noticias publicadas.
    - Que tengamos un apartado en el panel de administración para poder publicar, editar o eliminar noticias.
    - En la página de noticias debe aparecer un botón de ver más, que lleve a la página de la noticia.
    - Se deben poder filtrar las noticias por fecha, categoría, etc.
- En el footer de la web debe aparecer un teléfono de contacto, un correo electrónico de contacto y la dirección física del negocio.
    - Y también los enlaces de las políticas de privacidad, términos de venta, política de envíos y devoluciones.
        Si no están hechos, se crean automáticamente.
- Actualmente no hay buscador de productos, se debe añadir uno en la página principal.
    - Los resultados deben mostrarse en tiempo real.
    - Y debe mostrar todos los productos que tengan que ver con la búsqueda realizada.
        Y deben mostrarse también imágenes y enlaces de las noticias que tengan que ver con la búsqueda realizada.
- Actualmente, en el apartado de novedades aparecen productos pero no están enlazados a los mismos, así que hay que enlazarlos para que si el cliente hace click se abra la página del producto.
- Vamos a añadir un apartado de Usuarios para los clientes, que actualmente no existe. 
    - Para poder comprar productos, el cliente deberá crear una cuenta. Para ello, tendremos que añadir un registro de usuarios. La cuenta podrá crearse con correo electrónico y contraseña o mediante Google.
    - No será obligatorio crear una cuenta para poder comprar productos, el cliente podrá comprar productos como invitado.
    - Crearemos también la página de "Mi Cuenta" para que el cliente pueda gestionar:
        - Datos personales
        - Direcciones de envío
        - Métodos de pago
        - Historial de pedidos

- En el panel de administración, a parte de las funcionalidades que ya tenemos activas, debemos añadir:
    - Un buscador de productos por nombre y categoria.
    - Un filtro de productos por categoria.
    - Un filtro de productos por precio.
    - Un filtro de productos por stock.
    - Poder crear, editar y eliminar categorias y secciones
    - Si el cliente manda un mensaje a través del formulario de contacto, que aparezca en el panel de administración (a parte de llegarle al correo electrónico.)
    - Poder crear, editar y eliminar noticias
    - Poder crear, editar y eliminar categorias de noticias
    - Poder crear, editar y eliminar secciones de noticias
    - El administrador debe poder editar también políticas de privacidad y términos de venta, que actualmente no están hechos, así como la política de envíos y devoluciones. Actualizaciones de normativas, etc.

- Backend (Como ya sabes como funciona todo esto):
    - TODO el backend se hará conectándonos a Firebase (Firestore), el proyecto es: ecommerce-ff-ff589

No tienes que cambiar nada de lo que ya está hecho, sólo añadir las nuevas funcionalidades.