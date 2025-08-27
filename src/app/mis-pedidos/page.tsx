"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

type OrderItem = {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type Order = {
  _id: string;
  items: OrderItem[];
  amounts: { subtotal: number; shipping: number; tax: number; total: number };
  status: string;
  payment: { method: string; status?: string };
  createdAt: string;
};

export default function MisPedidosPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user === undefined) return; // not initialized
    if (!user) return; // not logged in

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/orders', { credentials: 'same-origin' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setOrders(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (user === undefined) return <div>Cargando...</div>;
  if (!user) return <div>Por favor inicia sesión para ver tus pedidos.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Mis pedidos</h1>
      {loading && <div>Buscando pedidos...</div>}
      {error && <div className="text-red-600">Error: {error}</div>}
      {!loading && orders && orders.length === 0 && <div>No has realizado pedidos aún.</div>}
      {!loading && orders && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="border rounded p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">Pedido #{o._id}</div>
                  <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
  <div className="font-semibold">{(o.amounts.total).toFixed(2)} PEN</div>
                  <div className="text-sm">Estado: {o.status}</div>
                </div>
              </div>
              <div className="mt-2">
                <ul className="divide-y">
                  {o.items.map((it, idx) => (
                    <li key={idx} className="py-2 flex justify-between">
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-sm text-gray-600">Cantidad: {it.qty}</div>
                      </div>
                      <div className="text-right">
                  <div>{(it.lineTotal).toFixed(2)} PEN</div>
                                <div className="text-sm text-gray-600">{(it.unitPrice).toFixed(2)} c/u</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 flex justify-end">
                <Link href={`/orders/${o._id}`} className="px-3 py-2 bg-white border rounded-md text-sm">Detalle</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
