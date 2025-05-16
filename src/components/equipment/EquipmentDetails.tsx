'use client';

import React from 'react';
import { EquipmentResponse } from '@/app/api/equipment/schemas';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EditEquipmentDialog } from './EditEquipmentDialog';
import { Pencil, Trash, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EquipmentDetailsProps {
  equipment: EquipmentResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function EquipmentDetails({
  equipment,
  isLoading,
  isError,
  error,
  onDelete,
  onRefresh,
}: EquipmentDetailsProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-[120px]" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-[120px]" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h3 className="text-lg font-medium">Error loading equipment details</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Unable to load equipment information'}
        </p>
        <Button variant="outline" className="mt-4" onClick={onRefresh}>
          Try again
        </Button>
      </div>
    );
  }

  // Empty state
  if (!equipment) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h3 className="text-lg font-medium">Equipment not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The requested equipment could not be found or has been deleted.
        </p>
      </div>
    );
  }

  // Function to determine status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" /> Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Inactive
          </Badge>
        );
      case 'maintenance':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Maintenance
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="mr-1 h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            {status}
          </Badge>
        );
    }
  };

  // Function to format maintenance status
  const getMaintenanceStatus = () => {
    if (equipment.maintenanceDue) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertTriangle className="mr-1 h-3 w-3" /> Maintenance Due
        </Badge>
      );
    }

    if (equipment.nextMaintenanceDate) {
      const nextDate = new Date(equipment.nextMaintenanceDate);
      return <span>Next scheduled: {nextDate.toLocaleDateString()}</span>;
    }

    return <span className="text-muted-foreground">No maintenance schedule</span>;
  };

  // Function to format dates
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  // For criticality level
  const getCriticalityBadge = (level?: string) => {
    switch (level) {
      case 'critical':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Critical
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Low
          </Badge>
        );
      default:
        return <span className="text-muted-foreground">Not specified</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
          <p className="text-muted-foreground">
            {equipment.equipmentType} • {getStatusBadge(equipment.status)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EditEquipmentDialog
            equipmentId={equipment._id}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => onDelete(equipment._id)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Description card */}
      {equipment.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{equipment.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Main details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Equipment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium">Manufacturer:</div>
              <div className="text-sm">{equipment.manufacturer || 'Not specified'}</div>

              <div className="text-sm font-medium">Model Number:</div>
              <div className="text-sm">{equipment.modelNumber || 'Not specified'}</div>

              <div className="text-sm font-medium">Serial Number:</div>
              <div className="text-sm">{equipment.serialNumber || 'Not specified'}</div>

              <div className="text-sm font-medium">Criticality:</div>
              <div className="text-sm">{getCriticalityBadge(equipment.criticalityLevel)}</div>

              <div className="text-sm font-medium">Area:</div>
              <div className="text-sm">{equipment.area.name}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Maintenance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium">Status:</div>
              <div className="text-sm">{getMaintenanceStatus()}</div>

              <div className="text-sm font-medium">Installation Date:</div>
              <div className="text-sm">{formatDate(equipment.installationDate)}</div>

              <div className="text-sm font-medium">Last Maintenance:</div>
              <div className="text-sm">{formatDate(equipment.lastMaintenanceDate)}</div>

              <div className="text-sm font-medium">Maintenance Interval:</div>
              <div className="text-sm">
                {equipment.maintenanceInterval
                  ? `${equipment.maintenanceInterval} days`
                  : 'Not specified'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes card */}
      {equipment.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{equipment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Created: {formatDate(equipment.createdAt)} • Last Updated:{' '}
          {formatDate(equipment.updatedAt)}
        </p>
      </div>
    </div>
  );
}
