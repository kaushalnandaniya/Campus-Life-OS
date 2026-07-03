import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
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
  metadataBase: new URL('https://www.campuslifeos.site'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: "Campus Life OS — Student Intelligence Copilot",
    template: "%s | Campus Life OS"
  },
  description:
    "AI-powered student digital twin that manages your academic life. Aggregates university updates, predicts workload, prevents burnout.",
  keywords: [
    "student",
    "AI",
    "campus",
    "productivity",
    "burnout",
    "digital twin",
  ],
  authors: [{ name: "Campus Life OS Team" }],
  creator: "Campus Life OS",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.campuslifeos.site",
    title: "Campus Life OS — Student Intelligence Copilot",
    description: "AI-powered student digital twin that manages your academic life. Aggregates university updates, predicts workload, prevents burnout.",
    siteName: "Campus Life OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus Life OS — Student Intelligence Copilot",
    description: "AI-powered student digital twin that manages your academic life. Aggregates university updates, predicts workload, prevents burnout.",
  },
  verification: {
    google: "GqsxP50Lzl7Sp7Gw1qO1vjiB2gahTSuG8oK9lqSG6TE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
