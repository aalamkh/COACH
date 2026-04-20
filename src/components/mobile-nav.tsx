"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions";
import { cn } from "@/lib/utils";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/ai-track", label: "AI Track" },
  { href: "/notes", label: "Notes" },
  { href: "/retros", label: "Retros" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute right-0 top-0 flex h-dvh w-[min(88vw,320px)] flex-col border-l border-border bg-card p-5 shadow-xl"
            role="dialog"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-base font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <form action={logout} className="mt-4 border-t border-border pt-4">
              <Button type="submit" variant="outline" className="w-full">
                Log out
              </Button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
