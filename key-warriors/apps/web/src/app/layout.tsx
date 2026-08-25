import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keyboard Warriors",
  description:
    "Collaborative turn-based typing — 2–3 players, one paragraph, shared score.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnimatedBackground />
        <Providers>
          <Nav />
          <main className="relative mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
