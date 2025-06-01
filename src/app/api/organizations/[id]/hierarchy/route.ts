import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import Organization from '@/models/Organization';
import '@/models/Location';
import '@/models/Area';
import '@/models/Equipment';
import '@/models/Sensor';
import { createApiSpan } from '@/telemetry/utils';
import {
  rawOrganizationSchema,
  organizationHierarchySchema,
  type OrganizationHierarchy,
} from '@/types/hierarchy';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<OrganizationHierarchy | { error: string }>> {
  return await createApiSpan('organizations.hierarchy.get', async () => {
    try {
      await connectToDatabase();

      const { id } = await params;

      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return NextResponse.json({ error: 'Invalid organization ID format' }, { status: 400 });
      }

      const organization = await Organization.findById(id)
        .populate({
          path: 'locations',
          select: 'name _id',
          populate: {
            path: 'areas',
            select: 'name _id',
            populate: {
              path: 'equipment',
              select: 'name _id status',
              populate: {
                path: 'sensors',
                select: 'name _id status connected',
              },
            },
          },
        })
        .lean();

      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      // Parse and validate the raw organization data
      const rawOrgResult = rawOrganizationSchema.safeParse(organization);

      if (!rawOrgResult.success) {
        console.error('Raw organization validation failed:', rawOrgResult.error);
        return NextResponse.json({ error: 'Invalid organization data structure' }, { status: 500 });
      }

      const rawOrg = rawOrgResult.data;

      // Transform to hierarchy format
      const hierarchyData = {
        _id: rawOrg._id,
        name: rawOrg.name,
        locations: rawOrg.locations.map(location => ({
          _id: location._id,
          name: location.name,
          areas: location.areas.map(area => ({
            _id: area._id,
            name: area.name,
            equipment: area.equipment.map(equipment => ({
              _id: equipment._id,
              name: equipment.name,
              status: equipment.status,
              sensors: equipment.sensors.map(sensor => ({
                _id: sensor._id,
                name: sensor.name,
                status: sensor.status,
                connected: sensor.connected,
              })),
            })),
          })),
        })),
      };

      // Validate the final hierarchy structure
      const validatedData = organizationHierarchySchema.parse(hierarchyData);

      return NextResponse.json(validatedData);
    } catch (error) {
      console.error('Error fetching organization hierarchy:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid data structure returned from database' },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
