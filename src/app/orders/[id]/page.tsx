"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import AdminOrderActions from '../../../components/AdminOrderActions';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { user } = useAuth();
  type OrderItem = { name?: string; qty?: number; unitPrice?: number; lineTotal?: number };
  type OrderView = { _id?: string; createdAt?: string; status?: string; payment?: { method?: string; status?: string; providerId?: string; approvedBy?: string; approvedAt?: string }; amounts?: { subtotal?: number; shipping?: number; tax?: number; total?: number }; items?: OrderItem[] } | null;
  const [order, setOrder] = useState<OrderView>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (user === undefined) return; // wait for auth
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { credentials: 'same-origin' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setOrder(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  if (user === undefined) return <div>Cargando...</div>;
  if (!user) return <div>Por favor inicia sesión para ver detalles del pedido.</div>;

  if (loading) return <div>Cargando pedido...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!order) return <div>No se encontró el pedido.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Detalle de pedido</h1>
      <div className="bg-white rounded-2xl p-6 shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-sm text-gray-600">Pedido:</div>
            <div className="font-mono text-lg">{order._id}</div>
            <div className="text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">Estado: {order.status}</div>
            <div className="text-sm text-gray-600">Pago: {order.payment?.method} {order.payment?.status ? `· ${order.payment.status}` : ''}</div>
            <div className="text-sm text-gray-500">Referencia: {order.payment?.providerId ?? '—'}</div>
            {order.payment?.approvedBy && <div className="text-sm text-gray-500">Aprobado por: {order.payment?.approvedBy}{order.payment?.approvedAt ? ` · ${new Date(order.payment?.approvedAt as unknown as string).toLocaleString()}` : ''}</div>}
            <div className="text-lg font-bold">S/ {(order.amounts?.total ?? 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Admin actions */}
            {user && user.role === 'admin' && (
              <div className="mt-4 flex justify-end gap-2">
                <AdminOrderActions id={String(order._id)} initialStatus={order.status} initialPaymentStatus={order.payment?.status} initialProviderId={order.payment?.providerId} initialApprovedBy={order.payment?.approvedBy} initialApprovedAt={order.payment?.approvedAt as unknown as string} />
                <form method="post" action={`/api/orders/${order._id}/cancel`}>
                  <button type="submit" className="bg-red-500 text-white px-3 py-2 rounded">Cancelar</button>
                </form>
              </div>
            )}

            <div className="divide-y">
      {((order.items || []) as OrderItem[]).map((it, idx) => (
            <div key={idx} className="py-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">Cantidad: {it.qty}</div>
              </div>
              <div className="text-right">
        <div>S/ {(it.lineTotal ?? 0).toFixed(2)}</div>
        <div className="text-sm text-gray-500">{(it.unitPrice ?? 0).toFixed(2)} c/u</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end text-sm">
          <div className="w-64">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-semibold">S/ {(order.amounts?.subtotal ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Envio</span><span className="font-semibold">S/ {(order.amounts?.shipping ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Impuesto</span><span className="font-semibold">S/ {(order.amounts?.tax ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between mt-2"><span className="text-gray-800 font-bold">Total</span><span className="font-bold">S/ {(order.amounts?.total ?? 0).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
