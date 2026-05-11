import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MobileNav, Sidebar } from "@/components/app/sidebar";
import { ThemeScript } from "@/components/app/theme-script";
import { Topbar } from "@/components/app/topbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio Tracking",
  description: "Net worth, investments, banks, credit — at a glance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full">
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
          <Sidebar />
          <div className="flex min-w-0 flex-col">
            <MobileNav />
            <Topbar />
            <div className="w-full max-w-[1320px] px-4 pt-6 pb-15 md:px-7 md:pt-8">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
