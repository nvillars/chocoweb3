"use client";

import React, { useEffect, useState } from 'react';
import useEventSource from '../../../hooks/useEventSource';

type P = { _id: string; name: string; description?: string; stock: number; };

export default function StockAdmin() {
  const [products, setProducts] = useState<P[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then(r => r.json())
      .then((data) => { if (mounted) setProducts(data || []); })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  // handler for SSE events (defined at top-level of component so hooks rules are respected)
  const handleEvent = (ev: MessageEvent) => {
    try {
  const payload = JSON.parse(ev.data) as { action: string; product: Partial<P> & { _id: string } };
  const { action, product } = payload;
      // if the page is not visible, mark that there was a remote update
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        setRemoteUpdate(true);
      }
      setProducts(prev => {
        const copy = [...prev];
          const idx = copy.findIndex(p => p._id === product._id);
          if (action === 'create' || action === 'restore') {
            if (idx === -1) copy.unshift({ _id: product._id, name: product.name || 'Producto', description: product.description || '', stock: product.stock ?? 0 });
            else copy[idx] = { ...copy[idx], ...product };
        } else if (action === 'update') {
            if (idx === -1) copy.unshift({ _id: product._id, name: product.name || 'Producto', description: product.description || '', stock: product.stock ?? 0 });
            else copy[idx] = { ...copy[idx], ...product };
        } else if (action === 'delete' || action === 'deletePermanent') {
          if (idx !== -1) copy.splice(idx, 1);
        }
        return copy;
      });
    } catch (e) {}
  };

  // use reconnection-enabled EventSource hook at component top-level
  useEventSource('/api/events', 'product.changed', handleEvent);

  const [remoteUpdate, setRemoteUpdate] = useState(false);

  const doRefresh = async () => {
    const data = await fetch('/api/products').then(r => r.json()).catch(() => []);
    setProducts(data || []);
    setRemoteUpdate(false);
  };

  // optimistic edit values + debounce
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const debounceMap = React.useRef<Record<string, ReturnType<typeof setTimeout> | number>>({});

  const doPatch = async (id: string, qty: number) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify({ stock: qty }), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        // Re-fetch whole list on error (safe fallback)
        const data = await fetch('/api/products').then(r => r.json());
        setProducts(data || []);
      } else {
        const updated = await res.json();
        setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
      }
    } catch (e) {
      // network error: refetch
      const data = await fetch('/api/products').then(r => r.json()).catch(() => []);
      setProducts(data || []);
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
      setEdits(e => { const copy = { ...e }; delete copy[id]; return copy; });
    }
  };

  const schedulePatch = (id: string, qty: number) => {
    if (debounceMap.current[id]) clearTimeout(debounceMap.current[id]);
    debounceMap.current[id] = setTimeout(() => doPatch(id, qty), 700);
  };

  const changeStock = (id: string, qty: number) => {
    // optimistic local update
    setEdits(e => ({ ...e, [id]: qty }));
    setProducts(prev => prev.map(p => p._id === id ? { ...p, stock: qty } : p));
    schedulePatch(id, qty);
  };

  const onBlurCommit = (id: string, qty: number) => {
    if (debounceMap.current[id]) {
      clearTimeout(debounceMap.current[id]);
      delete debounceMap.current[id];
    }
    doPatch(id, qty);
  };

  return (
    <div>
      {remoteUpdate ? (
        <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-400">
          <div className="flex items-center justify-between">
            <div className="text-sm">Hay cambios remotos. Puedes refrescar para verlos.</div>
            <div>
              <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={doRefresh}>Refrescar ahora</button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4E260E]">Gestionar Stock</h2>
        <p className="text-sm text-gray-500">Ajusta niveles de inventario para cada producto.</p>
      </div>

      <div className="space-y-4">
        {products.map(p => (
          <div key={p._id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#4E260E]">{p.name}</div>
              <div className="text-sm text-gray-500">{p.description}</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={edits[p._id] !== undefined ? edits[p._id] : p.stock}
                onChange={(e) => changeStock(p._id, Number(e.target.value))}
                onBlur={(e) => onBlurCommit(p._id, Number(e.target.value))}
                className="w-28 p-2 border rounded"
                aria-label={`Stock de ${p.name}`}
              />
              <div className="text-sm text-gray-600">unidades</div>
              {saving[p._id] ? <div className="text-sm text-blue-600 ml-2">Guardando...</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
