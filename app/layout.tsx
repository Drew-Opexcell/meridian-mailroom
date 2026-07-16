import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meridian Mailroom",
  description:
    "A demo of an AI mail-triage pipeline for a disability law firm: classify, extract, fuzzy-match, and route incoming mail, with a human-review gate for high-stakes letters. Synthetic data.",
  openGraph: {
    title: "Meridian Mailroom",
    description:
      "AI mail-triage pipeline demo: classify, extract, match, route, with a human gate for high-stakes mail. Synthetic data, live pipeline.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
