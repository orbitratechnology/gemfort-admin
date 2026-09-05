import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AdminHeader } from "@/components/admin-header";
import { AdminSidebar } from "@/components/admin-sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "GemFort Admin",
    template: "%s | GemFort Admin",
  },
  description: "Secure operations console for the GemFort platform.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", inter.variable)}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <div className="flex min-h-svh w-full">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader />
            <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
            <footer className="px-4 pb-6 text-center text-xs text-muted-foreground sm:px-8">GemFort Admin · Trust infrastructure for the GemFort network</footer>
          </div>
        </div>
      </body>
    </html>
  );
}
