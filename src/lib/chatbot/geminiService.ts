import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt } from './chatContext';
import { useSettingsStore } from '../../store/settingsStore';
import {
  searchProducts,
  getLatestProducts,
  formatProductsForGemini,
  formatStockInfo,
} from './productSearch';
import { calculateShipping, formatShippingEstimate } from './shippingCalculator';
import { getAppointments, saveAppointment, validateAppointment, formatDate } from './appointmentService';
import { subscribeToNewsletter } from './newsletterService';
import { getLoyaltyByEmail, createLoyaltyAccount, getLevelInfo } from './loyaltyService';
import { detectsTCGQuery, buildTCGContext } from './tcgService';

/** Tipos de mensaje en el historial de conversación */
export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

/** Instancia singleton de Gemini */
let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Falta la variable de entorno VITE_GEMINI_API_KEY');
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

// ─── Helpers de detección simples ─────────────────────────────────────────

/** ¿El mensaje incluye alguna de estas palabras? */
function includes(msg: string, words: string[]): boolean {
  const normalized = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return words.some(w =>
    normalized.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  );
}

/** Extrae el país/zona mencionado en el mensaje para cálculo de envío */
function extractLocation(msg: string): string | null {
  const zones = [
    'españa', 'spain', 'peninsula',
    'canarias', 'baleares',
    'alemania', 'germany', 'francia', 'france', 'italia', 'italy',
    'portugal', 'holanda', 'belgica', 'austria', 'suiza', 'polonia',
    'europa', 'europe',
    'reino unido', 'uk', 'mexico', 'argentina', 'chile', 'colombia',
  ];
  const normalized = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return zones.find(z =>
    normalized.includes(z.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  ) ?? null;
}

// ─── Construcción del contexto dinámico ────────────────────────────────────

/**
 * Siempre busca en Firestore con el mensaje completo como término de búsqueda.
 * Añade contexto adicional para envíos, stock y novedades según palabras clave.
 */
async function buildDynamicContext(userMessage: string, cartTotal: number): Promise<string> {
  const contexts: string[] = [];
  const msg = userMessage.toLowerCase();

  // ── 1. Búsqueda de productos siempre activa ──
  // Buscamos con el mensaje completo, Firestore filtra por título/desc/tags
  try {
    const products = await searchProducts(userMessage);
    if (products.length > 0) {
      contexts.push(
        `\n[PRODUCTOS ENCONTRADOS EN FIRESTORE]:\n${formatProductsForGemini(products, true)}\n` +
        `Muestra estos resultados al usuario de forma clara y atractiva.\n` +
        `Para cada carta indica que puede verla en /cartas y para merchandising en /merchandising.`
      );
    } else {
      // Inform Gemini explicitly: no hay nada en el catálogo para este término
      contexts.push(
        `\n[BÚSQUEDA EN FIRESTORE: SIN RESULTADOS]\n` +
        `No existe ningún producto en nuestro catálogo que coincida con la consulta del usuario.\n` +
        `Díselo de forma clara y amigable. Puedes sugerirle que visite /cartas o /merchandising para ver ` +
        `el catálogo completo, o que contacte con la tienda si busca algo muy específico.\n` +
        `NO digas que no tienes acceso al inventario — la búsqueda ya se ha realizado y no hay resultados.`
      );
    }
  } catch {
    // Si Firestore falla, Gemini responderá con su conocimiento general
  }

  // ── 2. Novedades ──
  if (includes(msg, ['novedad', 'nuevo', 'nuevos', 'reciente', 'ultima', 'ultimas', 'recien llegado'])) {
    try {
      const latest = await getLatestProducts();
      if (latest.length > 0) {
        contexts.push(
          `\n[ÚLTIMOS PRODUCTOS DEL CATÁLOGO]:\n${formatProductsForGemini(latest, true)}\n` +
          `Muéstralos al usuario como novedades destacadas.`
        );
      }
    } catch { /* silencioso */ }
  }

  // ── 3. Información de envíos ──
  if (includes(msg, ['envio', 'envios', 'enviar', 'shipping', 'gastos', 'entrega', 'entregan', 'reparte', 'transporte'])) {
    const location = extractLocation(msg);
    if (location) {
      const estimate = calculateShipping(location, cartTotal);
      if (estimate) {
        contexts.push(
          `\n[INFORMACIÓN DE ENVÍO para ${location}]:\n${formatShippingEstimate(estimate, cartTotal)}\n` +
          `Comunica estos datos al usuario de forma clara.`
        );
      }
    } else {
      contexts.push(
        `\n[ZONAS Y TARIFAS DE ENVÍO]:
- 🇪🇸 España Península: 3.99€ (gratis desde 50€) — 3-5 días laborables
- 🏝️ Canarias/Baleares: 6.99€ (gratis desde 75€) — 5-7 días laborables
- 🇪🇺 Europa: 9.99€ (gratis desde 100€) — 7-10 días laborables
- 🌍 Internacional: 19.99€ — 15-20 días laborables
Si el usuario menciona su país específico, dale el precio exacto de esa zona.`
      );
    }
  }

  // ── 4. Información de stock explícita ──
  if (includes(msg, ['stock', 'queda', 'quedan', 'agotado', 'hay unidades', 'disponible'])) {
    // Buscamos con las palabras de stock eliminadas para obtener el nombre del producto
    const productTerm = msg
      .replace(/stock|queda[ns]?|agotado|disponible|hay|unidades?/g, '')
      .replace(/[¿?¡!]/g, '')
      .trim();

    if (productTerm.length > 2) {
      try {
        const results = await searchProducts(productTerm);
        if (results.length > 0) {
          const stockLines = results.map(p => `"${p.title}": ${formatStockInfo(p)}`).join('\n');
          contexts.push(
            `\n[CONSULTA DE STOCK]:\n${stockLines}\n` +
            `Comunica esta información de stock al usuario de forma directa y clara.`
          );
        }
      } catch { /* silencioso */ }
    }
  }

  // ── 5. Contexto TCG especializado ──
  if (detectsTCGQuery(userMessage)) {
    contexts.push(buildTCGContext(userMessage));
  }

  return contexts.join('\n');
}

// ─── Procesar bloques de acción ─────────────────────────────────────────────

/**
 * Busca y procesa bloques de acción en formato markdown (```tipo JSON ```).
 * Esto evita que el JSON "feo" aparezca en el chat y permite ejecutar lógica.
 */
async function processActionBlocks(responseText: string): Promise<string> {
  let processedText = responseText;

  // 1. Citas (Appointments)
  const apptMatch = processedText.match(/```appointment\s*([\s\S]*?)```/);
  if (apptMatch) {
    try {
      const data = JSON.parse(apptMatch[1].trim());
      const validationError = validateAppointment(data);
      if (!validationError) {
        const saved = await saveAppointment(data);
        const confirmMsg = [
          `\n---`,
          `✅ **Cita registrada correctamente** (Ref: \`${saved.id?.slice(0, 8)}\`)`,
          `📅 **Fecha**: ${formatDate(data.date)} a las ${data.time}h`,
          `📋 **Cartas**: ${data.cardDescription}`,
          `\nEl equipo de Fun Fantasy se pondrá en contacto contigo en ${data.contact} para confirmar la cita. ¡Hasta pronto! ✨`,
          `---`,
        ].join('\n');
        processedText = processedText.replace(/```appointment[\s\S]*?```/, confirmMsg);
      } else {
        processedText = processedText.replace(/```appointment[\s\S]*?```/, '').trim();
      }
    } catch {
      processedText = processedText.replace(/```appointment[\s\S]*?```/, '').trim();
    }
  }

  // 2. Newsletter
  const newsMatch = processedText.match(/```newsletter\s*([\s\S]*?)```/);
  if (newsMatch) {
    try {
      const data = JSON.parse(newsMatch[1].trim());
      await subscribeToNewsletter(data.name, data.email);
      const confirmMsg = `\n\n✅ ¡Genial! He suscrito a **${data.name}** (${data.email}) a nuestra newsletter. ¡Recibirás las mejores ofertas! ✨`;
      processedText = processedText.replace(/```newsletter[\s\S]*?```/, confirmMsg);
    } catch (error: any) {
      processedText = processedText.replace(/```newsletter[\s\S]*?```/, `\n\n❌ Error en suscripción: ${error.message}`);
    }
  }

  // 3. Fidelización (Loyalty Query/Create)
  const loyaltyMatch = processedText.match(/```loyalty\s*([\s\S]*?)```/);
  if (loyaltyMatch) {
    try {
      const data = JSON.parse(loyaltyMatch[1].trim());
      
      if (data.type === 'query') {
        const loyalty = await getLoyaltyByEmail(data.email);
        if (!loyalty) {
          processedText = processedText.replace(/```loyalty[\s\S]*?```/, `\n\n🔍 No he encontrado ninguna cuenta asociada a **${data.email}**. ¿Te gustaría crear una ahora?`);
        } else {
          const info = getLevelInfo(loyalty.points);
          const msg = [
            `\n\n💎 **Estado de fidelidad para ${loyalty.name}**:`,
            `• **Puntos**: ${loyalty.points} pts | **Nivel**: ${loyalty.level}`,
            `• **Beneficio**: ${info.current.benefit}`,
            info.next ? `• **Próximo nivel**: ${info.next.name} (${info.pointsToNext} pts pendientes)` : `• ¡Nivel máximo! 🏆`
          ].join('\n');
          processedText = processedText.replace(/```loyalty[\s\S]*?```/, msg);
        }
      } else if (data.type === 'create') {
        await createLoyaltyAccount(data.name, data.email);
        processedText = processedText.replace(/```loyalty[\s\S]*?```/, `\n\n🎉 ¡Bienvenido al Club, **${data.name}**! Cuenta activa con **${data.email}**. Nivel: **Bronce**. 💎`);
      }
    } catch {
      processedText = processedText.replace(/```loyalty[\s\S]*?```/, '').trim();
    }
  }

  // 4. Limpieza final de posibles bloques JSON sueltos que Gemini pueda generar por error
  processedText = processedText.replace(/```json[\s\S]*?```/g, '').trim();

  return processedText;
}

// ─── Función principal ─────────────────────────────────────────────────────

/**
 * Envía un mensaje al chatbot y recibe la respuesta de Gemini.
 * Soporta mensajes multimodales (texto + imagen) para identificación de cartas.
 * @param userMessage - El texto del usuario
 * @param history - Historial previo de mensajes
 * @param cartTotal - Total del carrito para calcular envío gratuito
 * @param imageBase64 - Imagen en base64 (sin prefijo data:...)
 * @param imageMimeType - MIME type de la imagen (image/jpeg, image/png, etc.)
 */
export async function sendChatMessage(
  userMessage: string,
  history: ChatMessage[],
  cartTotal = 0,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const genAI = getGenAI();

  const dynamicContext = await buildDynamicContext(userMessage, cartTotal);

  const systemPrompt =
    buildSystemPrompt() +
    (dynamicContext
      ? `\n\n## Contexto en tiempo real de esta consulta\n${dynamicContext}`
      : '');

  // Construir las partes del último mensaje del usuario (texto + imagen opcional)
  const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userMessage || '(El usuario ha enviado una imagen de una carta)' },
  ];

  if (imageBase64 && imageMimeType) {
    userParts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
  }

  const contents = [
    ...history,
    { role: 'user' as const, parts: userParts },
  ];

  const response = await genAI.models.generateContent({
    model: 'gemini-flash-latest',
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const text = response.text ?? 'Lo siento, no he podido generar una respuesta. Por favor, inténtalo de nuevo.';
  
  // Ejecutar acciones y limpiar bloques JSON
  const finalResponse = await processActionBlocks(text);
  
  return finalResponse;
}
