'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EntityMetaItemProps {
  label: string;
  value: React.ReactNode;
}

function EntityMetaItem({ label, value }: EntityMetaItemProps) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || 'Not specified'}</span>
    </div>
  );
}

interface EntityMetaProps {
  items: EntityMetaItemProps[];
  className?: string;
}

export function EntityMeta({ items, className }: EntityMetaProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-card',
        className
      )}
    >
      {items.map((item, index) => (
        <EntityMetaItem key={index} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function EntityDescription({ children }: { children: React.ReactNode }) {
  if (!children) return null;

  return (
    <div className="rounded-lg border p-4 bg-card mt-6">
      <h3 className="text-sm font-medium mb-2">Description</h3>
      <p className="text-sm text-card-foreground">{children}</p>
    </div>
  );
}
