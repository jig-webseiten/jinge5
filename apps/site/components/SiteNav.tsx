"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav({
  logoSrc,
  siteTitle,
  categories,
}: {
  logoSrc: string;
  siteTitle: string;
  categories: Array<{ id: string; slug: string; title: string }>;
}) {
  const pathname = usePathname() || "/";

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/")) || pathname === href;

  return (
    <header role="banner" aria-label="Seitenkopf" style={{ backgroundColor: "var(--brand-primary)" }}>
      <nav role="navigation" aria-label="Hauptnavigation" className="site-nav">
        <Link href="/" className={`brand ${isActive("/") ? "active" : ""}`}>
          <img src={logoSrc} alt={`${siteTitle} Logo`} width={50} height={50} />
          <span>{siteTitle}</span>
        </Link>

        {categories.map((cat) => {
          const href = `/${cat.slug}`;
          return (
            <Link key={cat.id} href={href} className={isActive(href) ? "active" : ""}>
              {cat.title}
            </Link>
          );
        })}

        <Link href="/about-authors" className={isActive("/about-authors") ? "active" : ""}>
          Autoren
        </Link>
      </nav>
    </header>
  );
}
