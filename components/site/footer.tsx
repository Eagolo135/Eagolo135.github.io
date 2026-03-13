import Link from "next/link";

import { site } from "@/lib/site-data";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 py-8">
      <div className="container flex flex-col items-start justify-between gap-4 text-sm text-slate-300 md:flex-row md:items-center">
        <p>{site.title}</p>
        <div className="flex gap-4">
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
          <Link href="/projects" className="hover:text-white">
            Projects
          </Link>
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
        </div>
      </div>
    </footer>
  );
}
