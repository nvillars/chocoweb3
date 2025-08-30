import React from 'react';
import { OrderItem, Address, ShippingOption } from '../../types/checkout';

type Props = {
  items: OrderItem[];
  shipping: ShippingOption;
  address?: Address | null;
  onEditAddress?: () => void;
};

export default function OrderSummary({ items, shipping, address, onEditAddress }: Props) {
  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const total = subtotal + (shipping?.price || 0);

  return (
    <aside className="p-4 border rounded-lg">
      <h4 className="font-semibold">Resumen del pedido</h4>
      {address ? (
        <div className="mt-2 p-2 bg-gray-50 rounded">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-medium">{address.fullName}</div>
              <div className="text-sm text-muted">{address.addressLine1}</div>
              <div className="text-sm text-muted">{address.distrito ?? ''} {address.provincia ?? ''}</div>
              <div className="text-sm">{address.phone} • {address.email}</div>
            </div>
            {onEditAddress && (
              <button onClick={onEditAddress} className="text-sm underline ml-2">Editar</button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">
          No hay dirección guardada
          {onEditAddress && (
            <div className="mt-2">
              <button onClick={onEditAddress} className="btn-primary rounded-xl px-3 py-1">Agregar dirección</button>
            </div>
          )}
        </div>
      )}
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.productId} className="py-2 flex justify-between">
            <span>{it.name} × {it.qty}</span>
            <span>S/ {it.lineTotal.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t pt-3">
        <div className="flex justify-between"><span>Subtotal</span><strong>S/ {subtotal.toFixed(2)}</strong></div>
        <div className="flex justify-between"><span>Envío</span><strong>S/ {shipping?.price?.toFixed(2) ?? '0.00'}</strong></div>
        <div className="flex justify-between text-lg font-semibold mt-2"><span>Total</span><strong>S/ {total.toFixed(2)}</strong></div>
      </div>
    </aside>
  );
}
