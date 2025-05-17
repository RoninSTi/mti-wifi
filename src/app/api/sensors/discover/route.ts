import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { createApiSpan } from '@/telemetry/utils';
import { authOptions } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db/mongoose';
import Sensor from '@/models/Sensor';
import Equipment from '@/models/Equipment';
import { DiscoverSensorsPayloadSchema } from '@/types/discovery';

// Endpoint for discovering and creating multiple sensors in a batch
export async function POST(request: NextRequest) {
  return createApiSpan('sensors.discover', async () => {
    try {
      // Check authorization
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'You must be signed in to discover sensors' },
          { status: 401 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const result = DiscoverSensorsPayloadSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid request', message: result.error.message },
          { status: 400 }
        );
      }

      const { sensors, equipmentId } = result.data;

      // Connect to the database
      await connectToDatabase();

      // Check if the equipment exists
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) {
        return NextResponse.json(
          { error: 'Equipment not found', message: 'The specified equipment does not exist' },
          { status: 404 }
        );
      }

      // Process each sensor (create or update)
      const createdSensors = [];

      console.log(`Processing ${sensors.length} sensors for equipment ${equipmentId}`);

      for (const sensorData of sensors) {
        try {
          const { sensorId, ...restData } = sensorData;

          // Convert serial to number if it's not already (just to be safe)
          const serial =
            typeof restData.serial === 'string' ? parseInt(restData.serial, 10) : restData.serial;

          // Convert sensor data to match the Mongoose model
          const processedData = {
            ...restData,
            serial,
            equipment: equipmentId, // Use the equipmentId from the parent object
            status: restData.connected ? 'active' : 'inactive',
            lastConnectedAt: restData.connected ? new Date() : undefined,
          };

          // Check for duplicate sensor by serial number
          const existingSensor = await Sensor.findOne({
            serial: processedData.serial,
            equipment: equipmentId,
          });

          let sensor;

          // If sensorId is provided or we found a duplicate, update it
          if (sensorId || existingSensor) {
            const targetId = sensorId || existingSensor?._id;
            console.log(`Updating existing sensor ${targetId} with serial ${processedData.serial}`);

            sensor = await Sensor.findByIdAndUpdate(targetId, processedData, {
              new: true,
              runValidators: true,
            });

            if (!sensor) {
              console.log(`Sensor with ID ${targetId} not found, creating new one`);
              sensor = await Sensor.create(processedData);
            }
          } else {
            // Create a new sensor
            console.log(`Creating new sensor with serial ${processedData.serial}`);
            sensor = await Sensor.create(processedData);
          }

          createdSensors.push(sensor);
          console.log(`Processed sensor: ${sensor._id}`);
        } catch (sensorError) {
          console.error('Error processing sensor:', sensorError);
          // Continue with other sensors even if one fails
        }
      }

      console.log(`Successfully created/updated ${createdSensors.length} sensors`);

      // Convert Mongoose documents to plain objects and ensure _id is a string
      const plainSensors = createdSensors.map(sensor => {
        const sensorObj = sensor.toObject();
        // Convert _id to string explicitly for consistent serialization
        if (sensorObj._id) {
          sensorObj._id = sensorObj._id.toString();
        }
        // Also convert equipment reference to string
        if (sensorObj.equipment) {
          sensorObj.equipment = sensorObj.equipment.toString();
        }
        return sensorObj;
      });

      // Return the created/updated sensors
      return NextResponse.json(plainSensors);
    } catch (error) {
      console.error('Sensor discovery error:', error);

      return NextResponse.json(
        {
          error: 'Server error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        { status: 500 }
      );
    }
  });
}
