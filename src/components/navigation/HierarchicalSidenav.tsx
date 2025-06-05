'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Building2, MapPin, Grid3x3, Wrench, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';
import { getOrganizationHierarchy } from '@/lib/api/organizations';
import type {
  OrganizationHierarchy,
  HierarchyLocation,
  HierarchyArea,
  HierarchyEquipment,
  HierarchySensor,
} from '@/types/hierarchy';

interface TreeNodeData {
  id: string;
  name: string;
  type: 'organization' | 'location' | 'area' | 'equipment' | 'sensor';
  status?: 'active' | 'inactive' | 'maintenance' | 'failed' | 'warning' | 'error';
  connected?: boolean;
  children?: TreeNodeData[];
  level: number;
  // Navigation context
  organizationId?: string;
  locationId?: string;
  areaId?: string;
  equipmentId?: string;
}

interface TreeNodeProps extends TreeNodeData {
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isSelected: boolean;
  treeState: TreeState;
}

const TreeNode = ({
  id: _,
  name,
  type,
  children,
  level,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  treeState,
}: TreeNodeProps) => {
  const hasChildren = children && children.length > 0;

  const getIcon = () => {
    switch (type) {
      case 'organization':
        return <Building2 className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'area':
        return <Grid3x3 className="h-4 w-4" />;
      case 'equipment':
        return <Wrench className="h-4 w-4" />;
      case 'sensor':
        return <Radio className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div
        className={cn(
          'w-full flex items-center gap-2 p-2 text-left font-normal hover:bg-muted/50 cursor-pointer',
          isSelected && 'bg-muted'
        )}
        onClick={onSelect}
      >
        <div style={{ marginLeft: `${level * 12}px` }} className="flex items-center gap-2 w-full">
          {hasChildren ? (
            <div
              onClick={e => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex-shrink-0 cursor-pointer hover:bg-accent rounded p-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          ) : (
            <div className="w-6" />
          )}

          {getIcon()}

          <span className="flex-1 truncate text-sm">{name}</span>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {children.map(child => (
            <TreeNodeComponent key={child.id} {...child} treeState={treeState} />
          ))}
        </div>
      )}
    </div>
  );
};

// Context for managing tree state
interface TreeState {
  expandedNodes: Set<string>;
  selectedNode: string | null;
  toggleNode: (nodeId: string) => void;
  selectNode: (nodeId: string) => void;
}

// Wrapper component to handle state
const TreeNodeComponent = ({ treeState, ...props }: TreeNodeData & { treeState: TreeState }) => {
  const router = useRouter();
  const isExpanded = treeState.expandedNodes.has(props.id);
  const isSelected = treeState.selectedNode === props.id;

  const handleToggle = () => {
    treeState.toggleNode(props.id);
  };

  const handleSelect = () => {
    treeState.selectNode(props.id);

    // Navigate to the appropriate page based on entity type
    switch (props.type) {
      case 'organization':
        router.push(`/organizations/${props.id}`);
        break;
      case 'location':
        if (props.organizationId) {
          router.push(`/organizations/${props.organizationId}/locations/${props.id}`);
        }
        break;
      case 'area':
        if (props.organizationId && props.locationId) {
          router.push(
            `/organizations/${props.organizationId}/locations/${props.locationId}/areas/${props.id}`
          );
        }
        break;
      case 'equipment':
        if (props.organizationId && props.locationId && props.areaId) {
          router.push(
            `/organizations/${props.organizationId}/locations/${props.locationId}/areas/${props.areaId}/equipment/${props.id}`
          );
        }
        break;
      case 'sensor':
        if (props.organizationId && props.locationId && props.areaId && props.equipmentId) {
          router.push(
            `/organizations/${props.organizationId}/locations/${props.locationId}/areas/${props.areaId}/equipment/${props.equipmentId}/sensor/${props.id}`
          );
        }
        break;
    }
  };

  return (
    <TreeNode
      {...props}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      onSelect={handleSelect}
      isSelected={isSelected}
      treeState={treeState}
    />
  );
};

export const HierarchicalSidenav = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const { organizations, isLoading: orgsLoading } = useOrganizations();

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['organization-hierarchy', selectedOrgId],
    queryFn: () => (selectedOrgId ? getOrganizationHierarchy(selectedOrgId) : null),
    enabled: !!selectedOrgId,
  });

  // Parse current route to determine what should be expanded/selected
  useEffect(() => {
    const pathParts = pathname.split('/').filter(Boolean);

    // Check if we're on an organization-related page
    if (pathParts[0] === 'organizations' && pathParts[1]) {
      const orgId = pathParts[1];

      // Auto-expand this organization
      setExpandedOrgs(prev => new Set([...prev, orgId]));
      setSelectedOrgId(orgId);

      // Parse deeper path for auto-expansion
      if (pathParts.length > 2) {
        const nodesToExpand = new Set<string>();

        // If we're on a location page or deeper
        if (pathParts[2] === 'locations' && pathParts[3]) {
          const locationId = pathParts[3];
          nodesToExpand.add(locationId);

          // If we're on an area page or deeper
          if (pathParts[4] === 'areas' && pathParts[5]) {
            const areaId = pathParts[5];
            nodesToExpand.add(areaId);

            // If we're on an equipment page or deeper
            if (pathParts[6] === 'equipment' && pathParts[7]) {
              const equipmentId = pathParts[7];
              nodesToExpand.add(equipmentId);

              // If we're on a sensor page
              if (pathParts[8] === 'sensor' && pathParts[9]) {
                const sensorId = pathParts[9];
                setSelectedNode(sensorId);
              } else {
                setSelectedNode(equipmentId);
              }
            } else {
              setSelectedNode(areaId);
            }
          } else {
            setSelectedNode(locationId);
          }
        } else {
          setSelectedNode(orgId);
        }

        setExpandedNodes(prev => new Set([...prev, ...nodesToExpand]));
      } else {
        setSelectedNode(orgId);
      }
    }
  }, [pathname]);

  const treeState: TreeState = {
    expandedNodes,
    selectedNode,
    toggleNode: (nodeId: string) => {
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      setExpandedNodes(newExpanded);
    },
    selectNode: (nodeId: string) => {
      setSelectedNode(nodeId);
    },
  };

  const handleOrgToggle = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
      if (selectedOrgId === orgId) {
        setSelectedOrgId(null);
      }
    } else {
      newExpanded.add(orgId);
      setSelectedOrgId(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const handleOrgClick = (orgId: string) => {
    // Navigate to organization page
    router.push(`/organizations/${orgId}`);
  };

  const buildTreeNodes = (orgData: OrganizationHierarchy): TreeNodeData[] => {
    const organizationId = orgData._id;

    return orgData.locations.map((location: HierarchyLocation) => ({
      id: location._id,
      name: location.name,
      type: 'location' as const,
      level: 1,
      organizationId,
      children: location.areas.map((area: HierarchyArea) => ({
        id: area._id,
        name: area.name,
        type: 'area' as const,
        level: 2,
        organizationId,
        locationId: location._id,
        children: area.equipment.map((equipment: HierarchyEquipment) => ({
          id: equipment._id,
          name: equipment.name,
          type: 'equipment' as const,
          status: equipment.status,
          level: 3,
          organizationId,
          locationId: location._id,
          areaId: area._id,
          children: equipment.sensors.map((sensor: HierarchySensor) => ({
            id: sensor._id,
            name: sensor.name,
            type: 'sensor' as const,
            status: sensor.status,
            connected: sensor.connected,
            level: 4,
            organizationId,
            locationId: location._id,
            areaId: area._id,
            equipmentId: equipment._id,
          })),
        })),
      })),
    }));
  };

  if (orgsLoading) {
    return (
      <div className="w-64 border-r bg-muted/20 p-4">
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div>
        <div className="space-y-1">
          {organizations.map(org => {
            const isExpanded = expandedOrgs.has(org._id);
            const isSelected = selectedOrgId === org._id;

            return (
              <div key={org._id}>
                <div
                  className={cn(
                    'w-full flex items-center gap-2 p-2 text-left font-normal hover:bg-muted/50 cursor-pointer',
                    isSelected && 'bg-muted'
                  )}
                  onClick={() => handleOrgClick(org._id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        handleOrgToggle(org._id);
                      }}
                      className="flex-shrink-0 cursor-pointer hover:bg-accent rounded p-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{org.name}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div>
                    {hierarchyLoading ? (
                      <div className="space-y-1 p-2">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="h-6 bg-muted rounded animate-pulse" />
                        ))}
                      </div>
                    ) : hierarchy && hierarchy.data && hierarchy.data.locations ? (
                      <div>
                        {buildTreeNodes(hierarchy.data).map(node => (
                          <TreeNodeComponent key={node.id} {...node} treeState={treeState} />
                        ))}
                      </div>
                    ) : hierarchy && hierarchy.data && !hierarchy.data.locations ? (
                      <div className="p-2 text-sm text-muted-foreground">No locations found</div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
