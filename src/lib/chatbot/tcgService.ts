/**
 * Servicio de conocimiento especializado sobre el TCG de Final Fantasy.
 * Proporciona contexto experto que Gemini inyecta cuando detecta consultas TCG.
 */

/** Condiciones de cartas y su significado */
export const CARD_CONDITIONS = `
## Condiciones de las cartas TCG
- **NM (Near Mint)** — Prácticamente perfecta, sin marcas visibles. El precio de referencia más alto.
- **EX (Excellent)** — Muy leve desgaste, casi imperceptible. Valor ~85-95% del NM.
- **GD (Good)** — Algo de juego, pequeñas marcas. Valor ~70-80% del NM.
- **LP (Lightly Played)** — Marcas de juego visibles. Valor ~50-65% del NM.
- **PL (Played)** — Desgaste notable, puede estar doblada o rayada. Valor ~30-45% del NM.
- **P (Poor)** — Muy deteriorada. Valor mínimo o sin valor de colección.
`;

/** Reglas básicas del TCG de Final Fantasy */
export const TCG_RULES = `
## Reglas básicas del TCG de Final Fantasy
- **Objetivo**: reducir los Puntos de Vida del rival de 8.000 a 0 dañándole con Forwards.
- **Mazo**: 50 cartas exactas, máximo 3 copias de una misma carta (por nombre).
- **Elementos**: Fuego 🔥, Hielo 💧, Viento 🌬️, Tierra 🌍, Rayo ⚡, Agua 🌊, Oscuridad 🌑, Luz ✨.
  Un mazo puede tener máximo 2 elementos distintos (excepto Oscuridad y Luz que son neutrales).
- **Tipos de cartas**:
  - **Forward** — unidades de ataque que se colocan en el campo
  - **Backup** — generan CP (Puntos de Cristal) al colocarse
  - **Summon** — hechizos de un solo uso con efectos inmediatos
  - **Monster** — criaturas especiales con habilidades únicas
- **Turno**: Activa fase → Dibuja → Juega cartas → Ataca → Termina.
- **CP**: Se genera doblando Backups activos o descartando cartas del mismo elemento.
`;

/** Guía de tasación para vender cartas */
export const VALUATION_GUIDE = `
## Guía de tasación de cartas TCG de Final Fantasy
Para valorar tus cartas, ten en cuenta:
1. **Rareza**: Common (C), Rare (R), Hero (H), Legend (L). Las Legend y Hero son las más valiosas.
2. **Edición**: Sets más antiguos y agotados suelen ser más caros. 
3. **Condición**: Ver escala NM → P. Una legend en NM puede valer 10x más que en PL.
4. **Demanda competitiva**: Cartas usadas en decks de torneo tienen más valor.
5. **Mercados de referencia**: TCGPlayer, CardMarket y eBay marcan los precios internacionales.
En Fun Fantasy hacemos valoraciones presenciales. Puedes reservar una cita desde este chat.
`;

/** Información sobre torneos */
export const TOURNAMENT_INFO = `
## Torneos y formatos de juego
- **Constructed**: juegas con tu propio mazo de 50 cartas.
- **Draft**: se abren sobres y se construye el mazo en el momento del torneo.
- **Pre-release**: evento especial para probar sets nuevos antes de su salida oficial.
Los torneos oficiales están organizados por Square Enix y sus distribuidores locales.
Para eventos en Fun Fantasy, consúltanos por el formulario de contacto o el chat.
`;

/**
 * Detecta si el mensaje del usuario es sobre TCG (reglas, tasación, torneos, condiciones).
 */
export function detectsTCGQuery(message: string): boolean {
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tcgTerms = [
    'tcg', 'carta', 'cartas', 'baraja', 'mazo', 'deck', 'forward', 'backup', 'summon',
    'nm', 'near mint', 'excellent', 'played', 'condicion', 'estado', 'desgaste',
    'tasar', 'tasacion', 'valorar', 'valoracion', 'vale', 'cuanto vale', 'precio carta',
    'torneo', 'draft', 'pre-release', 'constructed', 'formato',
    'elemento', 'fuego', 'hielo', 'viento', 'tierra', 'rayo', 'oscuridad', 'luz',
    'regla', 'reglas', 'como se juega', 'cp', 'puntos de cristal',
    'legend', 'hero', 'rare', 'common', 'rareza',
  ];
  return tcgTerms.some(t => msg.includes(t));
}

/**
 * Construye el bloque de contexto TCG que se inyectará en el prompt de Gemini.
 */
export function buildTCGContext(message: string): string {
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const blocks: string[] = [];

  const needsConditions = ['nm', 'near mint', 'excellent', 'good', 'played', 'poor', 'condicion', 'estado', 'desgaste'].some(t => msg.includes(t));
  const needsRules = ['regla', 'juega', 'jugar', 'como funciona', 'forward', 'backup', 'summon', 'cp', 'elemento', 'mazo', 'deck'].some(t => msg.includes(t));
  const needsValuation = ['tasar', 'tasacion', 'valorar', 'valoracion', 'vale', 'cuanto vale', 'precio', 'vender'].some(t => msg.includes(t));
  const needsTournament = ['torneo', 'draft', 'pre-release', 'constructed', 'formato', 'evento'].some(t => msg.includes(t));

  if (needsConditions) blocks.push(CARD_CONDITIONS);
  if (needsRules) blocks.push(TCG_RULES);
  if (needsValuation) blocks.push(VALUATION_GUIDE);
  if (needsTournament) blocks.push(TOURNAMENT_INFO);

  // Si es TCG pero no se detecta una subcategoría, dar contexto general
  if (blocks.length === 0) {
    blocks.push(CARD_CONDITIONS);
    blocks.push(VALUATION_GUIDE);
  }

  return `\n[CONTEXTO TCG FINAL FANTASY]:\n${blocks.join('\n')}`;
}
