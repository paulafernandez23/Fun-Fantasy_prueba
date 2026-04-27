import React from 'react';
import { UIMessage } from '../../store/chatStore';

interface ChatMessageProps {
  message: UIMessage;
}

/** Convierte texto con **negrita**, *cursiva* y [enlace](/ruta) a JSX básico */
function parseSimpleMarkdown(text: string): React.ReactNode {
  // Dividir en líneas para manejar saltos
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    // Procesar negrita y enlaces en cada línea
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Regex para detectar [texto](/ruta) como enlaces
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{remaining.slice(lastIndex, match.index)}</span>
        );
      }
      const [, linkText, href] = match;
      const isExternal = href.startsWith('http');
      parts.push(
        isExternal ? (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium opacity-90 hover:opacity-100"
          >
            {linkText}
          </a>
        ) : (
          <a key={key++} href={href} className="underline font-medium opacity-90 hover:opacity-100">
            {linkText}
          </a>
        )
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
    }

    const content = parts.length > 0 ? parts : remaining;

    return (
      <span key={lineIndex}>
        {content}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'bot';

  return (
    <div className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {/* Avatar del bot */}
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-1">
          <span className="material-symbols-outlined text-on-primary filled-icon text-sm">
            auto_awesome
          </span>
        </div>
      )}

      {/* Burbuja de mensaje */}
      <div
        className={`
          max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isBot
            ? 'bg-surface-container text-on-surface rounded-bl-sm'
            : 'bg-primary text-on-primary rounded-br-sm'
          }
        `}
      >
        {/* Imagen adjunta (solo mensajes de usuario) */}
        {!isBot && message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Imagen adjunta"
            className="w-48 max-w-full rounded-xl mb-2 object-cover border border-on-primary/20"
          />
        )}
        {message.text && message.text !== '📷 (imagen adjunta)' && (
          <p className="whitespace-pre-wrap break-words">
            {parseSimpleMarkdown(message.text)}
          </p>
        )}
        <p className={`text-[10px] mt-1 opacity-60 ${isBot ? 'text-left' : 'text-right'}`}>
          {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
