/**
 * Configuración estática de la tienda usada por el chatbot.
 * Modifica estos valores para actualizar lo que el bot sabe de la tienda.
 */

export const STORE_CONFIG = {
  nombre: 'Fun Fantasy',
  descripcion: 'Tienda especializada en cartas coleccionables y merchandising de Final Fantasy.',
  email: 'soporte@funfantasy.com',
  telefono: '+34 600 000 000',
  direccion: 'Calle de la Fantasía, 1 - Madrid, España',
  horario: {
    semana: 'Lunes a Viernes: 10:00 - 20:00',
    sabado: 'Sábados: 10:00 - 14:00',
    domingo: 'Domingos: Cerrado',
  },
  redesSociales: {
    instagram: '@funfantasy',
    twitter: '@funfantasy',
  },
  politicas: {
    devoluciones: `Aceptamos devoluciones dentro de los 14 días naturales desde la recepción del pedido. 
El producto debe estar en perfecto estado y con su embalaje original. 
Para iniciar una devolución, escríbenos a soporte@funfantasy.com con tu número de pedido.`,
    envios: `Enviamos a toda España y Europa. 
- España península: 3-5 días laborables (envío gratuito en pedidos superiores a 50€)
- Islas Canarias/Baleares: 5-7 días laborables
- Europa: 7-10 días laborables
Todos los pedidos incluyen número de seguimiento.`,
    pagos: `Aceptamos las siguientes formas de pago:
- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- PayPal
- Transferencia bancaria
- Bizum (solo España)
Todos los pagos son procesados de forma segura con cifrado SSL.`,
  },
  compraDeCartas: {
    descripcion: `Compramos cartas del TCG de Final Fantasy en tu tienda física.
Puedes reservar una cita para que nuestro equipo valore y compre tu colección.
Traer las cartas en buen estado mejora la valoración. Se recomienda enfundarlas.`,
    condiciones: `- Las cartas deben estar en condición Near Mint (NM) o Excellent (EX) para el mejor precio.
- Hacemos ofertas por lotes de 10 o más cartas.
- El pago es inmediato en efectivo o transferencia.`,
  },
  seoKeywords: ['Final Fantasy TCG', 'cartas coleccionables', 'merchandising Final Fantasy', 'compra venta cartas'],
};

/** Sugerencias rápidas que aparecen al abrir el chat */
export const QUICK_SUGGESTIONS = [
  '¿Cuánto tarda el envío?',
  '¿Cómo puedo devolver un producto?',
  'Quiero vender mis cartas',
  '📷 Identificar una carta',
  '¿Cuál es vuestro horario?',
];
