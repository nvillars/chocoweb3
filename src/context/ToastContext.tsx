"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Toast = { id: string; message: string; actionLabel?: string; action?: () => void };

const ToastContext = createContext<{
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ttl?: number) => void;
  remove: (id: string) => void;
} | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (t: Omit<Toast, 'id'>, ttl = 5000) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    const toast = { id, ...t } as Toast;
    setToasts((s) => [toast, ...s]);
    if (ttl > 0) setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), ttl);
  };

  const remove = (id: string) => setToasts((s) => s.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={{ toasts, push, remove }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastContext;
