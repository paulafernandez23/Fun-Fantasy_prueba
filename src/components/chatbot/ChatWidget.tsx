import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useCartStore } from '../../store/cartStore';
import { sendChatMessage } from '../../lib/chatbot/geminiService';
import { QUICK_SUGGESTIONS } from '../../lib/chatbot/storeConfig';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const WELCOME_MESSAGE =
  '¡Hola! 👋 Soy **Cristal**, tu asistente de Fun Fantasy. ¿En qué puedo ayudarte hoy?\n\nPuedo ayudarte a encontrar productos, consultar el stock, calcular gastos de envío, y mucho más. ✨';

export default function ChatWidget() {
  const {
    isOpen,
    isTyping,
    messages,
    geminiHistory,
    hasGreeted,
    toggleChat,
    closeChat,
    setTyping,
    addUserMessage,
    addBotMessage,
    addToGeminiHistory,
    setGreeted,
  } = useChatStore();

  // Total del carrito para calcular envío gratuito automáticamente
  const cartItems = useCartStore(state => state.items);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático al nuevo mensaje
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Mensaje de bienvenida al abrir por primera vez
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      addBotMessage(WELCOME_MESSAGE);
      setGreeted();
    }
  }, [isOpen, hasGreeted, addBotMessage, setGreeted]);

  async function handleSend(text: string, imageFile?: File) {
    // Convertir imagen a base64 si la hay
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    let imageUrl: string | undefined;

    if (imageFile) {
      imageMimeType = imageFile.type;
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
      // El data URL tiene formato "data:image/jpeg;base64,XXXX"
      // Gemini necesita solo la parte base64 sin el prefijo
      imageBase64 = imageUrl.split(',')[1];
    }

    const displayText = text || '📷 (imagen adjunta)';
    addUserMessage(displayText, imageUrl);
    addToGeminiHistory('user', displayText);
    setTyping(true);

    try {
      const response = await sendChatMessage(text, geminiHistory, cartTotal, imageBase64, imageMimeType);
      addBotMessage(response);
      addToGeminiHistory('model', response);
    } catch (error) {
      console.error('Error al comunicarse con Gemini:', error);
      const isQuotaError = error instanceof Error && error.message.includes('429');
      addBotMessage(
        isQuotaError
          ? 'Lo siento, el asistente está temporalmente no disponible por límite de uso. Por favor, inténtalo en unos minutos o [contacta con nosotros](/contacto). 🙏'
          : 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo o [contacta con nosotros](/contacto).'
      );
    } finally {
      setTyping(false);
    }
  }

  function handleQuickSuggestion(suggestion: string) {
    handleSend(suggestion);
  }

  return (
    <>
      {/* ===== PANEL DEL CHAT ===== */}
      <div
        id="chat-panel"
        role="dialog"
        aria-label="Chat de asistencia Fun Fantasy"
        aria-modal="true"
        className={`
          fixed bottom-24 right-4 sm:right-6 z-50
          w-[calc(100vw-2rem)] sm:w-[390px]
          flex flex-col bg-surface-container-lowest border border-outline-variant/30
          rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-300 ease-out origin-bottom-right
          ${isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
          }
        `}
        style={{ maxHeight: 'min(600px, calc(100vh - 8rem))' }}
      >
        {/* Cabecera */}
        <header className="flex items-center justify-between px-4 py-3 bg-primary text-on-primary flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-on-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined filled-icon text-on-primary text-base">
                auto_awesome
              </span>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Cristal</p>
              <p className="text-xs opacity-80 leading-tight">Asistente de Fun Fantasy</p>
            </div>
          </div>
          <button
            id="chat-close-btn"
            onClick={closeChat}
            aria-label="Cerrar chat"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-on-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </header>

        {/* Lista de mensajes */}
        <div
          id="chat-messages"
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          style={{ minHeight: '200px' }}
        >
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Indicador "escribiendo..." */}
          {isTyping && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-1">
                <span className="material-symbols-outlined text-on-primary filled-icon text-sm">
                  auto_awesome
                </span>
              </div>
              <div className="bg-surface-container px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-on-surface-variant/50 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-on-surface-variant/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-on-surface-variant/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Sugerencias rápidas (solo si no hay mensajes del usuario aún) */}
          {!isTyping && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="
                    text-xs px-3 py-1.5 rounded-full border border-outline-variant/50
                    bg-surface-container text-on-surface-variant
                    hover:border-primary hover:text-primary hover:bg-primary-container/30
                    transition-colors text-left
                  "
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>

      {/* ===== BOTÓN FLOTANTE ===== */}
      <button
        id="chat-toggle-btn"
        onClick={toggleChat}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat de asistencia'}
        aria-expanded={isOpen}
        aria-controls="chat-panel"
        className={`
          fixed bottom-5 right-4 sm:right-6 z-50
          w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-surface-container text-on-surface rotate-0 scale-90'
            : 'bg-primary text-on-primary rotate-0 scale-100 hover:scale-110'
          }
        `}
      >
        <span
          className={`material-symbols-outlined filled-icon text-2xl transition-all duration-300 ${
            isOpen ? 'rotate-180 opacity-60' : 'rotate-0 opacity-100'
          }`}
        >
          {isOpen ? 'close' : 'chat'}
        </span>

        {/* Pulso animado cuando está cerrado */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25 pointer-events-none" />
        )}
      </button>
    </>
  );
}
