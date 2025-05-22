'use client';

import React from 'react';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  Wifi,
  WifiOff,
  Cable,
  Shield,
  AlertTriangle,
  Loader,
  CheckCircle2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GatewayConnectionManagerDialog } from './GatewayConnectionManagerDialog';
import { useGatewayConnection } from '@/lib/services/gateway';
import { GatewayConnectionStatus } from '@/lib/services/gateway/types';

// Interface for the props received by the component
interface GatewaysTableProps {
  // Array of gateway objects with location already populated
  gateways: Array<GatewayResponse>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onView?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: () => void;
  filterApplied?: boolean;
}

// Component to display gateway connection status
interface GatewayConnectionDisplayProps {
  gatewayId: string;
}

function GatewayConnectionDisplay({ gatewayId }: GatewayConnectionDisplayProps) {
  const { status } = useGatewayConnection(gatewayId);

  const getStatusDetails = () => {
    switch (status) {
      case GatewayConnectionStatus.CONNECTED:
        return {
          icon: <Wifi className="h-4 w-4 text-blue-500" />,
          text: 'Connected',
          badgeClass: 'bg-blue-500/10 text-blue-500',
        };
      case GatewayConnectionStatus.CONNECTING:
        return {
          icon: <Loader className="h-4 w-4 animate-spin text-blue-500" />,
          text: 'Connecting',
          badgeClass: 'bg-blue-500/10 text-blue-500',
        };
      case GatewayConnectionStatus.AUTHENTICATED:
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          text: 'Authenticated',
          badgeClass: 'bg-green-500/10 text-green-500',
        };
      case GatewayConnectionStatus.AUTHENTICATING:
        return {
          icon: <Loader className="h-4 w-4 animate-spin text-blue-500" />,
          text: 'Authenticating',
          badgeClass: 'bg-blue-500/10 text-blue-500',
        };
      case GatewayConnectionStatus.ERROR:
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: 'Error',
          badgeClass: 'bg-red-500/10 text-red-500',
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4 text-muted-foreground" />,
          text: 'Disconnected',
          badgeClass: '',
        };
    }
  };

  const { icon, text, badgeClass } = getStatusDetails();

  return (
    <div className="flex items-center gap-2">
      {icon}
      <Badge variant="outline" className={badgeClass}>
        {text}
      </Badge>
    </div>
  );
}

export function GatewaysTable({
  gateways,
  isLoading,
  isError,
  error,
  onView,
  onEdit,
  onDelete,
  onRetry,
  filterApplied = false,
}: GatewaysTableProps) {
  // IMPORTANT: React Hook must be called at the top level of the component
  // This hook must be called unconditionally, before any conditionals
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-[180px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[160px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // If error, show error message with retry button
  if (isError) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h3 className="text-lg font-medium">Something went wrong</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load gateways'}
        </p>
        {onRetry && (
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  // If no results, display appropriate message for search results only
  if (gateways.length === 0 && filterApplied) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h3 className="text-lg font-medium">No results found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  // For no gateways without search, handle empty state elsewhere

  // Display actual data
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gateways.map(gateway => (
            <TableRow
              key={gateway._id}
              className={`${onView ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              onClick={e => {
                // Only navigate if the click wasn't on the dropdown menu or its children
                // and if onView is provided
                if (onView && !(e.target as HTMLElement).closest('.dropdown-actions')) {
                  onView(gateway._id);
                }
              }}
            >
              <TableCell className="font-medium">{gateway.name}</TableCell>
              <TableCell>{gateway.serialNumber}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                <span title={gateway.url}>{gateway.url}</span>
              </TableCell>
              <TableCell>
                <GatewayConnectionDisplay gatewayId={gateway._id} />
              </TableCell>
              <TableCell>
                <div className="dropdown-actions" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <GatewayConnectionManagerDialog
                        trigger={
                          <DropdownMenuItem onSelect={e => e.preventDefault()}>
                            <Cable className="mr-2 h-4 w-4" />
                            Connection
                          </DropdownMenuItem>
                        }
                      />
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(gateway._id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(gateway._id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(gateway._id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
