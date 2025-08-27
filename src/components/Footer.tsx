"use client";

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-100 bg-transparent">
      <div className="container py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <h4 className="font-semibold mb-3">Tienda</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/productos">Productos</Link></li>
            <li><Link href="/novedades">Novedades</Link></li>
            <li><Link href="/ofertas">Ofertas</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Soporte</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/ayuda">Ayuda</Link></li>
            <li><Link href="/contacto">Contacto</Link></li>
            <li><Link href="/preguntas">Preguntas frecuentes</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/terminos">Términos</Link></li>
            <li><Link href="/privacidad">Privacidad</Link></li>
            <li><Link href="/cookies">Cookies</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Síguenos</h4>
          <p className="text-sm text-gray-600">Suscríbete para ofertas y noticias.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()} aria-label="Suscripción email">
            <input className="form-input" placeholder="Tu correo" aria-label="Correo electrónico" />
            <button className="btn btn-cta" aria-label="Suscribirse">OK</button>
          </form>
        </div>
      </div>

        <div className="border-t pt-6 pb-8 text-center text-sm text-gray-500">
  <div className="container">&copy; {new Date().getFullYear()} La Dulcerina — Chocolate artesanal y selección premium.</div>
      </div>
    </footer>
  );
}
