import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { QueryProvider } from "@/components/providers/query-provider";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CommodiTrade - Commodity Trading Platform",
  description:
    "Professional commodity trading and inventory management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <QueryProvider>
          <div className="flex min-h-screen bg-muted">
            <aside className="hidden border-r border-slate-800 bg-slate-900 lg:flex">
              <Sidebar />
            </aside>
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                {children}
              </main>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
