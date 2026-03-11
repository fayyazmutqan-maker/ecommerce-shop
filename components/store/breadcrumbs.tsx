import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Dynamic breadcrumb navigation component.
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { label: "My Account", href: "/account" },
 *     { label: "Profile" },
 *   ]} />
 *
 * "Home" is always prepended automatically.
 * The last item (or any item without `href`) renders as plain text.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm text-muted-foreground mb-8 overflow-x-auto ${className ?? ""}`}
    >
      <Link
        href="/"
        className="hover:text-foreground transition-colors"
      >
        Home
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label + index} className="flex items-center gap-2">
            <span className="text-muted-foreground/40">/</span>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium line-clamp-1">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
