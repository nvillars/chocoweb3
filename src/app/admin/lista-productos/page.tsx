"use client";

import React, { useEffect, useState } from 'react';

type Product = { _id?: string; id?: number; name: string; description?: string; price?: number; stock: number; published: boolean };

export default function ListaProductos() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then(r => r.json())
      .then((data) => { if (mounted) setProducts(data || []); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4E260E]">Lista de Productos</h2>
        <p className="text-sm text-gray-500">Listado completo de productos con detalles.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate [border-spacing:0_12px]">
          <thead>
            <tr className="text-sm text-gray-600">
              <th className="pl-6">Nombre</th>
              <th>Stock</th>
              <th>Precio</th>
              <th className="pr-6">Publicado</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p._id ?? p.id ?? `product-${i}`} className="bg-white rounded-xl shadow-sm align-top">
                <td className="pl-6 py-4">
                  <div className="font-semibold text-[#4E260E]">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{p.description}</div>
                </td>
                <td className="py-4">{p.stock}</td>
                <td className="py-4">S/ {typeof p.price === 'number' ? p.price.toFixed(2) : '0.00'}</td>
                <td className="py-4 pr-6">{p.published ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
