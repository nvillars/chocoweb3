"use client";

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Checkout() {
  const [formData, setFormData] = useState({ nombre: '', email: '' });
  const { getCartItems, getTotalPrice, setQuantity } = useCart();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  type OrderSummary = { _id?: string; id?: string; amounts?: { total?: number } };
  const [createdOrder, setCreatedOrder] = useState<OrderSummary | null>(null);
  const router = useRouter();

  const onConfirm = async () => {
    setLoading(true);
  const items = getCartItems().map((it)=>({ productId: it.id, qty: it.quantity }));
    // generate a safe idempotency key: prefer crypto.randomUUID, then crypto.getRandomValues UUIDv4, else Math fallback
    const generateIdKey = () => {
      try {
        type CryptoLike = { randomUUID?: () => string; getRandomValues?: (arr: Uint8Array) => Uint8Array };
        const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as { crypto?: unknown }).crypto as CryptoLike | undefined : undefined;
        if (g && typeof g.randomUUID === 'function') return g.randomUUID();
        // use getRandomValues to produce RFC4122 v4 UUID
        if (g && typeof g.getRandomValues === 'function') {
          const bytes = g.getRandomValues(new Uint8Array(16));
          // Per RFC4122 v4
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        }
      } catch (e) {
        // ignore and fallback
      }
      // fallback: less strong but acceptable as last resort
      const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
    };
    const idKey = generateIdKey();
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type':'application/json', 'Idempotency-Key': idKey }, body: JSON.stringify({ user: { name: formData.nombre, email: formData.email }, items, paymentMethod: 'cod' }) });
      if (res.status === 201) {
        const data = await res.json().catch(()=>({}));
  const ord = (data?.order || data) as OrderSummary | undefined;
  setCreatedOrder(ord || { createdAt: new Date().toISOString() } as unknown as OrderSummary);
        toast.push({ message: 'Orden creada' });
        // clear cart
        for (const it of getCartItems()) setQuantity(it.id, 0);
  // Leave the confirmation page visible; user will navigate manually.
      } else if (res.status === 409) {
        const err = await res.json();
        const pid = err.productId;
        const available = err.available || 0;
        if (available <= 0) setQuantity(pid, 0); else setQuantity(pid, available);
        toast.push({ message: 'Stock insuficiente, carrito ajustado' });
      } else {
        const msg = await res.json();
        toast.push({ message: 'Error: ' + JSON.stringify(msg) });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.push({ message: msg });
    }
    setLoading(false);
  };

  // No auto-redirect: keep confirmation page visible until user acts.

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-[#7B3F00]">Información Personal</h2>
          <input name="nombre" placeholder="Nombre" value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border mb-3" />
          <input name="email" placeholder="Email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full p-3 border mb-3" />
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#7B3F00]">Resumen de Compra</h3>
            <div className="space-y-3 mb-4">
              {getCartItems().map(it=> (
                <div key={it.id} className="flex items-center gap-3">
                  <Image src={it.image || '/file.svg'} alt={it.name || 'producto'} width={48} height={48} className="object-contain rounded-lg" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[#4E260E]">{it.name}</p>
                    <p className="text-xs text-gray-500">Cantidad: {it.quantity}</p>
                  </div>
                  <span className="font-bold text-[#7B3F00]">S/ {((it.price||0)*it.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-[#7B3F00]">S/ {getTotalPrice().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {!createdOrder ? (
            <button disabled={loading} onClick={onConfirm} className="w-full bg-gradient-to-r from-[#4E260E] to-[#A0522D] text-white py-4 rounded-2xl font-bold">{loading? 'Procesando...':'Confirmar Pedido'}</button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <h3 className="text-xl font-bold text-green-800 mb-2">Pedido recibido</h3>
              <p className="text-sm text-green-700 mb-2">Gracias. Tu pedido ha sido creado correctamente.</p>
              <p className="text-sm text-gray-700">Número de orden: <span className="font-mono text-gray-900">{createdOrder._id ?? createdOrder.id ?? '—'}</span></p>
              <p className="text-sm text-gray-700">Total: <span className="font-semibold">S/ {(Number(createdOrder.amounts?.total) || 0).toFixed(2)}</span></p>
              <div className="mt-4 flex gap-2 justify-center">
                <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#4E260E] text-white rounded-md">Volver al inicio</button>
                <button onClick={() => router.push(`/orders/${createdOrder._id ?? createdOrder.id}`)} className="px-4 py-2 bg-white border rounded-md">Ver detalle</button>
              </div>
              {/* No auto-redirect countdown */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
