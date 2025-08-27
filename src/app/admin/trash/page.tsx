"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '../../../context/ToastContext';
import useEventSource from '../../../hooks/useEventSource';

type P = { _id: string; name: string; description?: string; image?: string; deletedAt?: string };

export default function AdminTrash() {
  const [items, setItems] = useState<P[]>([]);
  const toast = useToast();

  const load = async () => {
    try {
      const res = await fetch('/api/products/trash');
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      } else {
        toast.push({ message: 'Error al cargar la papelera' });
      }
    } catch (e) { toast.push({ message: 'Error de red al cargar papelera' }); }
  };

  useEffect(() => { load(); }, []);

  // refresh when product events occur elsewhere
  const handleEvent = useCallback((ev: MessageEvent) => {
    try {
      const payload = JSON.parse(ev.data);
      if (!payload) return;
      // interested in product restores or deletes
      if (payload.action === 'restore' || payload.action === 'deletePermanent' || payload.action === 'changed') {
        load();
      }
    } catch (e) {
      // ignore malformed
    }
  }, []);

  useEventSource('/api/events', 'product.changed', handleEvent);

  const restore = async (id: string) => {
    try {
      const res = await fetch('/api/products/trash', { method: 'POST', body: JSON.stringify({ action: 'restore', id }), headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        toast.push({ message: 'Producto restaurado' });
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ message: err?.error || 'Error al restaurar' });
      }
    } catch (e) { toast.push({ message: 'Error de red al restaurar' }); }
  };

  const deletePermanent = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente este producto? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch('/api/products/trash', { method: 'POST', body: JSON.stringify({ action: 'deletePermanent', id }), headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        toast.push({ message: 'Eliminado permanentemente' });
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ message: err?.error || 'Error al eliminar' });
      }
    } catch (e) { toast.push({ message: 'Error de red al eliminar' }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4E260E]">Papelera - Productos</h2>
        <p className="text-sm text-gray-500">Aquí puedes restaurar productos o eliminarlos permanentemente.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.length === 0 ? (
          <div className="p-6 bg-white rounded shadow text-gray-600">No hay productos en la papelera.</div>
        ) : items.map(it => (
          <div key={it._id} className="bg-white p-4 rounded shadow flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#4E260E]">{it.name}</div>
              <div className="text-sm text-gray-500">Borrado: {it.deletedAt}</div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => restore(it._id)} className="px-3 py-1 bg-green-600 text-white rounded">Restaurar</button>
              <button onClick={() => deletePermanent(it._id)} className="px-3 py-1 bg-red-600 text-white rounded">Eliminar permanentemente</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
