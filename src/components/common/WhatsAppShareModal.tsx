import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, Phone, User, ExternalLink, ShieldCheck } from 'lucide-react';
import { openWhatsAppShare, copyToClipboard, formatWhatsAppPhone } from '../../utils/shareUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultPhone?: string;
  defaultMessage: string;
  recipientName?: string;
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  title,
  defaultPhone = '',
  defaultMessage,
  recipientName,
}: WhatsAppShareModalProps) {
  useModalBehavior(isOpen, onClose);
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPhone(defaultPhone);
    setMessage(defaultMessage);
  }, [defaultPhone, defaultMessage, isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    openWhatsAppShare({
      phone: phone.trim(),
      message: message.trim(),
    });
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedPhone = formatWhatsAppPhone(phone);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-base-surface border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-950/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-text-primary flex items-center space-x-2">
                <span>WhatsApp Paylaşımı</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  Canlı Mesaj
                </span>
              </h3>
              <p className="text-xs text-text-muted">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-base-surface-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Recipient Phone Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-text-primary flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Alıcı Telefon Numarası</span>
              </span>
              {recipientName && (
                <span className="text-[11px] text-text-muted font-normal flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{recipientName}</span>
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="0532 123 45 67 veya 90532..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-base-surface-2 border border-border rounded-xl text-text-primary text-xs font-mono font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {formattedPhone && (
                <span className="absolute right-3 top-2.5 text-[10px] text-text-muted font-mono bg-base-surface px-1.5 py-0.5 rounded border border-border">
                  +{formattedPhone}
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted">
              Telefon girmeden gönderirseniz WhatsApp kişi seçme ekranı açılır.
            </p>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-text-primary">
                Mesaj Metni & Format Önizleme
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Metni Kopyala'}</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 bg-base-surface-2 border border-border rounded-xl text-text-primary text-xs font-sans leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 custom-scrollbar"
              placeholder="Mesajınızı buraya yazın..."
            />
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start space-x-2 text-[11px] text-text-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              ALPHA TEKNİK şablonu otomatik olarak kurumsal başlık, tutar, ürün kalemleri ve banka hesap bilgilerini içerir.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-base-surface-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl border border-border bg-base-surface hover:bg-base-surface-2 text-xs font-bold text-text-primary flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Panoya Kopyala'}</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp'ta Aç & Gönder</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
