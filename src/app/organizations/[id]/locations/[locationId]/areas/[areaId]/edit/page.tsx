'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useArea, useUpdateArea } from '@/hooks';
import { toast } from 'sonner';
import { UpdateAreaInput } from '@/app/api/areas/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface EditAreaPageProps {
  params: {
    id: string;
    locationId: string;
    areaId: string;
  };
}

export default function EditAreaPage({ params }: EditAreaPageProps) {
  const { id: organizationId, locationId, areaId } = params;
  const router = useRouter();
  const [formData, setFormData] = useState<UpdateAreaInput>({});

  // Fetch area details
  const { area, isLoading, isError, error } = useArea(areaId);
  const { updateArea, isLoading: isUpdating } = useUpdateArea();

  // Initialize form data when area data is loaded
  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name,
        description: area.description,
        floorLevel: area.floorLevel,
        buildingSection: area.buildingSection,
        areaType: area.areaType,
      });
    }
  }, [area]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'floorLevel' ? (value ? parseInt(value, 10) : undefined) : value,
    }));
  };

  // Handle select input changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await updateArea({
        id: areaId,
        data: formData,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to update area');
        return;
      }

      toast.success('Area updated successfully');
      // Navigate back to area details
      router.push(`/organizations/${organizationId}/locations/${locationId}/areas/${areaId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update area');
    }
  };

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading area...</span>
        </div>
      </div>
    );
  }

  // If error, show error state
  if (isError || !area) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="rounded-lg border p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-medium">Error loading area</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'The requested area could not be found'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/organizations/${organizationId}/locations/${locationId}`)}
          >
            Back to Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/organizations">Organizations</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/organizations/${organizationId}`}>
            {area.location?.organization?.name || organizationId}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/organizations/${organizationId}/locations/${locationId}`}>
            {area.location?.name || locationId}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            href={`/organizations/${organizationId}/locations/${locationId}/areas/${areaId}`}
          >
            {area.name}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>Edit</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          className="mr-2"
          onClick={() =>
            router.push(`/organizations/${organizationId}/locations/${locationId}/areas/${areaId}`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Area</h1>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="floorLevel">Floor Level</Label>
            <Input
              id="floorLevel"
              name="floorLevel"
              type="number"
              placeholder="Floor number"
              value={formData.floorLevel === undefined ? '' : formData.floorLevel}
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
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              router.push(
                `/organizations/${organizationId}/locations/${locationId}/areas/${areaId}`
              )
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
