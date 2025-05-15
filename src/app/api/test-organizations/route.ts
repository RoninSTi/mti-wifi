import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import Organization from '@/models/Organization';

/**
 * TEST: Get all organizations directly from the database
 * This endpoint is for debugging only
 */
export async function GET(_req: NextRequest) {
  try {
    console.log('Testing organizations endpoint');

    // Connect to database
    await connectToDatabase();

    // Get all organizations directly from the database
    const organizations = await Organization.find().sort({ createdAt: -1 }).limit(20);

    // Log the count and IDs
    console.log(`Found ${organizations.length} organizations`);
    console.log(
      'Organization IDs:',
      organizations.map(org => org._id)
    );

    return NextResponse.json({
      success: true,
      count: organizations.length,
      organizations: organizations.map(org => ({
        _id: org._id,
        name: org.name,
        createdAt: org.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error testing organizations:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve organizations', details: String(error) },
      { status: 500 }
    );
  }
}
