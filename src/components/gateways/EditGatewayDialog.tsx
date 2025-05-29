'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from 'lucide-react';
import { useUpdateGateway } from '@/hooks';
import { UpdateGatewayInput, GatewayResponse } from '@/app/api/gateways/schemas';
import { z } from 'zod';

// Form schema for client-side validation
const editGatewayFormSchema = z.object({
  name: z.string().min(1, 'Gateway name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  url: z.string().url('A valid URL is required').max(255, 'URL cannot exceed 255 characters'),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username cannot exceed 100 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password cannot exceed 100 characters'),
  serialNumber: z
    .string()
    .min(1, 'Serial number is required')
    .max(50, 'Serial number cannot exceed 50 characters'),
});

type EditGatewayFormData = z.infer<typeof editGatewayFormSchema>;

interface EditGatewayDialogProps {
  gateway: GatewayResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGatewayDialog({ gateway, open, onOpenChange }: EditGatewayDialogProps) {
  const [formData, setFormData] = useState<EditGatewayFormData>({
    name: '',
    description: '',
    url: '',
    username: '',
    password: '',
    serialNumber: '',
  });
  const [errors, setErrors] = useState<Partial<EditGatewayFormData>>({});

  const { updateGateway, isLoading: isUpdating } = useUpdateGateway();

  // Update form data when gateway data is loaded
  useEffect(() => {
    if (gateway && open) {
      setFormData({
        name: gateway.name,
        description: gateway.description || '',
        url: gateway.url,
        username: gateway.username,
        password: gateway.password,
        serialNumber: gateway.serialNumber,
      });
      setErrors({});
    }
  }, [gateway, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        url: '',
        username: '',
        password: '',
        serialNumber: '',
      });
      setErrors({});
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof EditGatewayFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    try {
      editGatewayFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors: Partial<EditGatewayFormData> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            const field = err.path[0] as keyof EditGatewayFormData;
            formErrors[field] = err.message;
          }
        });
        setErrors(formErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gateway) return;

    if (!validateForm()) {
      return;
    }

    try {
      // Create update payload - only include fields that have changed
      const updatePayload: UpdateGatewayInput = {};

      if (formData.name !== gateway?.name) {
        updatePayload.name = formData.name;
      }
      if (formData.description !== (gateway?.description || '')) {
        updatePayload.description = formData.description;
      }
      if (formData.url !== gateway?.url) {
        updatePayload.url = formData.url;
      }
      if (formData.username !== gateway?.username) {
        updatePayload.username = formData.username;
      }
      if (formData.password !== gateway?.password) {
        updatePayload.password = formData.password;
      }
      if (formData.serialNumber !== gateway?.serialNumber) {
        updatePayload.serialNumber = formData.serialNumber;
      }

      // Only update if there are changes
      if (Object.keys(updatePayload).length === 0) {
        onOpenChange(false);
        return;
      }

      await updateGateway({ id: gateway._id, data: updatePayload });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to update gateway:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Gateway</DialogTitle>
        </DialogHeader>

        {!gateway ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">No gateway selected</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter gateway name"
                value={formData.name}
                onChange={handleChange}
                disabled={isUpdating}
                className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter gateway description (optional)"
                value={formData.description}
                onChange={handleChange}
                disabled={isUpdating}
                className={
                  errors.description ? 'border-destructive focus-visible:ring-destructive' : ''
                }
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            {/* URL Field */}
            <div className="space-y-2">
              <Label htmlFor="url">
                Gateway URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://gateway.example.com"
                value={formData.url}
                onChange={handleChange}
                disabled={isUpdating}
                className={errors.url ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                disabled={isUpdating}
                className={
                  errors.username ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                disabled={isUpdating}
                className={
                  errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {/* Serial Number Field */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">
                Serial Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                type="text"
                placeholder="Enter serial number"
                value={formData.serialNumber}
                onChange={handleChange}
                disabled={isUpdating}
                className={
                  errors.serialNumber ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {errors.serialNumber && (
                <p className="text-sm text-destructive">{errors.serialNumber}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Update Gateway
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
