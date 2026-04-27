/**
 * Tabla de tarifas de envío por zona geográfica.
 * Modificar estos valores para actualizar los precios de envío que el bot comunica.
 */

interface ShippingZone {
  name: string;
  countries: string[];
  price: number;
  freeFrom: number; // importe mínimo para envío gratuito (0 = nunca gratis)
  days: string;
}

const SHIPPING_ZONES: ShippingZone[] = [
  {
    name: 'España Península',
    countries: ['españa', 'spain', 'es'],
    price: 3.99,
    freeFrom: 50,
    days: '3-5 días laborables',
  },
  {
    name: 'Islas Canarias y Baleares',
    countries: ['canarias', 'baleares', 'islas'],
    price: 6.99,
    freeFrom: 75,
    days: '5-7 días laborables',
  },
  {
    name: 'Europa',
    countries: [
      'alemania', 'germany', 'de',
      'francia', 'france', 'fr',
      'italia', 'italy', 'it',
      'portugal', 'pt',
      'holanda', 'netherlands', 'nl',
      'bélgica', 'belgium', 'be',
      'austria', 'at',
      'suiza', 'switzerland', 'ch',
      'polonia', 'poland', 'pl',
      'europa', 'europe',
    ],
    price: 9.99,
    freeFrom: 100,
    days: '7-10 días laborables',
  },
  {
    name: 'Internacional',
    countries: ['resto', 'internacional', 'internacional', 'worldwide', 'world'],
    price: 19.99,
    freeFrom: 0,
    days: '15-20 días laborables',
  },
];

export interface ShippingEstimate {
  zone: string;
  price: number;
  freeFrom: number;
  days: string;
  isFree: boolean;
}

/**
 * Calcula el coste de envío para una zona geográfica y un importe de pedido.
 * @param location - País o zona indicada por el usuario (texto libre)
 * @param orderAmount - Importe del pedido en euros (para calcular si aplica envío gratis)
 */
export function calculateShipping(location: string, orderAmount = 0): ShippingEstimate | null {
  const loc = location.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const zone = SHIPPING_ZONES.find(z =>
    z.countries.some(c => loc.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  );

  if (!zone) return null;

  const isFree = zone.freeFrom > 0 && orderAmount >= zone.freeFrom;

  return {
    zone: zone.name,
    price: zone.price,
    freeFrom: zone.freeFrom,
    days: zone.days,
    isFree,
  };
}

/**
 * Formatea el resultado del cálculo de envío para mostrarlo en el chat.
 */
export function formatShippingEstimate(estimate: ShippingEstimate, orderAmount = 0): string {
  const lines = [
    `📦 **Zona**: ${estimate.zone}`,
    `🕐 **Plazo**: ${estimate.days}`,
  ];

  if (estimate.isFree) {
    lines.push('✅ **Envío gratuito** (pedido superior al mínimo)');
  } else {
    lines.push(`💶 **Coste de envío**: ${estimate.price.toFixed(2)}€`);
    if (estimate.freeFrom > 0) {
      const remaining = estimate.freeFrom - orderAmount;
      lines.push(
        `💡 Añade ${remaining.toFixed(2)}€ más a tu pedido para obtener **envío gratuito**.`
      );
    }
  }

  return lines.join('\n');
}
