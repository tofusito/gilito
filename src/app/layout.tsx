import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Gilito",
  description: "Tu colección de monedas euro",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Gilito" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fafaf8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full flex flex-col bg-[#fafaf8] text-[#1a1a1a] antialiased">
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
