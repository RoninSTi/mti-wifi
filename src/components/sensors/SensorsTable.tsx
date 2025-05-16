'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle } from 'lucide-react';

interface SensorsTableProps {
  equipmentId: string;
}

export function SensorsTable({ equipmentId: _equipmentId }: SensorsTableProps) {
  // This is a placeholder component that will be implemented later
  // For now, we'll show a placeholder UI with a message

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sensors</h3>
        <Button variant="outline" size="sm" disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Sensor
        </Button>
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
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <p className="text-muted-foreground text-sm">Sensor management coming soon</p>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll be able to connect and manage sensors attached to this equipment
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
