Rol: Lead Engineer.
Objetivo: Integrar Mercado Pago + Yape (Checkout API/Bricks) con UX integrada, sandbox y webhooks en Next.js (App Router) y MongoDB Atlas (DB: chocoweb). End-to-end: el rol user puede pagar con Yape vía Mercado Pago, y el backend crea la orden atomicamente (decrementa stock y marca order.status='paid') tras recibir el webhook verificado.

Contexto repo:

DB en Atlas: MONGODB_URI=mongodb+srv://.../chocoweb?... y local MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/chocoweb.

Hoy existe src/app/api/webhooks/yape/route.ts y docs/YAPE_WEBHOOK.md para una firma “Yape directo”. Migrar a Mercado Pago.

Tareas (aplicar en PR único):

Dependencias & env

Instalar SDK: npm i mercadopago.

.env.local (sin exponer valores):

MP_PUBLIC_KEY= (public key)

MP_ACCESS_TOKEN= (access token)

MP_WEBHOOK_SECRET= (secret signature de webhooks MP)

NEXT_PUBLIC_BASE_URL=http://localhost:3000 (ya existe)

Mantener MONGODB_URI/MONGODB_URI_LOCAL apuntando a chocoweb.

Frontend (UX integrada)

Agregar Payment Brick o SDK JS de MP para Yape en el paso de pago (src/components/checkout/StepPayment.tsx / Checkout.tsx):

Si Payment Brick: habilitar método Yape.

Si Checkout API + JS SDK específico para Yape: capturar número y OTP, generar token en el cliente y enviarlo al backend (ver docs de Yape con Checkout API).

Enviar al backend: { items, shipping, address, paymentMethod:'yape', token, idempotencyKey }.

Backend (App Router)

Crear src/app/api/mercadopago/payments/route.ts (POST) que:

Usa SDK mercadopago con MP_ACCESS_TOKEN.

Crea payment con payment_method_id: 'yape' y el token recibido; adjunta metadata con items, idempotencyKey, email, etc.

Devuelve { paymentId, status, paymentSession }.

Crear src/app/api/webhooks/mercadopago/route.ts (POST) que:

Valida x-signature de Mercado Pago (secret signature).

Lee data.id/type del webhook, consulta el pago a MP y si está approved/succeeded, ejecuta transacción MongoDB:

Idempotencia por metadata.idempotencyKey (o payment.id) → si existe orden previa, devolver 200 con la misma.

updateOne condicional stock >= qty por cada item; si alguna falla → abort y 409.

Order.create() con payment.status='succeeded', provider='mercado_pago', providerPaymentId, y order.status='paid'.

Responder 200 en reintentos idempotentes.

Deprecar src/app/api/webhooks/yape/route.ts (dejar nota de migración).

Docs

Reemplazar docs/YAPE_WEBHOOK.md por docs/MP_YAPE_WEBHOOK.md (contenido provisto en este archivo).

Añadir pasos de sandbox (ngrok + simulador de webhooks de MP).

Pruebas

Script scripts/test-mp-webhook.ts que calcule una firma válida de MP y haga POST a /api/webhooks/mercadopago con body de ejemplo.

E2E: flujo user → crea pago Yape (sandbox) → recibo webhook → orden paid y stock decrementado.

Criterios de aceptación

Puedo pagar con Yape (sandbox) y veo la orden en MongoDB chocoweb con status='paid'.

El webhook valida x-signature y no crea duplicados (idempotencia).

Se documenta cómo probar local con ngrok y cómo registrar la URL en el panel de MP.

Referencias oficiales (para que Copilot respete nombres/headers):

Yape con Checkout API (captura OTP + teléfono con SDK JS y tokeniza). 
mercadopago.com.pe
+1

Webhooks + Secret Signature (x-signature) de Mercado Pago. 
Mercado Pago
Mercado Pago
Mercado Pago

Checkout Bricks (UX integrada).