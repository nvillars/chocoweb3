Dirección visual (moderna, sobria, elegante)

Tipografías

Títulos: Playfair Display o Surt (toque gourmet).

Texto/UI: Inter o Plus Jakarta Sans (limpia, legible).

Carga con next/font/google y display: swap, pre-carga H1.

Paleta “chocolate fino”

Primario: #5A3E36 (cacao)

Secundario: #D4A373 (caramelo)

Neutros: #111827 (ink), #6B7280 (muted), #F8F5F2 (ivory)

Estado éxito: #16A34A | Peligro: #DC2626

Tokens de diseño

Espaciado: escala 4/8/12/16/24/32/48.

Radio: rounded-2xl en cards/botones; inputs rounded-xl.

Sombras: suaves y difusas en hover (shadow-lg).

Animaciones: micro-interacciones (dur 150–200ms, ease-out) + framer-motion en hero y cart.

3) Componentes clave (UI Kit)

Header/Navegación:

Barra fija con logo, buscador, categorías, CTA “Ver Carrito”.

Menú móvil 100% responsive con Sheet/Drawer (no “medio mostrado”).

Indicador de items en el carrito (badge).

Hero (con tus 2 videos maestro):

hero-desktop-16x9.mp4 y hero-mobile-9x16.mp4, auto-switch por breakpoint; poster JPG ligero.

Overlay con claim + botón “Comprar ahora”.

Catálogo/Product Grid & Card

Cards con next/image (ratio fijo), nombre, precio, tags, botón “Agregar”.

Etiquetas “Sin stock”, “Nuevo”, “-15%”.

Hover suave (elevación + leve zoom).

PDP (Product Detail)

Modal o /product/[slug] con galería, descrip., disponibilidad en vivo, recomendaciones.

Carrito flotante (Drawer)

Listado, qty stepper, mini-resumen, cupones, envío estimado, botón Checkout.

Checkout en 3 pasos

Datos y envío

Pago (tarjeta/billetera)

Confirmación + factura/boleta (PDF/Email)

Toasts no intrusivos y Loaders/Skeletons.

Footer con navegación secundaria, medios de pago, seguridad, datos legales.

4) Flujos UX esenciales (usuario)

Browse → Add to Cart → Buy

Añadir = idempotente (misma línea incrementa qty).

Si stock cambia durante el checkout, aviso y ajuste inmediato.

Checkout con múltiples proveedores

Tarjeta (pasarela), billeteras (Yape/Plin), COD opcional.

Webhook → Order update y reconciliación.

Órdenes

Página “Mis pedidos” con estado, factura y re-compra.

5) Flujos Admin

Dashboard con KPIs: Ventas hoy/7d/30d, AOV, tasa de conversión, top productos, alerta de stock bajo.

Órdenes: Filtros por estado/fecha/medio de pago; acciones masivas.

Productos: CRUD, carga de imágenes, bulk edit, control de visibilidad.

Usuarios: roles (admin, user), búsqueda y notas.

6) Robustez técnica (pagos, stock, idempotencia)

Concurrencia de stock (MongoDB)

Al intentar pagar:

Crear reserva de items con TTL (colección reservations) o usar un campo versionado y transactions.

Opción A (ligera): findOneAndUpdate de products con condición stock >= qty y decremento atómico; si falla, devuelves “sin stock”.

Opción B (transacción): agrupa todas las líneas y valida stock, descuenta y crea order bajo session—si algo falla, rollback.

Idempotencia

Ya usas metadata.idempotencyKey en orders ✅

En endpoints /api/checkout y /api/payment/confirm, cachea la respuesta final por idempotencyKey para reintentos de red.

OrderTokens

Úsalos para confirmación/seguimiento sin exponer _id, con TTL y used=true al completar.

Webhooks

Endpoint /api/webhooks/payments que:

verifica firma,

idempotente por eventId,

mapea status a orders.status (paid, failed, refunded) y guarda audit log.

7) Rendimiento y DX

Imágenes: next/image en todas las cards/hero; sizes y priority para hero.

Preconexión: <link rel="preconnect"> a pasarela y CDN estáticos.

Segmentos: ruta admin separada (lazy), componentes pesados con dynamic(() => import(...), { ssr:false }) si procede.

Cache de datos: revalidate por listas; SSE o stale-while-revalidate p/stock liviano.

Lighthouse/CLS: asegura alturas fijas a medios; skeletons.

8) Accesibilidad & i18n

Roles/Labels en inputs y botones; foco visible; contrates AA.

Moneda: Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).

Fechas: America/Lima.

Textos en español natural y consistente (“Añadir al carrito”, “Finalizar compra”).

9) Cambios concretos (qué tocar en este repo)

Design tokens en Tailwind

tailwind.config.{ts|js} – define colores brand, radio, sombras y tipografías (Inter + Playfair con next/font).

src/app/globals.css – variables CSS para tonos y estados + reset moderno.

Header/Navigation

src/components/Header.tsx + HeaderAuth.tsx

Añadir Drawer móvil con categorías, buscador, login. Evita “menú medio mostrado” usando @radix-ui Sheet o tu FloatingCart como referencia.

Hero con 2 videos maestros

src/components/HeroVideo.tsx – escoger fuente por useMediaQuery (≥1024 desktop, <1024 mobile), poster y playsInline muted autoPlay loop.

Archivos en public/videos/hero-desktop-16x9.mp4 y public/videos/hero-mobile-9x16.mp4.

ProductCard/Product Grid

src/components/ProductCard.tsx – usa next/image, badge stock/precio, CTA grande, animación hover.

src/app/page.tsx – grid responsivo con md:grid-cols-3 lg:grid-cols-4, paginación/“cargar más”.

Cart Drawer + Checkout

src/components/FloatingCart.tsx – UX pulido (steppers, cupones, costos envío).

src/components/Checkout.tsx + src/app/checkout/page.tsx – 3 pasos, validación, persistencia por localStorage/querystring step.

API/DB

src/app/api/checkout/route.ts – endpoint idempotente que:

valida stock (atómico)

crea orden status="pending" con idempotencyKey

inicia pago y retorna client_secret/QR

src/app/api/payments/confirm/route.ts – confirma, marca status="paid" y re-lee stock si webhook llega tarde.

Índices:

products: { slug:1 }, { stock:1 }, { published:1 }

orders: { "user.email":1, createdAt:-1 }, { "metadata.idempotencyKey":1, unique:true }

ordertokens: { token:1, unique:true }, { expiresAt:1 } (TTL)

Admin

src/app/admin/dashboard/page.tsx – tarjetas KPIs + tabla últimas órdenes + alerta stock bajo.

Filtros en /admin/orders por estado/fecha/pago; export CSV.

Observabilidad

Log estructurado en /lib/logger.ts.

Métricas RUM sencillas: FCP/LCP, tiempo a pago.

---

Objetivo principal adicional: Rediseño global del sitio

Además del foco en el flujo de checkout y la robustez de pagos/stock, el objetivo superior es ejecutar un rediseño integral de "La Dulcerina" que abarque toda la experiencia para todos los usuarios (clientes, admin, editores y visitantes). Esto incluye:

- Identidad y consistencia visual: aplicar el nuevo Design System en todas las páginas (tokens, tipografías, espacios, componentes) para lograr coherencia y confianza de marca.
- Mobile-first y rendimiento: optimizar para dispositivos móviles primero (TBT, FCP, LCP), reducir peso de páginas y garantizar navegación instantánea.
- Contenido y SEO técnico: mejorar headings, meta, Open Graph, schema.org para productos y colecciones; rutas limpias y sitemap.
- Conversión y UX: CTAs claros, micro-copy en todas las interacciones críticas (añadir, checkout, errores), pruebas A/B de variantes de CTA/Hero.
- Accesibilidad y cumplimiento: contraste AA, keyboard nav, roles ARIA, formularios accesibles y cumplimiento básico de privacidad (GDPR/LPD aplicable).
- Estructura editorial y CMS ligera: permitir actualizaciones de hero, banners y colecciones sin deploy (Headless CMS o archivos JSON/Markdown con UI simple).
- Observabilidad y métricas: RUM + eventos front (add_to_cart, begin_checkout, payment_initiated, payment_succeeded) enviados a analítica y logs estructurados.
- Operaciones y seguridad: hardening de endpoints críticos, manejo seguro de claves, políticas de CORS, rate limiting en webhooks.

Prioridades inmediatas (3–6 semanas)

1. Checkout: implementar el Stepper 3 pasos con validación RHF+Zod y APIs idempotentes.
2. Stock & pagos: endpoint initialize + confirm con reserva atómica y idempotencia por metadata.idempotencyKey.
3. Design tokens y globals.css; aplicar tipografías y palette en header/footer/components críticos.
4. OrderSummary sticky y FloatingCart pulido para móvil y desktop.

Métricas de éxito (30 días tras despliegue)

- Checkout conversion rate +10% (baseline requerido).
- Reducción de abandonos en checkout -20%.
- First Contentful Paint < 1.5s en móvil (meta alcanzable con optimizaciones).
- Tiempo medio de respuesta de APIs críticas < 300ms.

Siguientes pasos

- Desglosar el backlog en tickets atómicos (UI, API, infra, tests) y priorizar en sprints semanales.
- Implementar tests de integración para idempotencia y decremento de stock.
- Programar revisión de accesibilidad y auditoría de performance (Lighthouse, WebPageTest) en la PR de cada bloque.
