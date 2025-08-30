# Mercado Pago + Yape — Webhook & órdenes atómicas (Next.js + MongoDB Atlas)

**Objetivo**: Recibir notificaciones de Mercado Pago para pagos con **Yape**, validar la **firma (`x-signature`)**, verificar el pago en MP y **crear la orden** de forma **atómica** (decremento de stock + `status='paid'`) en la DB **chocoweb**.

## Endpoints

- **Webhook**: `POST /api/webhooks/mercadopago`
- **Crear pago** (server): `POST /api/mercadopago/payments`  
  Recibe `{ token, items, shipping, address, idempotencyKey }` y crea el pago con `payment_method_id: 'yape'`.

## Variables de entorno

- `MONGODB_URI` / `MONGODB_URI_LOCAL` → apuntan a **/chocoweb**.
- `MP_ACCESS_TOKEN` (server)
- `MP_PUBLIC_KEY` y `NEXT_PUBLIC_BASE_URL` (client)
- `MP_WEBHOOK_SECRET` (Secret Signature de MP para `x-signature`)

> **Docs**: Yape con Checkout API (token con OTP + teléfono) y Secret Signature de webhooks (`x-signature`). :contentReference[oaicite:5]{index=5}

## Flujo de pago (resumen)

1. **Cliente** (UX integrada): usa **Checkout Bricks** o **JS SDK** para Yape → captura **teléfono** y **OTP**, genera **token**. :contentReference[oaicite:6]{index=6}
2. **Servidor** crea `payment` con SDK de MP (`payment_method_id: 'yape'`, `token`, `transaction_amount`, `description`, `metadata` con `items` e `idempotencyKey`).
3. **Mercado Pago** envía **Webhook** (`x-signature`, `data.id`, `type`). Validar firma; luego **consultar pago** por `data.id`. Si `approved/succeeded`:
   - Iniciar **sesión/transaction** MongoDB.
   - **Idempotencia**: si ya existe una orden con `metadata.idempotencyKey` (o con ese `payment.id`), devolver 200 con la existente.
   - Para cada item: `updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { session })`; si alguna no afecta doc → abort + 409.
   - `Order.create()` con `payment.status='succeeded'`, `provider='mercado_pago'`, `providerPaymentId: <payment.id>`, `status='paid'`.
   - `commitTransaction()`.
4. Responder **200** también en **reintentos** (idempotencia).

## Seguridad — Validación de `x-signature`

- El webhook de MP incluye `x-signature` (**Secret Signature**) que debes validar con `MP_WEBHOOK_SECRET`.  
- La verificación consiste en calcular un HMAC‐SHA256 (según manifiesto indicado por MP) y comparar con la firma recibida. Usa comparación en tiempo constante.
- Referencias oficiales de **Secret Signature** y **Webhooks**. :contentReference[oaicite:7]{index=7}

## Pruebas (sandbox)

1. Cargar `MP_PUBLIC_KEY`/`MP_ACCESS_TOKEN` **sandbox**.
2. Levantar `next dev` y exponer `/api/webhooks/mercadopago` con **ngrok** (HTTPS).
3. Registrar la URL pública en el panel de **Mercado Pago → Webhooks**.
4. Usar el **simulador de Webhooks** de MP o realizar un pago de prueba con Yape (sandbox) y verificar:
   - Orden creada `status='paid'`.
   - Stock decrementado.
   - Reintento del mismo evento → 200 y **sin** duplicados.

## Modo desarrollo: `MP_MOCK` (para continuar sin credenciales MP)

Mientras esperas la aprobación de tu registro en Mercado Pago puedes seguir implementando y probando localmente usando el modo de desarrollo `MP_MOCK`. Este repositorio incluye soporte para ello en los endpoints nuevos y un script de prueba.

- Cómo activarlo:
   - En tu `.env.local` añade: `MP_MOCK=1` (no subir al repo).
   - Opcionalmente deja `MP_WEBHOOK_SECRET` vacío en desarrollo.

- Qué hace el modo `MP_MOCK`:
   - El endpoint `POST /api/mercadopago/payments` devuelve un pago simulado (`paymentId: 'MOCK_<ts>'`) en lugar de llamar a la SDK de MP.
   - El endpoint `POST /api/webhooks/mercadopago` acepta eventos cuyo `data.id` empiece por `MOCK_`, procesa la lista `data.metadata.items` y ejecuta la transacción MongoDB (decremento de stock + creación de orden) sin requerir la SDK ni validar la firma cuando `MP_MOCK=1`.
   - Si `MP_MOCK` no está activo, el comportamiento vuelve a la verificación y la consulta reales contra Mercado Pago.

- Script de prueba local incluido:
   - Archivo: `scripts/test-mp-webhook.ts` — crea/actualiza un producto de prueba en la base de datos y envía un webhook simulado `{ data: { id: 'MOCK_<ts>', metadata: { items: [...] } } }` a `http://localhost:3000/api/webhooks/mercadopago`.
   - Ejecuta (PowerShell):
      ```powershell
      npm run test:mp-webhook
      ```
   - El script firma la petición con HMAC-SHA256 usando la cadena `requestId + timestamp + body`. En modo mock la firma se omite en la verificación del servidor.

- Nota de seguridad y transición a sandbox/producción:
   - `MP_MOCK` es solo para desarrollo local. En sandbox/producción debes configurar `MP_WEBHOOK_SECRET` con el Secret Signature que te provee Mercado Pago y asegurarte de que la verificación de `x-signature` siga la especificación oficial de MP.
   - Cuando recibas las credenciales reales, elimina `MP_MOCK=1`, añade `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` y `MP_WEBHOOK_SECRET` en `.env.local` y prueba el flujo E2E contra el sandbox de MP (o registrando la URL pública con ngrok en el panel de MP).

## Notas adicionales

- Deprecación del endpoint antiguo `src/app/api/webhooks/yape/route.ts`:
   - Ese endpoint queda marcado como DEPRECATED. La integración actualizada usa Mercado Pago (`/api/webhooks/mercadopago`) y la verificación `x-signature` de MP. El archivo antiguo se mantiene solo como referencia y para compatibilidad temporal.

- Firma del webhook (recordatorio):
   - En este repo el script de prueba local firma usando `HMAC-SHA256(secret, requestId + timestamp + body)` y el servidor compara la firma en tiempo constante.
   - Asegúrate de revisar la documentación oficial de Mercado Pago sobre Secret Signature y usar exactamente la cadena y el algoritmo que indican.

Si quieres que automatice también la documentación en `README.md` o añada un pequeño checklist para QA E2E (ngrok → registrar webhook → pago sandbox → verificar DB), lo hago a continuación.
