"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import HeaderAuth from './HeaderAuth';
import { useSSEStatus } from '../context/SSEStatusContext';
import { useCart } from '../context/CartContext';

// Clean, single Header component
export default function Header() {
  // Hooks must be called at the top level of the component
  const headerRef = useRef<HTMLElement | null>(null);
  const sse = useSSEStatus();
  const status = sse?.status ?? 'connected';

  const { getTotalItems } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const prevScroll = useRef<number>(0);
  // focus management and keyboard handling for mobile sheet
  useEffect(() => {
    if (!mobileOpen) return;
    const prevActive = document.activeElement as HTMLElement | null;
    // focus first link
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      try { prevActive?.focus(); } catch (e) {}
    };
  }, [mobileOpen]);

  useEffect(() => {
    const SCROLL_THRESHOLD = 8; // smaller threshold for mobile to match desktop behaviour
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > SCROLL_THRESHOLD);
      prevScroll.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const badge = getTotalItems();

  // Update CSS variable --header-height so other components (hero, anchors) can offset themselves
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const headerEl = headerRef.current;
    type MQLWithEvents = MediaQueryList & {
      addEventListener?: (type: 'change', listener: (e: MediaQueryListEvent) => void) => void;
      removeEventListener?: (type: 'change', listener: (e: MediaQueryListEvent) => void) => void;
      addListener?: (listener: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (e: MediaQueryListEvent) => void) => void;
    };
    const mql = window.matchMedia('(max-width: 768px)') as MQLWithEvents;
    const buffer = 10; // px extra space

    function apply() {
      if (!headerEl) return;
      if (!mql.matches) {
        document.documentElement.style.setProperty('--header-height', '0px');
        return;
      }
      const h = (headerEl as HTMLElement).getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty('--header-height', `${Math.round(h + buffer)}px`);
    }

    apply();
    const onResize = () => apply();
    window.addEventListener('resize', onResize);
  // prefer modern API but fall back for older browsers
  if (typeof mql.addEventListener === 'function') mql.addEventListener('change', apply);
  else if (typeof mql.addListener === 'function') mql.addListener(apply);

    return () => {
      window.removeEventListener('resize', onResize);
  if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', apply);
  else if (typeof mql.removeListener === 'function') mql.removeListener(apply);
      // cleanup var
      document.documentElement.style.removeProperty('--header-height');
    };
  }, []);

  return (
  <header ref={(el) => { headerRef.current = el; }} className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${scrolled ? 'backdrop-blur-md bg-[var(--bg)]/95 shadow-md border-b border-[rgba(90,56,37,0.06)]' : 'bg-transparent'}`} role="banner">
      {/* inner wrapper centers content but does not own the background so header remains full-width */}
  <div className={`safe max-w-[1120px] mx-8 md:mx-auto flex items-center justify-between py-3` }>
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Ir a inicio" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-2xl" aria-hidden>🍫</div>
            <span className="text-lg font-semibold tracking-wide">La Dulcerina</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 ml-6" aria-label="Navegación principal">
            <Link href="/" className="text-sm hover:underline focus-visible:ring-4 focus-visible:ring-yellow-200">Inicio</Link>
            <Link href="/productos" className="text-sm hover:underline focus-visible:ring-4 focus-visible:ring-yellow-200">Productos</Link>
            <Link href="/mis-pedidos" className="text-sm hover:underline focus-visible:ring-4 focus-visible:ring-yellow-200">Mis pedidos</Link>
            <Link href="/admin" className="text-sm hover:underline focus-visible:ring-4 focus-visible:ring-yellow-200">Admin</Link>
          </nav>
        </div>

  <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full ${status === 'connected' ? 'bg-green-400' : status === 'connecting' ? 'bg-yellow-300' : 'bg-red-400'}`} title={`SSE: ${status}`} aria-hidden />
            <button className="btn btn-ghost hidden md:inline-flex" aria-label="Ver catálogo" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>Ver catálogo</button>
          </div>

          <div className="relative">
            <Link href="/carrito" aria-label="Abrir carrito" className="inline-flex items-center gap-2 btn btn-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
              <span className="sr-only">Carrito</span>
            </Link>
            {badge > 0 && <span className="absolute -top-2 -right-2 badge bg-red-500 text-white" aria-hidden>{badge}</span>}
          </div>

          <div className="md:hidden">
            <button aria-label="Abrir menú" aria-expanded={mobileOpen} aria-controls="mobile-menu" onClick={() => setMobileOpen(true)} className="p-2 rounded-md focus-visible:ring-4 focus-visible:ring-yellow-200 md:static z-50 bg-transparent">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="hidden md:block">
            <HeaderAuth />
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60]" aria-hidden={false}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden />
          <nav id="mobile-menu" ref={(el) => { mobileMenuRef.current = el; }} className="absolute inset-0 md:inset-auto md:bottom-0 left-0 right-0 bg-white p-6 rounded-t-xl md:rounded-none shadow-elev overflow-auto" role="dialog" aria-modal="true" aria-label="Menú móvil">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">🍫</div>
                <div className="font-semibold">La Dulcerina</div>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="p-2 rounded-md">✕</button>
            </div>

            <ul className="space-y-3">
              <li><Link href="/" ref={firstLinkRef} onClick={() => setMobileOpen(false)} className="block text-lg">Inicio</Link></li>
              <li><Link href="/productos" onClick={() => setMobileOpen(false)} className="block text-lg">Productos</Link></li>
              <li><Link href="/mis-pedidos" onClick={() => setMobileOpen(false)} className="block text-lg">Mis pedidos</Link></li>
              <li><Link href="/admin" onClick={() => setMobileOpen(false)} className="block text-lg">Admin</Link></li>
              <li><HeaderAuth /></li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

