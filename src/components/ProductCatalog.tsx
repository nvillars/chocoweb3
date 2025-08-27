"use client";

import React, { useEffect, useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import styles from './ProductCatalog.module.css';

import type { Product } from '../types';

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/products')
      .then(r => r.json())
      .then((data) => { if (!mounted) return; setProducts((data || []).filter((p: Product) => p.published)); setLoading(false); })
      .catch((err) => { if (!mounted) return; setError('No se pudo cargar el catálogo'); setLoading(false); });

    const es = new EventSource('/api/events');
    es.addEventListener('product.changed', (ev: MessageEvent) => {
        try {
        const payload = JSON.parse(ev.data) as { action?: string; product?: Product } | null;
        const action = payload?.action;
        const product = payload?.product;
        setProducts(prev => {
          const copy = [...prev];
          const idx = copy.findIndex(p => p._id === product?._id || (product?.slug && p.slug === product.slug));
          if (action === 'create') {
            if (product?.published) {
              if (idx === -1) copy.unshift(product);
              else copy[idx] = product;
            }
          } else if (action === 'update') {
            if (product?.published) {
              if (idx === -1) copy.unshift(product);
              else copy[idx] = product;
            } else {
              if (idx !== -1) copy.splice(idx, 1);
            }
          } else if (action === 'delete') {
            if (idx !== -1) copy.splice(idx, 1);
          }
          return copy;
        });
      } catch (e) {}
    });

    return () => { mounted = false; es.close(); };
  }, []);

  const visibleProducts = useMemo(() => products, [products]);

  if (loading) return (
    <section aria-busy="true" aria-live="polite" aria-labelledby="catalog-heading">
      <h2 id="catalog-heading" className="sr-only">Cargando productos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse" aria-hidden>
            <div className="w-full h-44 bg-gray-200 rounded-lg mb-4" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="mt-4 flex gap-2">
              <div className="h-10 bg-gray-200 rounded flex-1" />
              <div className="h-10 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;
  if (visibleProducts.length === 0) return (
    <div className="text-center py-12" role="status" aria-live="polite">
      <h3 className="text-lg font-semibold">No hay productos disponibles</h3>
      <p className="text-sm text-gray-600">Revisa la sección de Admin → Productos o espera que se publiquen nuevos items.</p>
    </div>
  );

  return (
    <section aria-labelledby="catalog-heading">
      <h2 id="catalog-heading" className={`text-center mb-6 sm:mb-8 ${styles.title}`}>Nuestros productos</h2>
      <div role="list" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
        {visibleProducts.map(product => (
          <div role="listitem" key={product._id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
