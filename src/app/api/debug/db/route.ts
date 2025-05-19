import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import mongoose from 'mongoose';
import Area from '@/models/Area';
import Equipment from '@/models/Equipment';
import Location from '@/models/Location';
import Organization from '@/models/Organization';

export async function GET() {
  try {
    // Try to connect to the database
    await connectToDatabase();

    // Check connection state
    const connectionState = mongoose.connection.readyState;

    const stateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized',
    };

    // Get DB info
    const dbName = mongoose.connection.name;
    const dbHost = mongoose.connection.host;
    const dbPort = mongoose.connection.port;

    // Check registered models
    const registeredModels = Object.keys(mongoose.models);

    // Get model info
    const modelInfo = {
      Area: Area?.modelName || 'Not registered',
      Equipment: Equipment?.modelName || 'Not registered',
      Location: Location?.modelName || 'Not registered',
      Organization: Organization?.modelName || 'Not registered',
    };

    // Return information about the connection and models
    return NextResponse.json({
      success: true,
      connection: {
        state: connectionState,
        stateString: stateMap[connectionState],
        host: dbHost,
        port: dbPort,
        name: dbName,
      },
      models: {
        info: modelInfo,
        registered: registeredModels,
      },
    });
  } catch (error) {
    console.error('Database connection error:', error);

    let errorMessage = 'Unable to connect to database';

    // Add more details if available
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
