import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://film.bluesia.net"),
  title: "film.bluesia.net",
  description: "Góc nhỏ của người mê phim",
  applicationName: "film.bluesia.net",
  openGraph: {
    title: "film.bluesia.net",
    description: "Góc nhỏ của người mê phim",
    siteName: "film.bluesia.net",
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "film.bluesia.net"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "film.bluesia.net",
    description: "Góc nhỏ của người mê phim",
    images: ["/icon-512.png"]
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"]
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07090f"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <main className="mx-auto min-h-screen w-full max-w-[720px] safe-bottom">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}

