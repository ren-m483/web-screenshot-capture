import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/nav-bar";

export const metadata: Metadata = {
  title: "App Store Market Research AI",
  description: "取得可能な公開情報に基づくApp Store市場調査・アプリ企画支援ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/10 px-4 py-3 text-xs text-center opacity-60">
          本ツールは取得可能な公開情報に基づく分析を提供します。売上・ダウンロード数の推定や、成功・収益を保証するものではありません。
        </footer>
      </body>
    </html>
  );
}
