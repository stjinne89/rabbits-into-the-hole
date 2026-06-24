import type { Metadata } from "next";
import { Fraunces, EB_Garamond } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// Fraunces = free stand-in for DTRH's "Ogg" display serif; EB Garamond for body.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const body = EB_Garamond({
  subsets: ["latin"],
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
