import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "羅密歐與茱麗葉組隊任務工具",
  description: "RJPQ Tool 羅密歐與茱麗葉組隊任務工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="black"
      lang="zh-Hant"
    >
      <body className="flex min-h-full flex-col bg-base-200/20">
        {children}
      </body>
    </html>
  );
}
