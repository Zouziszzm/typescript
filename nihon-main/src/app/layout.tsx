import type { Metadata } from "next";
import { Geist, Geist_Mono, DotGothic16 } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelFont = DotGothic16({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nihon",
  description: "Japanese Learning App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} h-full antialiased rounded-none`}
    >
      <body className="min-h-full flex flex-col bg-[#faf8f5] text-[#2c2a29] pb-20 rounded-none">
        {/* Floating persistent search: center on mobile, top-right on desktop */}
        <div className="w-full sm:w-auto sm:fixed sm:top-6 sm:right-6 z-50 select-none p-4 sm:p-0 flex justify-center">
          <SearchBar />
        </div>
        <main className="flex-1 w-full rounded-none px-4 sm:px-6">
          {children}
        </main>
        <Navbar />
      </body>
    </html>
  );
}
