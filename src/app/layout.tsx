import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for premium feel
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CinePillos",
  description: "A private film club for friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="container main-content">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
