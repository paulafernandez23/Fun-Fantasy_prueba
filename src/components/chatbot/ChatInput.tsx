import React, { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (text: string, imageFile?: File) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    // Permite enviar solo imagen sin texto
    if ((!trimmed && !imageFile) || disabled) return;
    onSend(trimmed, imageFile ?? undefined);
    setValue('');
    clearImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  const canSend = (value.trim().length > 0 || imageFile !== null) && !disabled;

  return (
    <div className="flex flex-col border-t border-outline-variant/30 bg-surface-container-lowest">
      {/* Preview de imagen seleccionada */}
      {imagePreview && (
        <div className="px-3 pt-3 flex items-start gap-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Imagen adjunta"
              className="h-20 w-20 object-cover rounded-xl border border-outline-variant/30"
            />
            <button
              onClick={clearImage}
              aria-label="Quitar imagen"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-on-primary flex items-center justify-center shadow"
            >
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            📷 Envía esta imagen para que Cristal identifique la carta
          </p>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Botón adjuntar imagen */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Adjuntar imagen de carta"
          title="Adjuntar imagen para identificar una carta"
          className="
            w-10 h-10 rounded-xl flex items-center justify-center
            text-on-surface-variant border border-outline-variant/30
            hover:bg-surface-container hover:text-primary transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0
          "
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
        </button>

        {/* Input oculto de fichero */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          id="chat-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder={imageFile ? 'Añade un comentario (opcional)...' : 'Escribe un mensaje...'}
          rows={1}
          className="
            flex-1 resize-none bg-surface-container rounded-xl px-3 py-2.5
            text-sm text-on-surface placeholder:text-on-surface-variant/60
            border border-outline-variant/30 focus:outline-none focus:border-primary/60
            transition-colors disabled:opacity-50 leading-normal max-h-[120px]
          "
        />

        <button
          id="chat-send-btn"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="
            w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center
            hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
            flex-shrink-0
          "
        >
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </div>
    </div>
  );
}
