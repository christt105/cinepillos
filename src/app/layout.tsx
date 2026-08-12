import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for premium feel
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { siteUrl, socialMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/i18n/request";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  const locale = await resolveLocale();

  return {
    metadataBase: siteUrl(),
    ...socialMetadata({ title: t("appName"), description: t("tagline"), locale }),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider>
          <Providers>
            <Navbar />
            <main className="container main-content">
              {children}
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
