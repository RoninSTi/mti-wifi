import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface SiteBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function SiteBreadcrumb({ items, className = '' }: SiteBreadcrumbProps) {
  return (
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1.5">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" aria-hidden="true" />
            )}
            {index === items.length - 1 ? (
              <span className="font-medium text-foreground">{item.title}</span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
