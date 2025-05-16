'use client';

import React from 'react';
import { Button, buttonVariants } from './button';
import { Trash, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeleteButtonProps {
  onDelete: () => Promise<void> | void;
  resourceName: string;
  isDeleting?: boolean;
  className?: string;
  variant?: 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  confirmWithDialog?: boolean;
  asChild?: boolean;
  onClick?: () => void; // For custom click handler
}

export function DeleteButton({
  onDelete,
  resourceName,
  isDeleting = false,
  className,
  variant = 'destructive',
  size = 'default',
  confirmWithDialog = true,
  asChild = false,
  onClick,
}: DeleteButtonProps) {
  const title = `Delete ${resourceName}`;
  const description = `This action cannot be undone. This will permanently delete the ${resourceName}.`;

  const handleDeleteClick = async () => {
    if (onClick) {
      // Use custom click handler if provided (like opening a custom dialog)
      onClick();
    } else if (!confirmWithDialog) {
      // Use window.confirm for simpler cases
      if (window.confirm(`Are you sure you want to delete this ${resourceName}?`)) {
        await onDelete();
      }
    }
  };

  if (confirmWithDialog) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild={asChild}>
          <Button
            variant={variant}
            size={size}
            className={className}
            onClick={!asChild ? handleDeleteClick : undefined}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash className="mr-2 h-4 w-4" />
            )}
            {title}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Simple button with window.confirm (for dropdown menus)
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDeleteClick}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash className="mr-2 h-4 w-4" />
      )}
      {title}
    </Button>
  );
}
