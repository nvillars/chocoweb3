"use client";

import React from 'react';

export default function AdminPage() {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#4E260E]">Panel de Administración</h2>
      <p className="mt-3 text-gray-600">Desde aquí puedes gestionar productos, ver pedidos y revisar usuarios.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="font-semibold">Productos</div>
          <div className="text-sm text-gray-500 mt-2">Gestiona el catálogo</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="font-semibold">Pedidos</div>
          <div className="text-sm text-gray-500 mt-2">Ver pedidos recientes</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="font-semibold">Usuarios</div>
          <div className="text-sm text-gray-500 mt-2">Revisar cuentas</div>
        </div>
      </div>
    </div>
  );
}
