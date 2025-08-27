Eres mi pair senior y vas a ejecutar un REDISEÑO PREMIUM de mi tienda de chocolates (Next.js 15 + React 19, App Router, Tailwind v4, MongoDB, Stripe, SSE). Mantén intacta la lógica de negocio y pagos; concéntrate en UI/UX, accesibilidad y performance. Contexto del repo:

- App Router en /src/app
- Componentes en /src/components
- Contextos en /src/context (CartContext, AuthContext, SSE)
- API routes en /src/app/api (products, orders, users, webhooks/stripe)
- Modelos Mongoose en /src/models
- Catálogo y hero ya existen; admin tiene páginas para productos, órdenes, usuarios y stock.

Objetivos innegociables:
1) Diseño moderno, sobrio y elegante con estética premium chocolatera.
2) Navegación 100% responsive SIN menús “a medias”: header transparente sobre el Hero que se solidifica con scroll; en móviles usa “sheet” de ancho completo.
3) Tipografías: Playfair Display para títulos y Inter para texto. Usa carga no bloqueante o next/font, según convenga.
4) Tarjetas de producto con micro-interacciones (hover suave, press en botones), estado “sin stock”, y botones Ver/Agregar.
5) Estados UI: loading/empty/error en catálogo y admin.
6) Accesibilidad AA: focus visibles, contrastes suficientes, aria-labels.
7) Subir Performance Lighthouse (mínimo +30 pts): imágenes responsivas con sizes correctos, poster en video, WebM primero, preload metadata, reducir trabajo en main thread, evitar re-renders.
8) Mantén SSE para sincronizar catálogo y stock; NO romper eventos.
9) Evitar dependencias pesadas. Sólo usa framer-motion si demuestra valor y tamaño contenido.
10) No tocar la lógica de Stripe ni las rutas de órdenes; sólo mejorar UI/UX.

Tareas concretas (archivo por archivo):
- src/app/globals.css: integra design tokens (bg/fg/brand/gold), radios, sombras, y primitivas .btn/.card. Asegura que todo el proyecto puede usar estas utilidades.
- src/components/Header.tsx: reemplázalo por un header premium con: brand “La Dulcerina”, indicador SSE, enlaces Inicio/Productos/Mis pedidos/Admin (según rol), CTA Ver catálogo y Carrito con badge, sheet móvil completo, estado scrolled para aplicar blur y sombra.
- src/components/Footer.tsx: crea footer con 4 columnas (Tienda, Soporte, Legal) y nota de marca; intégralo en layout.
- src/components/ProductCard.tsx: nuevo componente reutilizable con Image (next/image), sizes correctos, estado sin stock overlay, botones Ver/Agregar (usa CartContext).
- src/components/ProductCatalog.tsx: úsalo para renderizar la grilla (no reescribas la lógica SSE; sólo el render).
- src/components/FloatingCart.tsx: alinear estilos con tokens (.btn, .card) y mostrar total con tipografía clara.
- src/app/page.tsx (home): asegura que el Hero tiene CTA a #catalog fijo y que los paddings no colisionan con el header fijo.
- Accesibilidad: añade aria-label en botones del header, roles semánticos en nav y footer, y focus states visibles.
- Performance:
  - En ProductCard.tsx, aplica sizes: "(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 22vw"
  - En HeroVideo, usa poster, preload="metadata" y prioriza WebM si existe.
  - Opcional: memoiza listas de productos y elementos de Card para evitar renders.
- SEO: conserva metadata en layout; no rompas icon links ni PWA hints.

Entrega:
- Commits atómicos por archivo con mensajes claros.
- Verifica que el menú móvil cubre toda la pantalla y no queda cortado.
- Corre `npm run build` y arregla cualquier error de tipos. No introduzcas dependencias innecesarias.
- Si cambias estilos, aplícalos con Tailwind v4 y/o las utilidades .btn/.card de globals.css.
- No cambies las APIs ni el flujo de pago/stock.

Al terminar, crea un checklist de QA:
- Header (desktop/móvil), navegación, accesibilidad.
- Catálogo con 6+ productos, estados sin stock y SSE activo.
- Carrito: agregar/quitar/actualizar cantidades, toasts.
- Checkout: sigue funcionando (Stripe), órdenes se crean y stock decrece.
- Admin: listado productos/órdenes/usuarios con estados vacíos.
- Lighthouse: adjunta comparativa antes/después (Performance/Acc/SEO).



DETALLE DEL REDISEÑO:

plan quirúrgico (diseño + UX + perf) con código pegable y, al final, el prompt contundente para Copilot que orquesta todo el rediseño sobre tu estructura de carpetas.

1) Sistema de diseño (moderno, sobrio, elegante)

Paleta (cacao premium):

Fondo base: #FAF6F1 (crema cálida)

Texto principal: #2A211B

Cacao 700 (brand): #5A3825

Cacao 500 (acento): #7B4A2E

Oro suave: #C4A062

Verde menta leve (éxito): #A8D5BA

Error accesible: #B00020

Tipografías:

Títulos: Playfair Display (elegancia artesanal)

Texto/UI: Inter (legible y moderna)

Ajuste fino de tracking/leading y escala modular (h1→h6).

Micro-interacciones “táctiles” (sin ruido):

Hover: elevación sutil + borde oro 10% (focus visible).

Active: “press” scale 0.98 en botones/cards.

Transiciones 150–200ms.

Layout responsive:

Contenedor: max-w-[1120px] + px-6 (móvil) / px-10 (xl).

Menú móvil con “sheet” completo; nada de menús cortados.

2) Cambios base: design tokens + tipografía

📄 Edita src/app/globals.css (reemplaza la sección :root y base; Tailwind v4 se mantiene):

@import "tailwindcss";

/* ===== Design Tokens ===== */
:root {
  --bg: #FAF6F1;
  --bg-elevated: #FFFFFF;
  --fg: #2A211B;

  --brand-700: #5A3825; /* cacao intenso */
  --brand-500: #7B4A2E; /* cacao medio */
  --brand-300: #B78563; /* cacao claro */
  --gold: #C4A062;
  --mint: #A8D5BA;
  --error: #B00020;

  --radius: 14px;

  --shadow-1: 0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.06);
  --shadow-2: 0 8px 24px rgba(0,0,0,.10);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161312;
    --bg-elevated: #1F1A18;
    --fg: #F2EDE9;
    --brand-700: #D5B08A;
    --brand-500: #E6C8A5;
    --brand-300: #F0DABD;
    --gold: #E8C987;
    --mint: #7CC4A4;
    --error: #FFB3B3;
    --shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.5);
    --shadow-2: 0 8px 24px rgba(0,0,0,.6);
  }
}

/* ===== Base ===== */
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

h1,h2,h3,.display {
  font-family: 'Playfair Display', ui-serif, Georgia, 'Times New Roman', serif;
  letter-spacing: .2px;
}

a { text-underline-offset: 3px; }

/* ===== Primitivos UI ===== */
.btn {
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  padding:.75rem 1rem; border-radius: var(--radius);
  transition: transform .15s ease, box-shadow .2s ease, background-color .2s ease, color .2s ease;
  font-weight:600;
}
.btn:active { transform: scale(.98); }
.btn-primary {
  background: var(--brand-700); color: #fff; box-shadow: var(--shadow-1);
}
.btn-primary:hover { background: var(--brand-500); box-shadow: var(--shadow-2); }
.btn-outline {
  background: transparent; color: var(--brand-700); border:1px solid color-mix(in oklab, var(--gold) 40%, transparent);
}
.card {
  background: var(--bg-elevated); border-radius: var(--radius); box-shadow: var(--shadow-1);
}
.card:hover { box-shadow: var(--shadow-2); }

/* Safe area for notch */
@supports(padding:max(0px)) {
  .safe { padding-left: max(1.5rem, env(safe-area-inset-left)); padding-right:max(1.5rem, env(safe-area-inset-right)); }
}

3) Header verdaderamente responsive + sheet móvil

📄 Reemplaza src/components/Header.tsx por este (con menú móvil de pantalla completa, estado “scrolled”, y badge del carrito):

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSSEStatus } from "../context/SSEStatusContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Header() {
  const pathname = usePathname();
  const { status } = (() => { try { return useSSEStatus(); } catch { return { status: 'connected' as const }; } })();
  const { user } = (() => { try { return useAuth(); } catch { return { user: null as any }; } })();
  const cart = (() => { try { return useCart(); } catch { return null; } })();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-xl transition-colors ${active ? "bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-[var(--brand-700)]" : "hover:bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]"}`}
        onClick={() => setOpen(false)}
      >
        {children}
      </Link>
    );
  };

  const cartCount = cart?.getTotalItems?.() ?? 0;

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "backdrop-blur bg-[color-mix(in_oklab,var(--bg-elevated)_85%,transparent)] shadow" : "bg-transparent"}`}>
      <div className="safe max-w-[1120px] mx-auto flex items-center justify-between py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[var(--brand-700)] text-white grid place-items-center shadow">🍫</div>
            <span className="font-semibold tracking-wide text-lg">La&nbsp;Dulcerina</span>
          </Link>
          <span className={`w-2 h-2 rounded-full ml-2 ${status === 'connected' ? "bg-green-500" : status === 'connecting' ? "bg-yellow-400" : "bg-red-500"}`} title={`SSE: ${status}`} />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/">Inicio</NavLink>
          <NavLink href="/productos">Productos</NavLink>
          {user && user.role !== "admin" && <NavLink href="/mis-pedidos">Mis pedidos</NavLink>}
          {user?.role === "admin" && <NavLink href="/admin/dashboard">Admin</NavLink>}
        </nav>

        {/* CTA + Cart */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="#catalog" className="btn btn-outline">Ver catálogo</Link>
          <Link href="/carrito" className="relative btn btn-primary">
            Carrito
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--gold)] text-[var(--fg)]">{cartCount}</span>
            )}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button aria-label="Abrir menú" className="md:hidden btn btn-outline" onClick={() => setOpen(true)}>Menú</button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--bg)_80%,#000000_20%)] backdrop-blur-sm md:hidden">
          <div className="absolute inset-x-0 top-0 bg-[var(--bg-elevated)] rounded-b-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Navegación</span>
              <button className="btn btn-outline" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
            <div className="mt-4 grid gap-2 text-base">
              <NavLink href="/">Inicio</NavLink>
              <NavLink href="/productos">Productos</NavLink>
              {user && user.role !== "admin" && <NavLink href="/mis-pedidos">Mis pedidos</NavLink>}
              {user?.role === "admin" && <NavLink href="/admin/dashboard">Admin</NavLink>}
              <Link href="/carrito" className="btn btn-primary mt-2">Carrito {cartCount ? `(${cartCount})` : ""}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


El header es transparente sobre el Hero y se “solidifica” al hacer scroll; en móvil abre un “sheet” que evita el menú a medias.

4) Footer consistente (confianza + enlaces)

📄 Añade src/components/Footer.tsx y úsalo al final del layout.tsx (debajo de {children}):

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[color-mix(in_oklab,var(--gold)_12%,transparent)]">
      <div className="safe max-w-[1120px] mx-auto py-10 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[var(--brand-700)] text-white grid place-items-center">🍫</div>
            <span className="font-semibold">La Dulcerina</span>
          </div>
          <p className="mt-3 text-sm opacity-80">Chocolates artesanales hechos con cacao peruano.</p>
        </div>
        <div>
          <h3 className="font-semibold">Tienda</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/productos">Catálogo</a></li>
            <li><a href="/mis-pedidos">Mis pedidos</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Soporte</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/politicas/envios">Envíos</a></li>
            <li><a href="/politicas/devoluciones">Devoluciones</a></li>
            <li><a href="/contacto">Contáctanos</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/legal/terminos">Términos y Condiciones</a></li>
            <li><a href="/legal/privacidad">Privacidad</a></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs opacity-70 py-6">© {new Date().getFullYear()} La Dulcerina.</div>
    </footer>
  );
}


En src/app/layout.tsx, importa y coloca <Footer /> tras <ToastContainer />.

5) Tarjeta de producto premium (estética + estados)

📄 Crea src/components/ProductCard.tsx y úsalo dentro de ProductCatalog.tsx para cada ítem (reemplaza el markup de cada card por este componente):

"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../context/CartContext";

type Props = {
  id: string;
  slug: string;
  name: string;
  price?: number;
  image?: string;
  stock: number;
};

export default function ProductCard(p: Props) {
  const cart = useCart();
  const disabled = p.stock <= 0;

  return (
    <div className="card group overflow-hidden relative">
      <div className="relative aspect-[4/5]">
        <Image
          src={p.image || "/assets/hero-poster.jpg"}
          alt={p.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 22vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          priority={false}
        />
        {disabled && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <span className="px-3 py-1 rounded-full text-sm bg-[var(--bg-elevated)]">Sin stock</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <Link href={`/productos/${p.slug}`} className="block">
          <h3 className="text-lg font-semibold leading-snug">{p.name}</h3>
        </Link>
        <div className="mt-1 text-[color-mix(in_oklab,var(--brand-700)_86%,var(--fg))] font-semibold">
          {typeof p.price === "number" ? `S/ ${p.price.toFixed(2)}` : "—"}
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={`/productos/${p.slug}`} className="btn btn-outline">Ver</Link>
          <button
            className="btn btn-primary disabled:opacity-60"
            disabled={disabled}
            onClick={() => cart.addToCart(p.id, 1)}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}


Esto aporta jerarquía, micro-interacción y un estado “sin stock” claro.

6) Hero: sensación premium sin matar performance

Mantén tu HeroVideo, pero:

Agrega poster="/assets/hero-poster.jpg" a los <video>.

Genera .webm ligeros y detecta soporte (ya tienes caché de HEAD; perfecto).

Quita autoplay en móvil si bloquea reproducción; usa muted playsInline y IntersectionObserver para pausar fuera de viewport.

Coloca un CTA fijo al borde inferior del Hero que lleve a #catalog.

7) Admin: tabla limpia con vacíos, filtros y bulk

Añade estados vacíos (“Aún no hay productos publicados”), carga esqueleto (animate-pulse), y acciones masivas (publicar/despublicar, eliminar/restaurar).

Encabezado “sticky”, scroll con overflow-auto, y barra de búsqueda.

(Si quieres, te paso una tabla base con “sticky header” y checkbox por fila.)

8) Accesibilidad, copia y mensajes

Contraste AA en botones y textos sobre imágenes.

Estados: loading, empty, error en catálogo y admin.

Mensajes de toast: tono cálido, corto y específico (“Agregado al carrito”, “Stock actualizado”, “Pago confirmado”).

9) Rendimiento (sube ese Lighthouse)

Imágenes responsivas (ya dejaste un script con sharp): ejecútalo y usa sizes como en ProductCard.

Video: poster ligero, preload="metadata", WebM primero.

Fuente: puedes migrar a next/font para estabilizar CLS (opcional; tu carga no bloqueante está bien).

Bundle: evita librerías pesadas en cliente; usa Server Components cuando puedas.

Cache HTTP en /api/products con ETag y s-maxage si sirves desde Vercel.

Evita re‐renders: memoriza ítems y selectores del carrito; ya estás usando context.

10) Integra el Footer y corrige layout

En src/app/layout.tsx, importa el Footer y colócalo tras {children}:

import Footer from "../components/Footer";
...
<Header />
{children}
<ToastContainer />
<Footer />

✅ Entregables clave que ya puedes pegar

globals.css (tokens + base)

Header.tsx (nuevo)

Footer.tsx (nuevo)

ProductCard.tsx (nuevo, úsalo dentro de ProductCatalog)

Si quieres, en otro mensaje te doy el diff exacto de ProductCatalog.tsx para que reemplace su card interna por <ProductCard .../>.