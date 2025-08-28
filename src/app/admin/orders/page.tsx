import React from 'react';
import Link from 'next/link';
import connectToDB from '@/lib/mongodb';
import { getOrderModel } from '@/models/Order';
import AdminOrderActions from '@/components/AdminOrderActions';

type OrderView = {
  _id: string;
  user?: { name?: string; email?: string };
  amounts?: { total?: number };
  payment?: { method?: string; status?: string; providerId?: string; approvedBy?: string; approvedAt?: string };
  status?: string;
};

export default async function OrdersPage(){
  await connectToDB();
  const Order = getOrderModel();
  const orders = await Order.find().sort({ createdAt:-1 }).limit(50).lean() as OrderView[];
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Órdenes</h2>
      <ul>
        {orders.map((o) => {
          const total = Number(o?.amounts?.total ?? 0);
          const paymentMethod = o?.payment?.method ?? '—';
          return (
            <li key={String(o._id)} className="p-2 border-b flex justify-between items-center">
              <div>
                <div><strong>{o.user?.name || 'Anon'}</strong> - {o.status}</div>
                <div className="text-sm text-gray-600">S/ {total.toFixed(2)} - {paymentMethod}</div>
                <div className="text-sm text-gray-500">Pago: {o.payment?.status ?? '—'} {o.payment?.providerId ? `· Ref: ${o.payment?.providerId}` : ''}</div>
              </div>
              <div className="flex gap-2 items-center">
                <AdminOrderActions id={String(o._id)} initialStatus={o.status} initialPaymentStatus={o.payment?.status} initialProviderId={o.payment?.providerId} initialApprovedBy={o.payment?.approvedBy} initialApprovedAt={o.payment?.approvedAt as unknown as string} />
                <Link href={`/orders/${String(o._id)}`} aria-label={`Ver detalle de orden ${String(o._id)}`} className="bg-blue-600 text-white px-2 py-1 rounded">Detalle</Link>
                <form method="post" action={`/api/orders/${o._id}/cancel`}>
                  <button type="submit" className="bg-red-500 text-white px-2 py-1 rounded">Cancelar</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
// client-side admin UI lives in a separate file to avoid duplicate exports
