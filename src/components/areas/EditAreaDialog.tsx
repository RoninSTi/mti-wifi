'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useUpdateArea } from '@/hooks';
import { toast } from 'sonner';
import { AreaResponse, UpdateAreaInput } from '@/app/api/areas/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditAreaDialogProps {
  area: AreaResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAreaDialog({ area, open, onOpenChange }: EditAreaDialogProps) {
  const [formData, setFormData] = useState<UpdateAreaInput>({
    name: area.name,
    description: area.description,
    floorLevel: area.floorLevel,
    buildingSection: area.buildingSection,
    areaType: area.areaType,
  });

  // Update form data when the area prop changes
  useEffect(() => {
    setFormData({
      name: area.name,
      description: area.description,
      floorLevel: area.floorLevel,
      buildingSection: area.buildingSection,
      areaType: area.areaType,
    });
  }, [area]);

  const { updateArea, isLoading } = useUpdateArea();

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
      const result = await updateArea({
        id: area._id,
        data: formData,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to update area');
        return;
      }

      toast.success('Area updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update area');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Area</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name*</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter area name"
              value={formData.name || ''}
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
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Area
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
