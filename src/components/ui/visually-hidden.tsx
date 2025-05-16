'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type VisuallyHiddenProps = React.HTMLAttributes<HTMLSpanElement>;

/**
 * VisuallyHidden component hides content visually while keeping it accessible to screen readers.
 * This is particularly useful for providing context to screen reader users without impacting visual design.
 */
const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'absolute h-px w-px p-0 overflow-hidden whitespace-nowrap border-0',
          'clip-rect-0',
          className
        )}
        style={{
          clip: 'rect(0 0 0 0)',
          clipPath: 'inset(50%)',
          margin: '-1px',
        }}
        {...props}
      />
    );
  }
);

VisuallyHidden.displayName = 'VisuallyHidden';

export { VisuallyHidden };
