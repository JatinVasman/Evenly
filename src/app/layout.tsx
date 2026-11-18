import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { MobileShell } from "@/components/navigation/MobileShell";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { APP_CONFIG } from "@/config/app";
import { UserProvider } from "@/context/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Expense Sharing`,
  description: APP_CONFIG.description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_CONFIG.name,
  },
};

export const viewport: Viewport = {
  themeColor: APP_CONFIG.theme.primaryColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} antialiased selection:bg-emerald-100 selection:text-emerald-900`}
      >
        <UserProvider>
          <PwaRegister />
          <MobileShell>
            <div className="flex-1 overflow-y-auto overscroll-y-contain no-scrollbar relative flex flex-col min-h-0">
              {children}
            </div>
            <BottomNav />
          </MobileShell>
        </UserProvider>
      </body>
    </html>
  );
}
