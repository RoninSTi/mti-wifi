'use client';

import React from 'react';
import { Button } from './button';
import { Trash, Loader2 } from 'lucide-react';

interface DeleteButtonProps {
  onDelete: () => Promise<void> | void;
  resourceName: string;
  isDeleting?: boolean;
  className?: string;
  variant?: 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: () => void; // For custom click handler
}

export function DeleteButton({
  onDelete,
  resourceName,
  isDeleting = false,
  className,
  variant = 'destructive',
  size = 'default',
  onClick,
}: DeleteButtonProps) {
  const title = `Delete ${resourceName}`;

  const handleDeleteClick = () => {
    if (onClick) {
      // Use custom click handler if provided (like opening a custom dialog)
      onClick();
    } else {
      // Direct delete action
      onDelete();
    }
  };

  // Content for button
  const buttonContent = (
    <>
      {isDeleting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash className="mr-2 h-4 w-4" />
      )}
      {title}
    </>
  );

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDeleteClick}
      disabled={isDeleting}
    >
      {buttonContent}
    </Button>
  );
}
