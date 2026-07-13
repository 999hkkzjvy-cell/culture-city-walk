import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="zh-CN" className="h-full">
      <body>{children}</body>
    </html>
  );
}
