import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc",
});

const notoSerif = Noto_Serif_SC({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  title: "Cultural Citywalk",
  description: "一个以城市文化、主题滤镜和路线时间轴为核心的私人漫游助手。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${notoSans.variable} ${notoSerif.variable} h-full`}>
      <body>{children}</body>
    </html>
  );
}
