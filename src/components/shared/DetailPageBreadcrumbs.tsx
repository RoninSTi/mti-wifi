'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useOrganization, useLocation, useArea, useEquipment } from '@/hooks';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

export interface DetailPageBreadcrumbsProps {
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * A component that parses the current URL path and creates breadcrumb navigation.
 * Automatically detects entities in the URL structure and creates navigation items.
 * Shows actual entity names instead of generic labels.
 */
export function DetailPageBreadcrumbs({ className }: DetailPageBreadcrumbsProps) {
  const pathname = usePathname();

  // Extract IDs from the URL to fetch entity names
  const pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];

  // Extract IDs from path segments
  const ids = useMemo(() => {
    const extractedIds: Record<string, string> = {};

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const nextSegment = pathSegments[i + 1];

      // Check if this is an entity followed by an ID
      if (
        ['organizations', 'locations', 'areas', 'equipment'].includes(segment) &&
        nextSegment &&
        nextSegment.match(/^[a-f\d]{24}$/i)
      ) {
        extractedIds[segment.slice(0, -1)] = nextSegment; // Remove trailing 's' to get singular form
        i++; // Skip the ID segment
      }
    }

    return extractedIds;
  }, [pathSegments]);

  // Fetch entity data based on IDs
  const { organization } = useOrganization(ids.organization || '');
  const { location } = useLocation(ids.location || '');
  const { area } = useArea(ids.area || '');
  const { equipment } = useEquipment(ids.equipment || '');

  const breadcrumbItems = useMemo(() => {
    // Return empty array if pathname is not available
    if (!pathname) return [];

    // Build the breadcrumb items based on the URL structure
    const items: BreadcrumbItem[] = [];
    const currentPath = '';

    // For organizations list page, return empty (we don't need breadcrumbs)
    if (pathSegments.length === 1 && pathSegments[0] === 'organizations') {
      return [];
    }

    // For organization details page
    if (pathSegments.length >= 2 && pathSegments[0] === 'organizations' && organization) {
      // Add organization breadcrumb
      items.push({
        label: organization.name,
        href: `/organizations/${ids.organization}`,
        isCurrent: pathname === `/organizations/${ids.organization}`,
      });

      // For location details page
      if (pathSegments.length >= 4 && pathSegments[2] === 'locations' && location) {
        items.push({
          label: location.name,
          href: `/organizations/${ids.organization}/locations/${ids.location}`,
          isCurrent: pathname === `/organizations/${ids.organization}/locations/${ids.location}`,
        });

        // For area details page
        if (pathSegments.length >= 6 && pathSegments[4] === 'areas' && area) {
          items.push({
            label: area.name,
            href: `/organizations/${ids.organization}/locations/${ids.location}/areas/${ids.area}`,
            isCurrent:
              pathname ===
              `/organizations/${ids.organization}/locations/${ids.location}/areas/${ids.area}`,
          });

          // For equipment details page
          if (pathSegments.length >= 8 && pathSegments[6] === 'equipment' && equipment) {
            items.push({
              label: equipment.name,
              href: `/organizations/${ids.organization}/locations/${ids.location}/areas/${ids.area}/equipment/${ids.equipment}`,
              isCurrent: true,
            });
          }
        }
      }

      // Handle edit pages
      if (pathSegments[pathSegments.length - 1] === 'edit') {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          // Change the current flag for the previous item
          items[items.length - 1] = {
            ...lastItem,
            isCurrent: false,
          };

          // Add the edit item
          items.push({
            label: `Edit ${lastItem.label}`,
            href: `${lastItem.href}/edit`,
            isCurrent: true,
          });
        }
      }
    }

    return items;
  }, [pathname, pathSegments, organization, location, area, equipment, ids]);

  // Don't render breadcrumbs if there are no items or only one item
  if (breadcrumbItems.length <= 0) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isCurrent ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
