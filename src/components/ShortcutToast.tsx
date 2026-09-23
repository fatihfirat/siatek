import React, { useEffect, useState } from 'react';
import { Sparkles, Command } from 'lucide-react';

interface ShortcutToastProps {
  message: string | null;
  keys?: string[];
  onClear: () => void;
}

export default function ShortcutToast({ message, keys, onClear }: ShortcutToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClear();
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-2.5 bg-base-surface text-text-primary border border-border-strong rounded-2xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
      <div className="w-6 h-6 rounded-lg bg-accent-fill/15 border border-accent-border flex items-center justify-center text-accent-text shrink-0">
        <Command className="w-3.5 h-3.5" />
      </div>
      <div className="text-xs font-semibold text-text-primary">
        {message}
      </div>
      {keys && keys.length > 0 && (
        <div className="flex items-center space-x-1 pl-2 border-l border-border">
          {keys.map((k, idx) => (
            <kbd key={idx} className="px-1.5 py-0.5 bg-base-surface-2 border border-border rounded font-mono text-[10px] text-text-secondary font-bold">
              {k}
            </kbd>
          ))}
        </div>
      )}
    </div>
  );
}
