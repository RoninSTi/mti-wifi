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
import { Loader2, Pencil } from 'lucide-react';
import { useUpdateEquipment, useEquipment } from '@/hooks';
import { toast } from 'sonner';
import { UpdateEquipmentInput } from '@/app/api/equipment/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditEquipmentDialogProps {
  equipmentId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Helper function to safely convert a date value to a string for form inputs
 * @param dateValue The date value that could be a string, Date, or undefined
 * @returns A string suitable for date input or empty string
 */
function formatDateForInput(dateValue: string | Date | undefined): string {
  if (dateValue === undefined) {
    return '';
  }
  return String(dateValue);
}

/**
 * Helper function to safely convert a number value to a string for form inputs
 * @param numValue The number value that could be a number or undefined
 * @returns A string suitable for number input or empty string
 */
function formatNumberForInput(numValue: number | undefined): string {
  if (numValue === undefined) {
    return '';
  }
  return String(numValue);
}

export function EditEquipmentDialog({
  equipmentId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditEquipmentDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setUncontrolledOpen(newOpen);
    }
  };

  const [formData, setFormData] = useState<UpdateEquipmentInput>({});

  // Get equipment data
  const { equipment, isLoading: isLoadingEquipment } = useEquipment(equipmentId);
  const { updateEquipment, isLoading: isUpdating } = useUpdateEquipment();

  /**
   * Parse date to ISO date string format (YYYY-MM-DD)
   * @param dateValue Date value from equipment data
   * @returns Date string in YYYY-MM-DD format or undefined if invalid
   */
  function parseEquipmentDate(dateValue: string | Date | undefined): string | undefined {
    if (!dateValue) {
      return undefined;
    }

    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) {
      return undefined;
    }

    return dateObj.toISOString().split('T')[0];
  }

  // Initialize form data when equipment data is loaded
  useEffect(() => {
    if (equipment) {
      // Format dates for input fields (if any)
      const installationDate = parseEquipmentDate(equipment.installationDate);
      const lastMaintenanceDate = parseEquipmentDate(equipment.lastMaintenanceDate);

      setFormData({
        name: equipment.name,
        description: equipment.description,
        equipmentType: equipment.equipmentType,
        manufacturer: equipment.manufacturer,
        modelNumber: equipment.modelNumber,
        serialNumber: equipment.serialNumber,
        status: equipment.status,
        criticalityLevel: equipment.criticalityLevel,
        notes: equipment.notes,
        installationDate,
        lastMaintenanceDate,
        maintenanceInterval: equipment.maintenanceInterval,
      });
    }
  }, [equipment]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle numeric input changes to ensure proper integer values or undefined
   * @param name Field name to update
   * @param value Input value from number field
   */
  const handleNumberChange = (name: string, value: string): void => {
    // Convert to number or undefined
    const numValue = value.trim() === '' ? undefined : parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      [name]: numValue,
    }));
  };

  /**
   * Handle date input changes to ensure proper string format or undefined
   * @param name Field name to update
   * @param value Input value from date field
   */
  const handleDateChange = (name: string, value: string): void => {
    // Use undefined for empty values, otherwise use the string directly
    const dateValue = value.trim() === '' ? undefined : value;
    setFormData(prev => ({ ...prev, [name]: dateValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await updateEquipment({
        id: equipmentId,
        data: formData,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to update equipment');
        return;
      }

      toast.success('Equipment updated successfully');
      setOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update equipment';
      toast.error(errorMessage);
    }
  };

  // Show loading state while fetching equipment data
  if (isLoadingEquipment && open) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger ? (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[550px]">
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading equipment data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name*</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter equipment name"
              value={formData.name || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipmentType">Equipment Type*</Label>
              <Input
                id="equipmentType"
                name="equipmentType"
                placeholder="e.g., Router, Switch, Access Point"
                value={formData.equipmentType || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status*</Label>
              <Select
                value={formData.status || 'active'}
                onValueChange={value => handleSelectChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                name="manufacturer"
                placeholder="Manufacturer name"
                value={formData.manufacturer || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelNumber">Model Number</Label>
              <Input
                id="modelNumber"
                name="modelNumber"
                placeholder="Model number"
                value={formData.modelNumber || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                placeholder="Serial number"
                value={formData.serialNumber || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criticalityLevel">Criticality Level</Label>
              <Select
                value={formData.criticalityLevel || 'medium'}
                onValueChange={value => handleSelectChange('criticalityLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installationDate">Installation Date</Label>
              <Input
                id="installationDate"
                name="installationDate"
                type="date"
                value={formatDateForInput(formData.installationDate)}
                onChange={e => handleDateChange('installationDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastMaintenanceDate">Last Maintenance Date</Label>
              <Input
                id="lastMaintenanceDate"
                name="lastMaintenanceDate"
                type="date"
                value={formatDateForInput(formData.lastMaintenanceDate)}
                onChange={e => handleDateChange('lastMaintenanceDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceInterval">Maintenance Interval (Days)</Label>
            <Input
              id="maintenanceInterval"
              name="maintenanceInterval"
              type="number"
              placeholder="E.g., 90 days"
              min={1}
              value={formatNumberForInput(formData.maintenanceInterval)}
              onChange={e => handleNumberChange('maintenanceInterval', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter equipment description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes or comments"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Equipment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
