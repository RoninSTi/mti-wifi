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
import { PlusCircle, Loader2 } from 'lucide-react';
import { useCreateSensor } from '@/hooks/useCreateSensor';
import { toast } from 'sonner';
import { CreateSensorInput } from '@/app/api/sensors/schemas';

interface CreateSensorDialogProps {
  equipmentId: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function CreateSensorDialog({
  equipmentId,
  trigger,
  defaultOpen = false,
}: CreateSensorDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [formData, setFormData] = useState<Omit<CreateSensorInput, 'equipment'>>({
    name: '',
    description: '',
    serial: null,
    partNumber: '',
    status: 'inactive',
    connected: false,
  });

  const { createSensor, isLoading } = useCreateSensor();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // For serial number field, handle empty values correctly
    if (name === 'serial') {
      // If empty or invalid, set to null
      const serialValue = value === '' ? null : parseInt(value, 10) || null;
      setFormData(prev => ({
        ...prev,
        [name]: serialValue,
      }));
      return;
    }

    // For all other fields
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Remove unused handlers

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate serial if provided and not null
    const { serial } = formData;
    if (serial !== null && serial !== undefined && serial <= 0) {
      toast.error('Serial number must be a positive number');
      return;
    }

    try {
      // Add default values for required fields in the database
      const result = await createSensor({
        ...formData,
        equipment: equipmentId,
        // Add defaults for required DB fields that shouldn't be user-editable
        status: 'inactive',
        connected: false,
      });

      if (result.error) {
        // Handle API errors but don't toast (the hook will handle general errors)
        console.error('API Error:', result.error);
        return;
      }

      // Success toast is shown by the hook
      setFormData({
        name: '',
        description: '',
        serial: null,
        partNumber: '',
        status: 'inactive',
        connected: false,
      });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create sensor');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sensor
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New Sensor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name*</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter sensor name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number (optional)</Label>
              <Input
                id="serial"
                name="serial"
                type="number"
                placeholder="Enter serial number"
                value={formData.serial === null ? '' : formData.serial}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number (optional)</Label>
              <Input
                id="partNumber"
                name="partNumber"
                placeholder="Enter part number"
                value={formData.partNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter sensor description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Sensor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
