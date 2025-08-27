import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const MONGODB_URI = process.env.MONGODB_URI ?? "";
if (!MONGODB_URI) {
  console.error("❌ Falta MONGODB_URI en .env.local. No se puede limpiar.");
  process.exit(1);
}

const ProductSchema = new mongoose.Schema({ slug: String }, { collection: "products" });
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

async function main() {
  console.log("🔗 Conectando a Mongo para limpieza…");
  await mongoose.connect(MONGODB_URI);
  const res = await Product.deleteMany({ slug: { $regex: "^concurrency-test-" } });
  console.log(`🗑 Eliminados: ${res.deletedCount} productos con prefijo concurrency-test-`);
  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error limpiando productos de prueba:", err);
    process.exit(1);
  });
