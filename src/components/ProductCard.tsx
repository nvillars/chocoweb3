"use client";

import React, { memo } from 'react';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';

type Props = {
  product: Product;
};

function ProductCardInner({ product }: Props) {
  const { addToCart, removeFromCart, getQuantity } = useCart();
  const toast = useToast();
  const quantity = getQuantity(String(product._id || product.id || ''));
  const price = typeof product.price === 'number' ? product.price : 0;

  return (
    <article className="card p-4 flex flex-col h-full transition-transform hover:-translate-y-1 focus-within:translate-y-0" aria-labelledby={`p-${product._id}`}>
      <div className="relative product-image-wrap mb-4 min-h-[160px]">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 22vw" className="object-cover" priority={false} />
        ) : (
          <div className="w-full h-40 bg-gray-100" />
        )}

  {(product.stock ?? 0) > 0 ? (
          <div className="absolute top-3 left-3 product-stock bg-[var(--mint)] text-[var(--brand-700)]">En stock</div>
        ) : (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-bold">Sin stock</div>
        )}
      </div>

      <h3 id={`p-${product._id}`} className="font-semibold text-base text-[var(--brand-700)] mb-1 truncate">{product.name}</h3>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-lg text-[var(--brand-500)]">S/ {price.toFixed(2)}</span>
          <div className="flex items-center gap-2">
            {(product.tags || []).slice(0,2).map((t: string) => (<span key={t} className="text-xs px-2 py-1 bg-[var(--gold)]/10 text-[var(--brand-700)] rounded-full">{t}</span>))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href={`/productos/${product.slug || product._id}`} className="btn btn-ghost flex-1 text-center" aria-label={`Ver ${product.name}`}>Ver</a>

            {quantity === 0 ? (
            <button
              onClick={() => { if ((product.stock ?? 0) > 0) { const ok = addToCart(String(product._id || product.id || ''), 1); if (!ok) toast.push({ message: 'Stock insuficiente' }); } }}
              className={`btn btn-primary flex-1 ${((product.stock ?? 0) === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Agregar ${product.name} al carrito`}
              disabled={(product.stock ?? 0) === 0}
            >Agregar</button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => removeFromCart(String(product._id || product.id || ''))} className="w-9 h-9 rounded-md bg-[var(--error)] text-white">-</button>
              <div className="px-3 py-2 bg-gray-100 rounded-md">{quantity}</div>
              <button onClick={() => { const ok = addToCart(String(product._id || product.id || ''), 1); if (!ok) toast.push({ message: 'Stock insuficiente' }); }} className="w-9 h-9 rounded-md bg-[var(--brand-700)] text-white">+</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCardInner);
