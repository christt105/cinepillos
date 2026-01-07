import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for premium feel
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClubDeCine",
  description: "Exclusive Cinema Club for Friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="container" style={{ padding: '2rem 1rem' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
