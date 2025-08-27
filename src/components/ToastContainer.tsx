"use client";

import React from 'react';
import { useToast } from '../context/ToastContext';

export default function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map(t => (
        <div key={t.id} className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <div className="flex-1">{t.message}</div>
          {t.action && (
            <button onClick={() => { if (t.action) { t.action(); } remove(t.id); }} className="text-yellow-300 font-semibold">
              {t.actionLabel || 'Acción'}
            </button>
          )}
          <button onClick={() => remove(t.id)} className="text-gray-400 ml-2">✕</button>
        </div>
      ))}
    </div>
  );
}
