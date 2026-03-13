import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "NeuralForge AI Journal",
  description: "Futuristic AI engineering, dark-mode product design, and production build logs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        <div className="fixed inset-0 -z-10 opacity-60 grid-atmosphere" />
        <div className="fixed -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="fixed -right-24 top-40 -z-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <Navbar />
        <main className="container py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
