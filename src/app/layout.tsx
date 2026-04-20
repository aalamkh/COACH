import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "coach",
  description: "Private, local-first 14-week build program.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              coach
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Today
              </Link>
              <Link href="/plan" className="hover:text-foreground">
                Plan
              </Link>
              <Link href="/ai-track" className="hover:text-foreground">
                AI Track
              </Link>
              <Link href="/notes" className="hover:text-foreground">
                Notes
              </Link>
              <Link href="/retros" className="hover:text-foreground">
                Retros
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
