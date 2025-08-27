"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, firstStock: 0, lastStock: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const prods = await fetch('/api/products').then(r => r.json());
        const orders = await fetch('/api/orders').then(r => r.json());
        if (!mounted) return;
        const totalProducts = Array.isArray(prods) ? prods.length : 0;
        const totalOrders = Array.isArray(orders) ? orders.length : 0;
        const firstStock = prods && prods[0] ? (prods[0].stock || 0) : 0;
        const lastStock = prods && prods[prods.length - 1] ? (prods[prods.length - 1].stock || 0) : 0;
        setStats({ totalProducts, totalOrders, firstStock, lastStock });
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-semibold">Acceso denegado</h2>
        <p className="mt-2 text-gray-600">Necesitas ser administrador para acceder a este panel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <div className="text-3xl">⚙️</div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <p className="text-gray-600 mt-2">Welcome, {user.name}. Aquí puedes administrar la plataforma.</p>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Total productos</div>
            <div className="text-2xl font-bold mt-1">{stats.totalProducts}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Total órdenes</div>
            <div className="text-2xl font-bold mt-1">{stats.totalOrders}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Stock primer producto</div>
            <div className="text-2xl font-bold mt-1">{stats.firstStock}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Stock último producto</div>
            <div className="text-2xl font-bold mt-1">{stats.lastStock}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <a href="/admin/products" className="p-6 bg-white rounded-lg shadow hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold">Gestionar chocolates publicados</h3>
            <p className="text-sm text-gray-500 mt-2">Ver, publicar o editar chocolates visibles en la tienda.</p>
          </div>
          <div className="text-4xl text-blue-500 mt-4">🍫</div>
        </a>

        <a href="/admin/orders" className="p-6 bg-white rounded-lg shadow hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold">Gestionar Ordenes</h3>
            <p className="text-sm text-gray-500 mt-2">Revisar y actualizar estado de pedidos.</p>
          </div>
          <div className="text-4xl text-green-500 mt-4">🧾</div>
        </a>

        <a href="/admin/users" className="p-6 bg-white rounded-lg shadow hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold">Manejar Usuarios</h3>
            <p className="text-sm text-gray-500 mt-2">Ver y administrar cuentas de usuario.</p>
          </div>
          <div className="text-4xl text-teal-500 mt-4">👥</div>
        </a>

        <a href="/admin/stock" className="p-6 bg-white rounded-lg shadow hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold">Gestionar Stock</h3>
            <p className="text-sm text-gray-500 mt-2">Ajustar inventario y niveles de stock.</p>
          </div>
          <div className="text-4xl text-yellow-500 mt-4">📦</div>
        </a>

        <a href="/admin/lista-productos" className="p-6 bg-white rounded-lg shadow hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold">Lista de Productos</h3>
            <p className="text-sm text-gray-500 mt-2">Ver lista completa de productos y detalles.</p>
          </div>
          <div className="text-4xl text-purple-500 mt-4">📋</div>
        </a>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h4 className="font-semibold">Quick Actions</h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm text-gray-700">
          <li>🔎 Revisar productos publicados</li>
          <li>📦 Revisar niveles de stock</li>
          <li>🧾 Revisión de órdenes recientes</li>
          <li>👤 Administrar usuarios y permisos</li>
        </ul>
      </div>
    </div>
  );
}
