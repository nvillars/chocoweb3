import type { Metadata } from "next";
import "./globals.css";
import { Inter, Playfair_Display } from 'next/font/google';

// next/font must be called at module scope
const inter = Inter({ subsets: ['latin'], weight: ['300','400','600','700','800'], display: 'swap', variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400','600','700','800'], display: 'swap', variable: '--font-playfair' });
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import { SSEProvider } from "../context/SSEStatusContext";
import ToastContainer from "../components/ToastContainer";
import Header from '../components/Header';
import Footer from '../components/Footer';


export const metadata: Metadata = {
  title: "La Dulcerina - Tienda de Chocolates",
  description: "La mejor tienda virtual de chocolates de cacao",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  title: "La Dulcerina"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: "no",
  themeColor: "#7B3F00"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="preload" as="image" href="/assets/hero-poster.jpg" />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <SSEProvider>
              <ToastProvider>
                <Header />
                <div className="site-header-spacer" aria-hidden />
                {children}
                <ToastContainer />
                <Footer />
              </ToastProvider>
            </SSEProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
