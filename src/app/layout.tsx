import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SuiProvider from "@/providers/SuiProvider";
import ZkLoginProvider from "@/providers/ZkLoginProvider";
import AuthProvider from "@/providers/AuthProvider";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Veredic - Prediction Markets",
  description: "Trade on the outcome of future events",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SuiProvider>
          <ZkLoginProvider>
            <AuthProvider>
              <Header />
              {children}
              <MobileNav />
            </AuthProvider>
          </ZkLoginProvider>
        </SuiProvider>
      </body>
    </html>
  );
}
