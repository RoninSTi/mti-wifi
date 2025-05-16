'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateOrganization } from '@/hooks';
import { UpdateOrganizationInput, OrganizationResponse } from '@/app/api/organizations/schemas';

interface EditOrganizationDialogProps {
  organization: OrganizationResponse;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditOrganizationDialog({
  organization,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: EditOrganizationDialogProps) {
  // For internal state when not controlled externally
  const [internalOpen, setInternalOpen] = useState(false);

  // Use either controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [isControlled, onOpenChange]
  );

  // Get the update organization mutation hook
  const {
    updateOrg,
    isLoading: isSubmitting,
    isSuccess,
    isError,
    error,
    reset: resetMutation,
    validationSchema,
  } = useUpdateOrganization();

  // Initialize form using the schema from the hook
  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: organization.name,
      description: organization.description || '',
      contactName: organization.contactName || '',
      contactEmail: organization.contactEmail || '',
      contactPhone: organization.contactPhone || '',
      address: organization.address || '',
    },
  });

  // Reset form when organization data changes
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        description: organization.description || '',
        contactName: organization.contactName || '',
        contactEmail: organization.contactEmail || '',
        contactPhone: organization.contactPhone || '',
        address: organization.address || '',
      });
    }
  }, [organization, form]);

  // Handle success or error states
  useEffect(() => {
    if (isSuccess) {
      toast.success('Organization updated successfully');
      setOpen(false);
      resetMutation();
      if (onSuccess) onSuccess();
    }

    if (isError && error instanceof Error) {
      toast.error(`Failed to update organization: ${error.message}`);
    }
  }, [isSuccess, isError, error, resetMutation, onSuccess, setOpen]);

  // Form submission handler
  async function onSubmit(values: UpdateOrganizationInput) {
    try {
      // Filter out empty fields to avoid sending unnecessary updates
      const updatedValues: UpdateOrganizationInput = Object.entries(values).reduce(
        (acc, [key, value]) => {
          if (value !== '' && value !== null && value !== undefined) {
            acc[key as keyof UpdateOrganizationInput] = value;
          }
          return acc;
        },
        {} as UpdateOrganizationInput
      );

      // Only update if there are changes
      if (Object.keys(updatedValues).length > 0) {
        await updateOrg(organization._id, updatedValues);
      } else {
        toast.info('No changes to update');
        setOpen(false);
      }
    } catch (err) {
      // The error will be handled by the useEffect above
      console.error('Error updating organization:', err);
    }
  }

  const defaultTrigger = (
    <Button>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update organization details. Modify the fields you wish to change.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                type="button"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Organization'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
