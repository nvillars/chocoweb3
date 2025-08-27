"use client";

import React, { useEffect, useState } from 'react';

type Order = { _id?: string; id?: string; userId?: string | null; items: { productId: string; qty: number }[]; createdAt: string };

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch('/api/orders')
      .then(r => r.json())
      .then((data) => { if (mounted) setOrders(data || []); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4E260E]">Pedidos</h2>
        <p className="text-sm text-gray-500">Lista de pedidos recientes</p>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-500">No hay pedidos aún.</p>
      ) : (
        <div className="grid gap-4">
          {orders.map((o, i) => (
            <div key={o._id ?? o.id ?? `order-${i}`} className="p-4 bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">Pedido #{o.id}</div>
                <div className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-3 space-y-2">
                {o.items.map((it: { productId: string; qty: number }, idx) => (
                  <div key={`${it.productId ?? 'p'}-${idx}`} className="flex justify-between text-sm">
                    <div>Producto #{it.productId}</div>
                    <div className="font-medium">Cantidad: {it.qty}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
