'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader, Wifi } from 'lucide-react';
import { useCreateGateway } from '@/hooks';
import { toast } from 'sonner';
import { CreateGatewayInput } from '@/app/api/gateways/schemas';

interface CreateGatewayDialogProps {
  locationId: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function CreateGatewayDialog({
  locationId,
  trigger,
  defaultOpen = false,
}: CreateGatewayDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [formData, setFormData] = useState<Omit<CreateGatewayInput, 'location'>>({
    name: '',
    description: '',
    url: '',
    username: '',
    password: '',
    serialNumber: '',
    status: 'disconnected',
  });

  const { createGateway, isLoading } = useCreateGateway();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createGateway({
        ...formData,
        location: locationId,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to create gateway');
        return;
      }

      // Toast is already shown in the hook
      setFormData({
        name: '',
        description: '',
        url: '',
        username: '',
        password: '',
        serialNumber: '',
        status: 'disconnected',
      });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create gateway');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Gateway
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Gateway</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name*</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter gateway name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter gateway description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number*</Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              placeholder="Enter serial number"
              value={formData.serialNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL*</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://gateway.example.com"
              value={formData.url}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username*</Label>
              <Input
                id="username"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password*</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Create Gateway
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
