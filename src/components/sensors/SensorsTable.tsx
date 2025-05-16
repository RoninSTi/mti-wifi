'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Wifi, WifiOff, MoreHorizontal, Search, X } from 'lucide-react';
import { CreateSensorDialog } from './CreateSensorDialog';
import { EditSensorDialog } from './EditSensorDialog';
import { SensorDetails } from './SensorDetails';
import { useSensors } from '@/hooks/useSensors';
import { useDeleteSensor } from '@/hooks/useDeleteSensor';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomPagination } from '@/components/ui/custom-pagination';
// Import the specific schema for proper typing
import { SensorResponse } from '@/app/api/sensors/schemas';

interface SensorsTableProps {
  equipmentId: string;
}

export function SensorsTable({ equipmentId }: SensorsTableProps) {
  // Pagination and search state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch sensors with pagination and search
  const { sensors, isLoading, refetch, pagination, isError } = useSensors(equipmentId, {
    page,
    limit,
    q: searchQuery || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { mutate: deleteSensor } = useDeleteSensor();

  // Helper function for status badge using the correct type from SensorResponse
  const getStatusBadge = (status: SensorResponse['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (sensorId: string) => {
    setSelectedSensor(sensorId);
    setDetailsOpen(true);
  };

  const handleDelete = (sensorId: string) => {
    deleteSensor(sensorId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1); // Reset to first page when searching
  };

  // Clear search
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1); // Reset to first page when clearing search
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sensors</h3>
        <CreateSensorDialog
          equipmentId={equipmentId}
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Sensor
            </Button>
          }
        />
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search sensors..."
              className="pl-8 [&::-webkit-search-cancel-button]:hidden [&::-ms-clear]:hidden"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 w-9 p-0"
                onClick={clearSearch}
                type="button"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear</span>
              </Button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p className="text-destructive">Error loading sensors</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : sensors && sensors.length > 0 ? (
              sensors.map(sensor => (
                <TableRow key={sensor._id}>
                  <TableCell className="font-medium">{sensor.name}</TableCell>
                  <TableCell>{sensor.serial ?? 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(sensor.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {sensor.connected ? (
                        <>
                          <Wifi className="h-4 w-4 text-green-500 mr-2" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-4 w-4 text-muted-foreground mr-2" />
                          <span className="text-muted-foreground">Disconnected</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(sensor._id)}
                      >
                        Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <EditSensorDialog
                              sensorId={sensor._id}
                              trigger={<button className="w-full text-left">Edit</button>}
                              onComplete={refetch}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={e => {
                              e.preventDefault();
                              handleDelete(sensor._id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    {searchQuery ? (
                      <>
                        <p className="text-muted-foreground text-sm">
                          No sensors match your search
                        </p>
                        <Button variant="ghost" size="sm" onClick={clearSearch}>
                          Clear search
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-sm">No sensors found</p>
                        <p className="text-xs text-muted-foreground">
                          Add sensors to start monitoring this equipment
                        </p>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <div className="h-5 w-[160px] bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                Showing {sensors.length} of {pagination.totalItems} sensors
              </>
            )}
          </div>

          <CustomPagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />

          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <select
              className="text-sm h-8 rounded-md border border-input bg-background px-2"
              value={limit}
              onChange={e => {
                setLimit(Number(e.target.value));
                setPage(1); // Reset to first page when changing limit
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>
      )}

      {/* Sensor Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sensor Details</DialogTitle>
          </DialogHeader>
          {selectedSensor && (
            <SensorDetails
              sensorId={selectedSensor}
              onDelete={() => {
                setDetailsOpen(false);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
