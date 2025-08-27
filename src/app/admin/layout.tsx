"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminBreadcrumbs from '../../components/AdminBreadcrumbs';
import useOrderCount from '../../hooks/useOrderCount';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const orderCount = useOrderCount();

  useEffect(() => {
    // only redirect when we know there is no user
    if (user === null) router.push('/login');
  }, [user, router]);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center">Cargando sesión...</div>;
  }

  if (!user || user.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center">Redirigiendo a login...</div>;
  }


  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { href: '/admin/products', label: 'Productos', icon: 'fa-box' },
    { href: '/admin/orders', label: 'Pedidos', icon: 'fa-receipt' },
    { href: '/admin/users', label: 'Usuarios', icon: 'fa-users' },
    { href: '/admin/stock', label: 'Stock', icon: 'fa-boxes-stacked' },
    { href: '/admin/lista-productos', label: 'Lista de Productos', icon: 'fa-list' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
        {/* Sidebar */}
        <aside className={`md:col-span-3 lg:col-span-2 sticky top-6 self-start transition-all ${collapsed ? 'w-16' : ''}`} aria-label="Sidebar">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center gap-3 justify-between">
              <h3 className="font-bold text-lg text-[#4E260E]">Administración</h3>
              <button aria-label="Colapsar menú" onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-1" role="navigation" aria-label="Admin menu">
              {links.map(l => {
                const active = pathname?.startsWith(l.href);
                return (
                  <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <i className={`fa-solid ${l.icon} w-4 text-center`} />
                    <span className={`${collapsed ? 'hidden' : ''}`}>{l.label}</span>
                    {/* badge for orders */}
                    {l.href === '/admin/orders' && orderCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{orderCount}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className={`mt-4 pt-2 border-t text-sm ${collapsed ? 'hidden' : ''}`}>
              <Link href="/" className="text-gray-600 hover:underline">Volver al sitio</Link>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="md:col-span-9 lg:col-span-10">
          <div className="bg-white rounded-2xl shadow p-6">
            <AdminBreadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
