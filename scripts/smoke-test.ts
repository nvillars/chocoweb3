import mongoose, { Schema, Types } from "mongoose";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI ?? "";
if (!MONGODB_URI) {
  console.error("❌ Falta MONGODB_URI en tu entorno (.env / .env.local).");
  process.exit(1);
}

// --- Modelos mínimos locales para la prueba (colecciones existentes) ---
const ProductSchema = new Schema(
  {
    slug: { type: String, unique: false },
    name: String,
    description: String,
    stock: Number,
    price: Number, // en unidades (el backend hará snapshot en centavos)
    published: Boolean,
    deletedAt: { type: Date, default: null },
    image: String,
    tags: [String],
  },
  { collection: "products", timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);
const OrderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, required: false },
    items: [
      {
        productId: Types.ObjectId,
        qty: Number,
  unitPrice: Number,
  lineTotal: Number,
        name: String,
      },
    ],
    status: { type: String, default: "pending" },
    payment: { type: Object, default: {} },
    amounts: { type: Object, default: {} },
  },
  { collection: "orders", timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

// --- Helpers HTTP ---
async function postJSON(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  return { status: res.status, ok: res.ok, json };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🔗 Conectando a Mongo…");
  await mongoose.connect(MONGODB_URI);

  // 1) Crear producto de prueba con stock=1
  const slug = `concurrency-test-${Date.now()}`;
  console.log("🧪 Creando producto de prueba con stock=1 …");
  const testProduct = await Product.create({
    slug,
    name: "Barra de Chocolate Concurrency Test",
    description: "Producto temporal para probar concurrencia de checkout",
    stock: 1,
    price: 3.98,
    published: true,
    image: "/uploads/concurrency-test.jpg",
    tags: ["test"],
  });

  const productId = String(testProduct._id);
  console.log("✅ Producto creado:", { productId, name: testProduct.name, stock: testProduct.stock });

  // 2) Probar IDEMPOTENCIA: misma Idempotency-Key dos veces => misma orden
  console.log("\n🔁 Probando idempotencia (misma clave) …");
  const idemKey = `idem-${crypto.randomUUID()}`;
  const payload = {
    items: [{ productId, qty: 1 }],
    paymentMethod: "cod",
  };

  const r1 = await postJSON(`${BASE_URL}/api/orders`, payload, { "Idempotency-Key": idemKey });
  const r2 = await postJSON(`${BASE_URL}/api/orders`, payload, { "Idempotency-Key": idemKey });

  console.table([
    { intento: "idempotencia#1", status: r1.status, body: JSON.stringify(r1.json) },
    { intento: "idempotencia#2", status: r2.status, body: JSON.stringify(r2.json) },
  ]);

  if (!(r1.ok && r2.ok && r1.json?.order?._id === r2.json?.order?._id)) {
    console.warn("⚠️ Idempotencia NO verificada (esto es esperado si aún no implementas la lógica).");
  } else {
    console.log("✅ Idempotencia verificada: ambas respuestas retornaron la misma orden:", r1.json.order._id);
  }

  // Cancelar y reponer (si el endpoint existe) para volver a stock=1 antes de la prueba de carrera
  if (r1.json?.order?._id) {
    await postJSON(`${BASE_URL}/api/orders/${r1.json.order._id}/cancel`, {});
  }

  // Asegurar que el producto vuelve a stock=1 por si el endpoint aún no existe
  await Product.updateOne({ _id: testProduct._id }, { $set: { stock: 1 } });

  // 3) Probar CONCURRENCIA: dos compras en paralelo del MISMO producto con stock=1
  console.log("\n⚔️  Probando condición de carrera (dos compras simultáneas) …");
  const keyA = `race-${crypto.randomUUID()}`;
  const keyB = `race-${crypto.randomUUID()}`;

  const [pa, pb] = await Promise.allSettled([
    postJSON(`${BASE_URL}/api/orders`, payload, { "Idempotency-Key": keyA }),
    postJSON(`${BASE_URL}/api/orders`, payload, { "Idempotency-Key": keyB }),
  ]);

  const A = pa.status === "fulfilled" ? pa.value : { status: 0, ok: false, json: { error: String(pa.reason) } };
  const B = pb.status === "fulfilled" ? pb.value : { status: 0, ok: false, json: { error: String(pb.reason) } };

  console.table([
    { request: "A", status: A.status, ok: A.ok, body: JSON.stringify(A.json) },
    { request: "B", status: B.status, ok: B.ok, body: JSON.stringify(B.json) },
  ]);

  // 4) Evaluación
  const successes = [A, B].filter((r) => r.ok && r.status === 201);
  const conflicts = [A, B].filter((r) => r.status === 409 && r.json?.error === "OUT_OF_STOCK");

  if (successes.length === 1 && conflicts.length === 1) {
    console.log("🎉 Resultado esperado: 1 compra exitosa y 1 conflicto OUT_OF_STOCK.");
  } else {
    console.warn("⚠️ Resultado NO esperado. Revisa la lógica de transacción/atomicidad en createOrder().");
  }

  // 5) Limpieza: cancelar orden exitosa (si existe endpoint) y borrar el producto de prueba
  try {
    const winning = successes[0]?.json?.order?._id;
    if (winning) {
      await postJSON(`${BASE_URL}/api/orders/${winning}/cancel`, {});
    }
  } catch {
    /* best effort */
  }

  await sleep(300);
  await Product.deleteOne({ _id: testProduct._id });
  // También puedes limpiar órdenes de este producto (opcional):
  await Order.deleteMany({ "items.productId": testProduct._id, status: { $in: ["pending", "failed", "cancelled"] } });

  console.log("\n🧹 Limpieza realizada. Prueba de concurrencia finalizada.");
}

main()
  .then(() => {
    console.log("✅ smoke-test completado.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error en smoke-test:", err);
    process.exit(1);
  });
