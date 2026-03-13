"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { navItems } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050b1bcc]/90 backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          NeuralForge
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10",
                pathname === item.href && "bg-white/15 text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:block">
          <Button asChild size="sm">
            <Link href="/book">Book a Call</Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" className="md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
      </nav>
    </header>
  );
}
