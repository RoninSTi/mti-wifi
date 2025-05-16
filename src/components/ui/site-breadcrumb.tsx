'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface SiteBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function SiteBreadcrumb({ items, className }: SiteBreadcrumbProps) {
  return (
    <Breadcrumb className={className}>
      {items.map((item, index) => (
        <BreadcrumbItem key={index}>
          {item.href && !item.isCurrentPage ? (
            <BreadcrumbLink asChild>
              <Link href={item.href}>{item.label}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbLink className={item.isCurrentPage ? 'font-semibold' : ''}>
              {item.label}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}
