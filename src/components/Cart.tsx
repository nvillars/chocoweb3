
"use client";

import React, { useState } from 'react';
import Image from 'next/image';

// Productos de ejemplo en el carrito con las imágenes SVG correctas
const cartItems = [
  {
    id: 1,
    name: 'Chocolate 70% Cacao',
    price: 18.00,
    image: '/productos/chocolate-70.svg',
    quantity: 1
  },
  {
    id: 2,
    name: 'Chocolate con Almendras',
    price: 22.00,
    image: '/productos/chocolate-almendras.svg',
    quantity: 2
  },
  {
    id: 3,
    name: 'Chocolate Blanco Artesanal',
    price: 20.00,
    image: '/productos/chocolate-blanco.svg',
    quantity: 1
  }
];

export default function Cart() {
  const [items, setItems] = useState(cartItems);
  const [open, setOpen] = useState(true);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Overlay oscuro y cierre al hacer clic fuera
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black bg-opacity-70 transition-opacity z-40 cursor-pointer"
        onClick={() => setOpen(false)}
        aria-label="Cerrar carrito"
      />
      <aside className="relative z-50 bg-white shadow-2xl p-8 w-full max-w-[520px] min-h-screen flex flex-col border-l border-gray-200" style={{width:'420px', maxWidth:'100vw', borderTopLeftRadius:'18px', borderBottomLeftRadius:'18px'}}>
        <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">×</button>
        <h2 className="text-xl font-bold mb-4 text-[#4E260E] flex items-center gap-2" style={{letterSpacing:0.5}}>
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
        Carrito de Compras
      </h2>
      
  {items.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
          <p className="text-gray-500">Tu carrito está vacío.</p>
          <p className="text-sm text-gray-400 mt-1">Agrega algunos chocolates deliciosos</p>
        </div>
      ) : (
    <div className="flex flex-col gap-4">
          {items.map(item => (
      <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 pb-4 last:border-b-0">
                <div className="relative">
                <Image src={item.image} alt={item.name} width={64} height={64} className="object-contain bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg p-2" />
                <button 
                  onClick={() => removeItem(item.id)}
          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors shadow-sm"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[#4E260E] text-sm truncate">{item.name}</h4>
                <span className="text-xs text-gray-500">S/ {item.price.toFixed(2)} c/u</span>
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-sm transition-colors"
                  >
                    -
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-[#7B3F00]">S/ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
          
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-[#7B3F00]">S/ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Envío</span>
              <span className="font-semibold text-[#7B3F00]">S/ 8.00</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
              <span className="font-bold text-[#4E260E] text-lg">Total</span>
              <span className="font-bold text-xl text-[#7B3F00]">S/ {(total + 8).toFixed(2)}</span>
            </div>
          </div>
          
          <button className="w-full bg-gradient-to-r from-[#7B3F00] to-[#A0522D] hover:from-[#A0522D] hover:to-[#7B3F00] text-white py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-[1.02]">
            Finalizar Compra
          </button>
          
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-[#7B3F00] py-2 rounded-lg font-medium transition-colors">
            Continuar Comprando
          </button>
        </div>
      )}
      </aside>
    </div>
  );
}
