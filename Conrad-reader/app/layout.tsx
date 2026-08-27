import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  JetBrains_Mono,
  Space_Mono,
  Geist_Mono,
} from "next/font/google";
import { SettingsProvider } from "./providers";
import { AppShell } from "@/components/shell/AppShell";
import { PwaRegister } from "@/components/shell/PwaRegister";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Reader",
  description: "A brutalist novel reader",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reader",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4e4e4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${geistMono.variable} ${ibmPlexMono.variable} ${spaceMono.variable} h-full`}
      data-theme="paper"
      suppressHydrationWarning
    >
      <body>
        <SettingsProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
