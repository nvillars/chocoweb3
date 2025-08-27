
import ProductCatalog from "../components/ProductCatalog";
import FloatingCart from "../components/FloatingCart";
import HeroVideo from "../components/HeroVideo";
// HeaderAuth is provided globally via the persistent Header component in layout

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#FFF8F0] to-[#F9F2EC] font-sans text-gray-800">
  {/* Hero - render directly; responsive padding moved to HeroVideo styles to avoid double spacing on desktop */}
  <HeroVideo />

      {/* Featured section - larger spacing and softer card shadows */}
          {/* Catalog */}
          <main id="catalog" className="max-w-7xl mx-auto py-6 px-6" style={{ paddingTop: 24 }}>
            <ProductCatalog />
          </main>

          {/* Featured section - larger spacing and softer card shadows */}
          <section className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800">Featured</h2>
              <p className="text-gray-500 mt-2">Handpicked selections and artisan favorites.</p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-md text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#E6F4FF] flex items-center justify-center text-2xl">🔎</div>
                <h3 className="font-semibold mt-4 text-lg">Find Your Chocolate</h3>
                <p className="text-sm text-gray-500 mt-2">Browse our curated collection and filter by flavor, cacao percentage and origin.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#FFF7EA] flex items-center justify-center text-2xl">🍬</div>
                <h3 className="font-semibold mt-4 text-lg">Sell Your Treats</h3>
                <p className="text-sm text-gray-500 mt-2">List your artisanal chocolates and reach chocolate lovers across the country.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#E9F8F2] flex items-center justify-center text-2xl">🔒</div>
                <h3 className="font-semibold mt-4 text-lg">Safe & Secure</h3>
                <p className="text-sm text-gray-500 mt-2">All transactions are secure and verified by our trusted platform.</p>
              </div>
            </div>
          </section>

      <FloatingCart />

      <footer className="text-center text-gray-600 py-10 border-t mt-12">
  &copy; {new Date().getFullYear()} La Dulcerina. Todos los derechos reservados.
      </footer>
    </div>
  );
}
