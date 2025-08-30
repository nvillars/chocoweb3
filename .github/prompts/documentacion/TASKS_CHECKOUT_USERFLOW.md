Actúa como Lead Engineer de Frontend+Backend en un e-commerce Next.js (App Router) llamado “La Dulcerina”. En este repo ya existen:
- Páginas y componentes clave: src/app/{checkout, cart}, src/components/{Checkout.tsx, FloatingCart.tsx, Cart.tsx, Header.tsx, ProductCard.tsx, ProductCatalog.tsx}, contextos: src/context/{CartContext.tsx, ToastContext.tsx}.
- Back con MongoDB (collections: products, orders, users, ordertokens). Orders ya usa metadata.idempotencyKey.
Objetivo: rediseñar el **flujo del cliente** desde carrito hasta pago final, con formularios y pasos al nivel de Saga Falabella/Ripley: claros, rápidos, accesibles y seguros.

### ALCANCE
1) **UI/UX Checkout multinivel (3 pasos)** con **Stepper**:
   - Paso 1: **Datos del cliente y envío** (nombre, email, teléfono, dirección: departamento/provincia/distrito, referencia; opción “recoger en tienda” si procede).
   - Paso 2: **Pago** con métodos:
     a) **Tarjeta de crédito/débito** (usar Hosted Checkout/Redirect del proveedor → PCI-safe).
     b) **Billeteras** (p. ej., Yape/Plin) como **“Pendiente fuera del sitio”**: mostramos instrucciones/QR y creamos la orden en estado pendiente.
     c) **Contraentrega/COD** (opcional y configurado).
   - Paso 3: **Revisión y confirmación** (resumen, políticas, total, botón “Pagar” / “Confirmar pedido” según método).
   - Cada paso tiene validación en tiempo real, errores amigables y accesibilidad (labels, aria, foco).

2) **Formularios de alto nivel**:
   - UI: Tailwind + inputs amplios, helper-text, masks (teléfono), selects dependientes (Dep/Prov/Dist).
   - Validación: **react-hook-form + zod** (agregar al repo si falta) con esquemas por paso.
   - i18n/moneda: es-PE, PEN con Intl.NumberFormat; fechas en America/Lima.
   - States: loading, disabled, errores de red, toasts de éxito/error no intrusivos.

3) **Pagos y estados**:
  - `PaymentMethod`: "card" | "wallet".
  - `OrderStatus`: "cart" | "paid" | "failed" | "cancelled".
  - Nota operativa: No se acepta más pago contra entrega (COD). Tampoco se mantiene el estado intermedio `pending` en persistencia. El flujo es: el usuario arma su carrito, elige envío/dirección, completa el pago y solo cuando el pago se confirma la orden se registra y queda en `paid`.
  - **Tarjeta**: iniciar sesión/redirect en la pasarela (opcionalmente devolver un `clientSecret` o `redirectUrl`). La orden final se marca `paid` y se persiste cuando la pasarela confirma el pago de forma segura (webhook o retorno firmado). Todo debe ser idempotente.
  - **Wallet (Yape/Plin)**: al generar el QR/instrucciones no se crea la orden en la base de datos. En su lugar se devuelve una `paymentSession`/`paymentToken` con instrucciones. Solo cuando se reciba confirmación del pago por webhook o comprobante se crea la orden en persistencia y se marca `paid`. Esto evita órdenes `pending` por fuera de la transacción de pago.

4) **Stock & idempotencia** (solo menciona lo necesario en este flujo):
   - Al **iniciar el pago**: validar stock y **reservar/descontar atómicamente** (estrategia A: findOneAndUpdate con condición y decremento; estrategia B: transaction).
   - Idempotencia por `metadata.idempotencyKey` (unique index). Reintentos seguros.

5) **Resumen Sticky / Drawer**:
   - En todo checkout, mostrar a la derecha (o arriba en mobile) un **resumen** con items, costos (subtotal, envío, impuestos si aplica) y **total**. Actualiza en vivo si cambia envío/método.

6) **Accesibilidad & performance**:
   - Stepper con roles/aria, foco manejado entre pasos, contraste AA.
   - Skeletons en carga. `next/image` en miniaturas. Evitar CLS.
   - Mensajería clara (“No pudimos procesar tu tarjeta”, “Producto agotado”, “Pedido pendiente por confirmar pago en Yape/Plin”).

### CAMBIOS CONCRETOS (CREA/EDITA ESTOS ARCHIVOS)
- **Componentes UI (cliente)**
  - `src/components/checkout/CheckoutStepper.tsx`: indicador de pasos con accesibilidad.
  - `src/components/checkout/StepCustomer.tsx`: form RHF+Zod para datos personales y dirección (dep/prov/dist, teléfono con máscara, email).
  - `src/components/checkout/StepPayment.tsx`: selector de método (card/wallet) + sub-form:
      * Card: botón “Pagar con tarjeta” → inicia sesión de pasarela y redirige.
      * Wallet: render de QR/instrucciones, checkbox “Ya realicé el pago fuera del sitio”.
  - `src/components/checkout/StepReview.tsx`: resumen completo, políticas (checkbox), botón final.
  - `src/components/checkout/OrderSummary.tsx`: tarjeta derecha/sticky con items, cantidades, envío, total (Intl PEN).
- **Páginas**
  - `src/app/checkout/page.tsx`: orquestador de pasos (estado central), layout responsive; usa Stepper + Step* + OrderSummary.
- **Lógica/Tipos**
  - `src/types/checkout.ts`: `CheckoutPayload`, `OrderItem`, `PaymentMethod`, `OrderStatus`, `Address`, `ShippingOption`.
  - `src/lib/validation/checkout.ts`: esquemas Zod por paso.
  - `src/lib/payments/provider.ts`: interfaz generica de pagos (createCardSession, confirmCardPayment, etc).
- **APIs**
  - `src/app/api/checkout/initialize/route.ts` (POST):
      * Entrada: { items, address, shipping, paymentMethod, idempotencyKey }.
      * Valida stock (decremento atómico o reserva), crea order `status="pending"`, retorna:
        - si `card`: { redirectUrl | clientSecret } (mock si no hay proveedor real).
        - si `wallet`: { pending:true, provider:"Yape"|"Plin", instructions, qrDataUrl, orderToken }.
        - si `cod`: { pending:true, cod:true, orderId }.
  - `src/app/api/payments/confirm/route.ts` (POST):
      * Entrada: { idempotencyKey | orderId | eventId }.
      * Idempotente; marca `status="paid"` y setea `payment.status="succeeded"`, `approvedAt`, `providerId`.
  - (Opcional) `src/app/api/webhooks/payments/route.ts`: recibir eventos de pasarela; idempotente por `eventId`.
- **Admin tie-in (solo hook mínimo)**
  - Asegura que en `/admin/orders` botón “Orden paga” cambie `status -> paid` y setee `payment` consistente para orders `wallet`/`cod`.

### CONTRATOS (TIPOS)
- `OrderItem`: { productId: string; name: string; qty: number; unitPrice: number; lineTotal: number }
- `Address`: { fullName: string; email: string; phone: string; addressLine1: string; reference?: string; departamento: string; provincia: string; distrito: string }
- `PaymentMethod`: 'card' | 'wallet' | 'cod'
- `OrderStatus`: 'cart' | 'pending' | 'paid' | 'failed' | 'cancelled'
- `CheckoutPayload`: { items: OrderItem[]; address: Address; shipping: { method: 'envio'|'recojo'; price: number }; paymentMethod: PaymentMethod; idempotencyKey: string }

Notes on contracts after update:
- `PaymentMethod`: 'card' | 'wallet' (COD removed)
- `OrderStatus`: 'cart' | 'paid' | 'failed' | 'cancelled' (no 'pending')
- For wallet flows the `initialize` response may return a `paymentSession` or `paymentToken` (QR/instructions). The order itself is created in persistence only after payment confirmation; therefore `CheckoutPayload` remains the same but the backend may respond with a `paymentSession` object instead of creating a DB order.

### VALIDACIONES (Zod)
- Email válido, teléfono 9 dígitos Perú, campos obligatorios claros.
- Si shipping.method='envio' → dirección completa obligatoria; si 'recojo' → oculta dirección y muestra locales.
- Checkbox de aceptación de políticas antes de “Confirmar”.

### UX DETALLE
- **Stepper** siempre visible (desktop) y compacto (mobile). Muestra paso actual y éxito de pasos previos.
- **Botonera** con “Volver”/“Continuar” en cada paso; `disabled` cuando el form no es válido o está cargando.
- **Toasts** breves y útiles (ej.: “Guardamos tu dirección”, “Iniciando pago seguro”).
- **Errores de pago** con retry y preservando estado del carrito.

### PERFORMANCE
- `next/image` en miniaturas, `priority` sólo donde corresponde.
- Evitar recomputos: memorizar OrderSummary.
- Skeletons al cargar shipping o confirmación.

### PRUEBAS MÍNIMAS (crear si no existen)
- Unit: validación Zod por paso; cálculo de totals; idempotencia de initialize/confirm.
- E2E (opcional): flujo happy-path card y wallet-pending.

### ÍNDICES MONGO (si faltan)
- orders: { "metadata.idempotencyKey": 1, unique: true }, { createdAt: -1 }, { "user.email": 1 }
- products: { slug: 1 }, { stock: 1 }, { published: 1 }
- ordertokens: { token: 1, unique: true }, { expiresAt: 1 } (TTL)

### ESTILO/ACCESIBILIDAD
- Inputs grandes, `rounded-xl`, alto contraste; helper-text y aria-describedby.
- Mensajes en español natural (es-PE). Moneda PEN con Intl.

### PLAN DE COMMITS (hazlos atómicos)
1) deps: instala react-hook-form, zod; crea types y validadores.
2) UI: Stepper, OrderSummary, StepCustomer.
3) UI: StepPayment (card/wallet/cod) con estados y validación.
4) UI: StepReview + botón confirmar.
5) API: /api/checkout/initialize con idempotencia y validación de stock.
6) API: /api/payments/confirm con idempotencia; wire con front.
7) Integración: redirección a pasarela (mock provider.ts si no hay credenciales).
8) Pulidos: toasts, loaders, accesibilidad, skeletons.
9) Tests y README (sección “Flujo de cliente y pagos”).

Entrega los cambios listos, tipados en TypeScript, sin romper rutas existentes. Acompaña cada commit con un mensaje claro y una breve nota en TASKS_CHECKOUT_USERFLOW.md sobre lo siguiente a mejorar.
