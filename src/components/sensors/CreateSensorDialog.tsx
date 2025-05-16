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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    serial: 0,
    partNumber: '',
    status: 'inactive',
    connected: false,
  });

  const { createSensor, isLoading } = useCreateSensor();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newValue = name === 'serial' ? parseInt(value, 10) || 0 : value;
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConnectedChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      connected: value === 'true',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.serial <= 0) {
      toast.error('Serial number must be a positive number');
      return;
    }

    try {
      const result = await createSensor({
        ...formData,
        equipment: equipmentId,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to create sensor');
        return;
      }

      // Toast is already shown in the hook
      setFormData({
        name: '',
        description: '',
        serial: 0,
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
              <Label htmlFor="serial">Serial Number*</Label>
              <Input
                id="serial"
                name="serial"
                type="number"
                placeholder="Enter serial number"
                value={formData.serial === 0 ? '' : formData.serial}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number*</Label>
              <Input
                id="partNumber"
                name="partNumber"
                placeholder="Enter part number"
                value={formData.partNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status*</Label>
              <Select
                value={formData.status}
                onValueChange={value => handleSelectChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="connected">Connected*</Label>
              <Select
                value={formData.connected ? 'true' : 'false'}
                onValueChange={handleConnectedChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connection status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Connected</SelectItem>
                  <SelectItem value="false">Disconnected</SelectItem>
                </SelectContent>
              </Select>
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
