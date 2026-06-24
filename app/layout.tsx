import type { Metadata } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// Self-host both fonts so production builds never depend on Google Fonts.
const display = localFont({
  src: "./fonts/Fraunces-Variable.ttf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-fraunces",
});

const body = localFont({
  src: "./fonts/EBGaramond-Variable.ttf",
  weight: "400 800",
  style: "normal",
  display: "swap",
  variable: "--font-garamond",
});

export const metadata: Metadata = {
  title: "Rabbits into the Hole",
  description: "Live festivalkaart voor Down the Rabbit Hole 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
