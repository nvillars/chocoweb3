Actúa como un Tech Lead Frontend+Backend para un e-commerce Next.js (App Router) llamado “La Dulcerina” (venta de chocolates, MongoDB con collections: products, orders, users, ordertokens). Objetivo: rediseño moderno, sobrio y elegante con performance y UX táctil impecables, manteniendo seguridad de pagos y consistencia de stock.

CONTEXT:
- Repo actual ya tiene: src/app (home, cart, checkout, admin/*), contexts de Cart/Toast, HeroVideo, FloatingCart, headers de cache en next.config.js.
- DB ejemplo:
  - products: {_id, slug, name, description, price, stock, published, image, tags, createdAt, updatedAt}
  - orders: {_id, items[{productId,name,qty,unitPrice,lineTotal}], amounts{subtotal,shipping,tax,total}, payment{method,status,approvedAt,approvedBy,providerId}, status, user{email,name}, metadata{idempotencyKey, idempotencyKeyCreatedAt}, createdAt, updatedAt}
  - ordertokens: {token, orderId, expiresAt, used, createdAt}
  - users: {email, name, passwordHash, role}
- Pagos: tarjeta y billeteras (p. ej., Yape/Plin). Mantener idempotencia por metadata.idempotencyKey.

ENTREGABLES (haz commits pequeños y descriptivos):
1) DESIGN SYSTEM
   - Define tokens en tailwind.config: colores brand (#5A3E36, #D4A373, neutros), radios, sombras, y tipografías con `next/font` (Playfair Display para títulos, Inter para UI).
   - Actualiza src/app/globals.css con variables y resets; asegura focos visibles.

2) HEADER + NAV + HERO
   - Implementa Header responsive con Drawer móvil (Radix o Headless UI), buscador y badge del carrito.
   - Mejora Hero: usa 2 videos maestros (`public/videos/hero-desktop-16x9.mp4`, `public/videos/hero-mobile-9x16.mp4`), con poster, autoplay muted loop, y overlay con CTA.
   - Asegura que el menú móvil no quede “medio mostrado” (transiciones y bloqueo del scroll al abrir).

3) CATÁLOGO + PRODUCT CARD
   - Crea grid responsive en `src/app/page.tsx` con paginación o “cargar más”.
   - Refactoriza `src/components/ProductCard.tsx` usando `next/image`, badges (Sin stock/Nuevo/Descuento), CTA destacada, hover suave.

4) CARRITO + CHECKOUT
   - Pulir `src/components/FloatingCart.tsx`: stepper qty, cupones, envío, toasts claros.
   - Checkout en 3 pasos (`src/app/checkout/page.tsx`): Datos/Envío → Pago → Confirmación. Persistencia de estado entre pasos.

5) STOCK & PAGOS (ROBUSTEZ)
   - Endpoint `src/app/api/checkout/route.ts`:
     * valida y reserva stock (estrategia A: decremento atómico con findOneAndUpdate; estrategia B: transacción).
     * crea order `status="pending"` con `metadata.idempotencyKey` (unique index).
     * inicia pago (mock inicial) y devuelve client_secret/QR/redirect.
   - Endpoint `src/app/api/payments/confirm/route.ts`: idempotente por eventId, marca order `status="paid"`, guarda payment.status y `approvedAt`, genera y marca `ordertokens.used=true` si aplica.
   - Webhook `src/app/api/webhooks/payments/route.ts` con verificación de firma; registra audit log.
   - Crea/ajusta índices Mongo:
     * products: slug(1), published(1), stock(1)
     * orders: "user.email"(1), createdAt(-1), "metadata.idempotencyKey"(1 unique)
     * ordertokens: token(1 unique), expiresAt(1) con TTL

6) ADMIN
   - `src/app/admin/dashboard/page.tsx`: KPIs (ventas hoy/7d/30d, AOV, top productos), tabla últimas órdenes, alerta de low stock.
   - Filtros en `/admin/orders` y acciones masivas; export CSV de órdenes.

7) PERFORMANCE
   - Usa `next/image` en todo el catálogo/Hero; define `sizes` correctos y `priority` en hero.
   - Code-splitting: lazy para vistas admin y componentes pesados.
   - Preconexión a pasarela/CDN. Skeletons en home y admin.
   - Medición básica con web-vitals y evita CLS (altura fija de medios).

8) ACCESIBILIDAD & i18n
   - Etiquetas/roles ARIA, foco visible, contraste AA.
   - Moneda PEN: `Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'})`; fechas en zona America/Lima.

9) PRUEBAS & DOCS
   - Añade tests mínimos (stock decrement, idempotencia de checkout y confirm).
   - Crea README sección “Operación” con envs, índices e integración de pagos (mock o proveedor).

Aplica todos los cambios directamente en el repo con TypeScript/ESLint válidos, sin romper rutas existentes, y escribe commits atómicos y mensajes claros. Cuando termines cada bloque, crea TODOs siguientes en `TASKS_REDESIGN.md`.

   ADICIONAL — Objetivo principal: Rediseño integral del sitio

   Además del trabajo especificado sobre checkout, pagos y stock, se exige un rediseño global que cubra todos los perfiles de usuario y las páginas del sitio. Este objetivo incluye metas concretas, nuevas entregables y criterios de éxito.

   Nuevas entregables específicas para el rediseño global:

   - Style guide en `docs/STYLE_GUIDE.md` que documente tokens, tipografías, uso de imagen y ejemplos de componentes.
   - Implementación de `tailwind.config.ts` con tokens extendidos y variantes de tema (light/dark opcional).
   - Revisión y actualización de `src/app/layout.tsx` y `src/app/globals.css` para aplicar el nuevo sistema de diseño en todas las rutas.
   - Plantillas editoriales para marketing: `src/content/banners/*.md` + pequeño generador para preview en admin.
   - Meta y SEO: helpers en `src/lib/seo.ts` y plantillas OpenGraph para productos y páginas.
   - Documentación de rendimiento y checklist de pre-deploy (`docs/PERFORMANCE_CHECKLIST.md`).

   KPIs y criterios de aceptación para el rediseño:

   - Consistencia visual: 100% de páginas principales usan tokens (audit automático con script simple).
   - Mobile Core Web Vitals: FCP y LCP mejorados según objetivos (ej. LCP < 2.5s en 75% de cargas móviles).
   - Accesibilidad: pasar WCAG AA para formularios críticos (checkout, login).
   - SEO: todas las páginas de producto con schema.org Product y metadatos esenciales.

   Plan de trabajo ampliado (primeras 6 semanas):

   Semana 1: instalar deps (react-hook-form, zod), crear types y validators; bootstrap layout global y tailwind tokens.
   Semana 2: Stepper checkout (StepCustomer, StepPayment, StepReview) y OrderSummary; tests unitarios Zod.
   Semana 3: APIs checkout/initialize y payments/confirm con idempotencia; mock provider.
   Semana 4: Header/Hero redesign, ProductCard refactor, FloatingCart pulido.
   Semana 5: Admin dashboard mejoras y ordenes; CMS ligera para banners.
   Semana 6: QA, performance tuning, accessibility audit, pruebas end-to-end.

   Notas operativas:

   - Mantener ramas pequeñas y PRs temáticos. Cada PR debe incluir al menos 1 test que cubra el cambio funcional.
   - Para pagos reales, usar proveedor en entorno staging y mantener mocks en desarrollo.

   Cuando completes este archivo, agrega una entrada de TODO con los próximos tickets priorizados.

   TODO (next immediate tickets):

   - Implementar versión real de `src/app/api/checkout/initialize/route.ts` que use las colecciones MongoDB y realice reserva atómica o transaccional. (priority: high, owner: backend)
   - Implementar `src/app/api/payments/confirm/route.ts` real que valide idempotencia por `eventId`/`idempotencyKey`, marque orden como `paid` y gestione `ordertokens.used`. (priority: high)
   - Crear `src/app/api/webhooks/payments/route.ts` con verificación de firma del proveedor y registro de audit log. (priority: high)
   - Añadir índices Mongo recomendados (orders.metadata.idempotencyKey unique, ordertokens token unique + TTL). Documentar comandos en README OPERACIÓN. (priority: high)
   - Escribir tests unitarios para: stock decrement (findOneAndUpdate case), idempotent checkout initialize, confirm flows. (priority: medium)

