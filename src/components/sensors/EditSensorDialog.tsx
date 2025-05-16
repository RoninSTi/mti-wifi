'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useUpdateSensor } from '@/hooks/useUpdateSensor';
import { useSensor } from '@/hooks/useSensor';
import { toast } from 'sonner';
import { UpdateSensorInput } from '@/app/api/sensors/schemas';

interface EditSensorDialogProps {
  sensorId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
}

export function EditSensorDialog({
  sensorId,
  trigger,
  open = false,
  onOpenChange = () => {},
  onComplete,
}: EditSensorDialogProps) {
  const [formData, setFormData] = useState<Partial<UpdateSensorInput>>({
    name: '',
    description: '',
    serial: null,
    partNumber: '',
  });

  const { data, isLoading: isLoadingSensor } = useSensor(sensorId);
  const { mutate: updateSensor, isPending: isUpdating } = useUpdateSensor(sensorId);

  // Populate form when sensor data is loaded
  useEffect(() => {
    if (data?.data) {
      const sensor = data.data;
      setFormData({
        name: sensor.name,
        description: sensor.description || '',
        serial: sensor.serial,
        partNumber: sensor.partNumber || '',
      });
    }
  }, [data]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate serial if provided and not null
    const { serial } = formData;
    if (serial !== null && serial !== undefined && serial <= 0) {
      toast.error('Serial number must be a positive number');
      return;
    }

    try {
      updateSensor(formData, {
        onSuccess: () => {
          onOpenChange(false);
          if (onComplete) {
            onComplete();
          }
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update sensor');
    }
  };

  if (isLoadingSensor) {
    return null; // Or a loading state if you prefer
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline">Edit Sensor</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Sensor</DialogTitle>
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
              {/* Using a standard input to avoid type issues */}
              <input
                id="serial"
                name="serial"
                type="number"
                placeholder="Enter serial number"
                value={formData.serial === null ? '' : formData.serial}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number (optional)</Label>
              {/* Using a standard input to avoid type issues */}
              <input
                id="partNumber"
                name="partNumber"
                placeholder="Enter part number"
                value={formData.partNumber || ''}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
