import { create } from 'zustand';
import { ChatMessage } from '../lib/chatbot/geminiService';

/** Mensaje tal como lo ve el componente de UI */
export interface UIMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  /** Data URL de imagen adjunta (solo mensajes de usuario) */
  imageUrl?: string;
}

interface ChatStore {
  /** Si el panel del chat está abierto */
  isOpen: boolean;
  /** Si el bot está procesando una respuesta */
  isTyping: boolean;
  /** Mensajes visibles en la UI */
  messages: UIMessage[];
  /** Historial formateado para Gemini (sin mensajes de bienvenida artificiales) */
  geminiHistory: ChatMessage[];
  /** Si ya se mostró el mensaje de bienvenida */
  hasGreeted: boolean;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setTyping: (typing: boolean) => void;
  addUserMessage: (text: string, imageUrl?: string) => void;
  addBotMessage: (text: string) => void;
  addToGeminiHistory: (role: 'user' | 'model', text: string) => void;
  setGreeted: () => void;
  clearChat: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  isTyping: false,
  messages: [],
  geminiHistory: [],
  hasGreeted: false,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  setTyping: (typing) => set({ isTyping: typing }),

  addUserMessage: (text, imageUrl) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: generateId(), role: 'user', text, timestamp: new Date(), imageUrl },
      ],
    })),

  addBotMessage: (text) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: generateId(), role: 'bot', text, timestamp: new Date() },
      ],
    })),

  addToGeminiHistory: (role, text) =>
    set((state) => ({
      geminiHistory: [
        ...state.geminiHistory,
        { role, parts: [{ text }] },
      ],
    })),

  setGreeted: () => set({ hasGreeted: true }),

  clearChat: () =>
    set({
      messages: [],
      geminiHistory: [],
      hasGreeted: false,
      isTyping: false,
    }),
}));
