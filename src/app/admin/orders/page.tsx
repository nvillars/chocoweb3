import React from 'react';
import connectToDB from '@/lib/mongodb';
import { getOrderModel } from '@/models/Order';

type OrderView = {
  _id: string;
  user?: { name?: string; email?: string };
  amounts?: { total?: number };
  payment?: { method?: string };
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
            <li key={String(o._id)} className="p-2 border-b flex justify-between">
              <div>
                <div><strong>{o.user?.name || 'Anon'}</strong> - {o.status}</div>
                <div>S/ {total.toFixed(2)} - {paymentMethod}</div>
              </div>
              <div className="flex gap-2">
                <form method="post" action={`/api/orders/${o._id}/pay`}>
                  <button type="submit" className="bg-green-500 text-white px-2 py-1 rounded">Marcar pagada</button>
                </form>
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
