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
import { Plus, Loader2 } from 'lucide-react';
import { useCreateArea } from '@/hooks';
import { toast } from 'sonner';
import { CreateAreaInput } from '@/app/api/areas/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateAreaDialogProps {
  locationId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  defaultOpen?: boolean;
}

export function CreateAreaDialog({
  locationId,
  trigger,
  onSuccess,
  defaultOpen = false,
}: CreateAreaDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [formData, setFormData] = useState<Omit<CreateAreaInput, 'location'>>({
    name: '',
    description: '',
    floorLevel: undefined,
    buildingSection: '',
    areaType: 'other',
  });

  const { createArea, isLoading } = useCreateArea();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'floorLevel' ? (value ? parseInt(value, 10) : undefined) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createArea({
        ...formData,
        location: locationId,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to create area');
        return;
      }

      toast.success('Area created successfully');
      setFormData({
        name: '',
        description: '',
        floorLevel: undefined,
        buildingSection: '',
        areaType: 'other',
      });
      setOpen(false);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create area');
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
            Add Area
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Area</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name*</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter area name"
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
              placeholder="Enter area description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="floorLevel">Floor Level</Label>
              <Input
                id="floorLevel"
                name="floorLevel"
                type="number"
                placeholder="Floor number"
                value={formData.floorLevel || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="areaType">Area Type</Label>
              <Select
                value={formData.areaType || 'other'}
                onValueChange={value => handleSelectChange('areaType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buildingSection">Building Section</Label>
            <Input
              id="buildingSection"
              name="buildingSection"
              placeholder="Building section or wing"
              value={formData.buildingSection || ''}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Area
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
