'use client';

import * as React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode;
  }
>(({ className, separator, children, ...props }, ref) => {
  const childCount = React.Children.count(children);
  const slottedSeparator = separator || <ChevronRight className="h-4 w-4" />;

  return (
    <nav
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground',
        className
      )}
      aria-label="Breadcrumb"
      {...props}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) {
            return child;
          }

          return React.cloneElement(child, {
            ...child.props,
            separator: slottedSeparator,
            isLastItem: index === childCount - 1,
          });
        })}
      </ol>
    </nav>
  );
});
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'> & {
    separator?: React.ReactNode;
    isLastItem?: boolean;
  }
>(({ className, separator, isLastItem, children, ...props }, ref) => {
  return (
    <li ref={ref} className={cn('inline-flex items-center gap-1.5', className)} {...props}>
      {children}
      {!isLastItem && separator && <span className="text-muted-foreground/40">{separator}</span>}
    </li>
  );
});
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean;
  }
>(({ className, asChild = false, ...props }, ref) => {
  if (asChild) {
    return (
      <Slot
        ref={ref}
        className={cn('hover:text-foreground transition-colors', className)}
        {...props}
      />
    );
  }

  return (
    <a ref={ref} className={cn('hover:text-foreground transition-colors', className)} {...props} />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'span'>) => {
  return (
    <span className={cn('text-muted-foreground/40', className)} {...props}>
      {children || <ChevronRight className="h-4 w-4" />}
    </span>
  );
};
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) => {
  return (
    <span className={cn('flex h-4 w-4 items-center justify-center', className)} {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
};
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbEllipsis };
