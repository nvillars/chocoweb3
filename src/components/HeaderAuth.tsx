"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function HeaderAuth() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // while auth is initializing, don't show the Login button (prevents
  // intermediate navigation to the login page). Only show Login when we
  // explicitly know there's no user (null).
  if (user === undefined) {
    return <div className="w-24 h-6 bg-transparent" />;
  }

  if (user === null) {
    return (
      <button onClick={() => router.push('/login')} className="bg-white text-blue-600 px-3 py-1 rounded-md font-medium shadow-sm hover:shadow">Login</button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.role === 'admin' && (
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="bg-white text-[#1f2937] px-3 py-1 rounded-md font-medium shadow-sm hover:shadow flex items-center gap-2">
            <i className="fa-solid fa-gear"></i>
            <span>Admin</span>
            <i className="fa-solid fa-caret-down text-xs"></i>
          </button>

          {open && (
            <div role="menu" style={{ color: '#1f2937' }} className="absolute right-0 mt-2 w-56 bg-white text-left rounded shadow-lg z-50 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100">
              <div className="py-1">
                <button role="menuitem" style={{ color: '#1f2937' }} onClick={() => { setOpen(false); router.push('/admin/dashboard'); }} className="w-full text-left block px-4 py-2 hover:bg-gray-50"><i className="fa-solid fa-th-large mr-2"></i> Admin Dashboard</button>
                <button role="menuitem" style={{ color: '#1f2937' }} onClick={() => { setOpen(false); router.push('/admin/products'); }} className="w-full text-left block px-4 py-2 hover:bg-gray-50"><i className="fa-solid fa-bomb mr-2"></i> Gestionar chocolates publicados</button>
                <button role="menuitem" style={{ color: '#1f2937' }} onClick={() => { setOpen(false); router.push('/admin/orders'); }} className="w-full text-left block px-4 py-2 hover:bg-gray-50"><i className="fa-solid fa-receipt mr-2"></i> Gestionar Ordenes</button>
              </div>
              <div className="py-1">
                <button role="menuitem" style={{ color: '#1f2937' }} onClick={() => { setOpen(false); router.push('/admin/users'); }} className="w-full text-left block px-4 py-2 hover:bg-gray-50"><i className="fa-solid fa-users mr-2"></i> Manejar Usuarios</button>
                <button role="menuitem" style={{ color: '#1f2937' }} onClick={() => { setOpen(false); router.push('/admin/stock'); }} className="w-full text-left block px-4 py-2 hover:bg-gray-50"><i className="fa-solid fa-boxes-stacked mr-2"></i> Gestionar Stock</button>
                <button role="menuitem" style={{ color: '#1f2937' }} onClick={() => { setOpen(false); router.push('/admin/lista-productos'); }} className="w-full text-left block px-4 py-2 hover:bg-gray-50"><i className="fa-solid fa-list mr-2"></i> Lista de Productos</button>
              </div>
            </div>
          )}
        </div>
      )}

  <div className="text-sm text-[#1f2937]">Hola, {user.email}</div>
  <button onClick={() => { logout(); router.replace('/'); }} className="bg-white text-blue-600 px-3 py-1 rounded-md font-medium shadow-sm hover:shadow">Logout</button>
    </div>
  );
}
