"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Product, CartItem, User } from '../types';

interface CartContextType {
  addToCart: (id: string, qty?: number) => boolean;
  setQuantity: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  getCartItems: () => CartItem[];
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getQuantity: (id: string) => number;
  placeOrder: (opts?: { paymentMethod?: string; user?: User | null }) => Promise<{ order?: unknown; clientSecret?: string }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'ladulcerina_cart_v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Record<string, number>>({});
  const [productCache, setProductCache] = useState<Record<string, Product>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch (e) { }

    fetch('/api/products')
      .then(r => r.json())
      .then((list: Product[]) => { const map: Record<string, Product> = {}; list.forEach((p: Product) => map[(p._id || String(p.id || ''))] = p); setProductCache(map); })
      .catch(() => { });

    const es = new EventSource('/api/events');
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === 'product.changed' && data.product?._id) {
          setProductCache(prev => ({ ...prev, [data.product._id]: data.product }));
        }
      } catch (e) { }
    };
    return () => es.close();
  }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { } }, [state]);

  function addToCart(id: string, qty = 1) {
    const p = productCache[id];
    const stock = p?.stock ?? Infinity;
    setState(s => {
      const cur = s[id] || 0;
      const want = Math.min(stock, cur + qty);
      if (want === cur) return s;
      return { ...s, [id]: want };
    });
    return true;
  }

  function setQuantity(id: string, qty: number) {
    const p = productCache[id];
    const stock = p?.stock ?? Infinity;
    const q = Math.max(0, Math.min(stock, qty));
    setState(s => {
      const next = { ...s };
      if (q <= 0) delete next[id]; else next[id] = q;
      return next;
    });
  }

  function removeFromCart(id: string) { setState(s => { const c = { ...s }; delete c[id]; return c; }); }

  function getCartItems() {
    return Object.entries(state).map(([id, q]) => ({ id, quantity: q, ...(productCache[id] || {}) })) as CartItem[];
  }

  function getTotalPrice() {
    return getCartItems().reduce((acc, it) => acc + ((it.price || 0) * it.quantity), 0);
  }

  function getTotalItems() {
    return Object.values(state).reduce((acc, v) => acc + v, 0);
  }

  function getQuantity(id: string) {
    return state[id] || 0;
  }

  async function placeOrder(opts?: { paymentMethod?: string; user?: User | null }) {
    const items = getCartItems().map(it => ({ productId: it.id, qty: it.quantity }));
    const idKey = (typeof crypto !== 'undefined' && typeof (crypto as unknown as { randomUUID?: () => string }).randomUUID === 'function') ? (crypto as unknown as { randomUUID: () => string }).randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type':'application/json', 'Idempotency-Key': idKey }, body: JSON.stringify({ items, paymentMethod: opts?.paymentMethod || 'cod', user: opts?.user }) });
    if (res.status === 201) return res.json();
    if (res.status === 409) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    const err = await res.json().catch(()=>({}));
    throw new Error(JSON.stringify(err));
  }

  return (
    <CartContext.Provider value={{ addToCart, setQuantity, removeFromCart, getCartItems, getTotalPrice, getTotalItems, getQuantity, placeOrder }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

