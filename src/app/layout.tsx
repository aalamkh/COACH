import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { logout } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "coach",
  description: "Private, local-first 14-week build program.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/ai-track", label: "AI Track" },
  { href: "/notes", label: "Notes" },
  { href: "/retros", label: "Retros" },
  { href: "/settings", label: "Settings" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const authed = jar.get("coach_auth")?.value === "ok";

  return (
    <html lang="en">
      <body className="min-h-dvh bg-background font-sans antialiased">
        {authed ? (
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between gap-3">
              <Link href="/" className="shrink-0 font-semibold tracking-tight">
                coach
              </Link>
              <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
                {NAV_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="hover:text-foreground">
                    {l.label}
                  </Link>
                ))}
                <form action={logout}>
                  <Button type="submit" variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    Log out
                  </Button>
                </form>
              </nav>
              <MobileNav />
            </div>
          </header>
        ) : null}
        <main className="container py-6 md:py-8">{children}</main>
      </body>
    </html>
  );
}
