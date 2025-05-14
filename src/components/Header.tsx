'use client';

import Link from 'next/link';
import UserMenu from './auth/UserMenu';
import { cn } from '@/lib/utils';
import { ModeToggle } from './ui/mode-toggle';

export default function Header() {
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/telemetry-dashboard', label: 'Telemetry' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center">
        {/* Desktop logo and navigation */}
        <div className="flex-1 hidden md:flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="text-lg font-bold">Next.js Starter</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  item.href === '/' ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile logo - shown only on small screens */}
        <div className="flex-1 md:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">Next.js</span>
          </Link>
        </div>

        <div className="flex items-center justify-end ml-auto space-x-4">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
