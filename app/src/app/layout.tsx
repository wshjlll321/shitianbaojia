import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "世天航空 · 数字化报价系统",
  description: "ShyTian Aviation Digital Quotation System - Professional drone quotation management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
