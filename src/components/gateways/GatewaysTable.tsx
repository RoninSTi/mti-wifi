'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { SensorResponse } from '@/app/api/sensors/schemas';
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
  AlertTriangle,
  Loader,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Radio,
  Package,
  Grid3x3,
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
import { useSensorsByGateway } from '@/hooks';

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

// Component to display sensors for a gateway
interface GatewaySensorsDisplayProps {
  gatewayId: string;
  isExpanded: boolean;
}

function GatewaySensorsDisplay({ gatewayId, isExpanded }: GatewaySensorsDisplayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { sensors, isLoading, isError } = useSensorsByGateway(gatewayId, {
    enabled: isExpanded,
    limit: 100, // Get all sensors for this gateway
  });

  // Use the gateway connection hook to get up-to-date connection status
  const { sensors: gatewayLiveSensors = [] } = useGatewayConnection(gatewayId);

  // Log connection status when expanded for debugging
  useEffect(() => {
    if (isExpanded && sensors.length > 0 && gatewayLiveSensors.length > 0) {
      console.log('Connection status check:', {
        gatewayId,
        apiSensors: sensors.map(s => ({ id: s._id, serial: s.serial, connected: s.connected })),
        liveSensors: gatewayLiveSensors.map(s => ({ serial: s.Serial, connected: s.Connected })),
      });
    }
  }, [isExpanded, sensors, gatewayLiveSensors, gatewayId]);

  const handleSensorClick = (sensor: SensorResponse) => {
    if (
      !sensor.equipment?.area?.location?._id ||
      !sensor.equipment.area._id ||
      !sensor.equipment._id
    ) {
      console.warn('Incomplete sensor navigation data:', sensor);
      return;
    }

    // Get organization ID from current URL since we're already in that context
    const pathParts = pathname.split('/');
    const orgId = pathParts[2]; // /organizations/{orgId}/locations/{locationId}

    const locationId = sensor.equipment.area.location._id;
    const areaId = sensor.equipment.area._id;
    const equipmentId = sensor.equipment._id;
    const sensorId = sensor._id;

    const url = `/organizations/${orgId}/locations/${locationId}/areas/${areaId}/equipment/${equipmentId}/sensor/${sensorId}`;
    router.push(url);
  };

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="p-0">
          <div className="bg-muted/20 p-4 space-y-2">
            <div className="text-sm text-muted-foreground mb-2">Loading sensors...</div>
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 pl-8">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (isError || sensors.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="p-0">
          <div className="bg-muted/20 p-4">
            <div className="text-sm text-muted-foreground pl-8">
              {isError ? 'Error loading sensors' : 'No sensors found for this gateway'}
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={6} className="p-0">
        <div className="bg-muted/20 p-4">
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sensor Name</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Connection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sensors.map(sensor => (
                  <TableRow
                    key={sensor._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSensorClick(sensor)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{sensor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sensor.equipment && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{sensor.equipment.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {sensor.equipment?.area && (
                        <div className="flex items-center gap-2">
                          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                          <span>{sensor.equipment.area.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sensor.serial || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {/* 
                          Check connection status from both sources:
                          1. The sensor's own connected property from the database
                          2. The live connection data from the gateway service 
                        */}
                        {sensor.connected ||
                        gatewayLiveSensors.some(
                          s =>
                            s.Serial === sensor.serial &&
                            (s.Connected === 1 || s.Connected === true)
                        ) ? (
                          <>
                            <Wifi className="h-4 w-4 text-green-500 mr-2" />
                            <span>Connected</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-muted-foreground">Disconnected</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
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
  // State for tracking expanded gateways
  const [expandedGateways, setExpandedGateways] = useState<Set<string>>(new Set());

  // Function to toggle gateway expansion
  const toggleGatewayExpansion = (gatewayId: string) => {
    const newExpanded = new Set(expandedGateways);
    if (newExpanded.has(gatewayId)) {
      newExpanded.delete(gatewayId);
    } else {
      newExpanded.add(gatewayId);
    }
    setExpandedGateways(newExpanded);
  };

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
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Gateway Name</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Connection Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
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
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Gateway Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Connection Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gateways.map(gateway => {
            const isExpanded = expandedGateways.has(gateway._id);
            return (
              <React.Fragment key={gateway._id}>
                <TableRow
                  className={`${onView ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={e => {
                    // Only navigate if the click wasn't on the dropdown menu or its children
                    // and if onView is provided
                    if (
                      onView &&
                      !(e.target as HTMLElement).closest('.dropdown-actions') &&
                      !(e.target as HTMLElement).closest('.expand-toggle')
                    ) {
                      onView(gateway._id);
                    }
                  }}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="expand-toggle h-6 w-6 p-0"
                      onClick={e => {
                        e.stopPropagation();
                        toggleGatewayExpansion(gateway._id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
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
                <GatewaySensorsDisplay gatewayId={gateway._id} isExpanded={isExpanded} />
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
