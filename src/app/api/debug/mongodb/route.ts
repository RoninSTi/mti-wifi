import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET() {
  try {
    console.log('MongoDB debug endpoint called - Direct connection test');

    // Disconnect any previous connections
    if (mongoose.connection.readyState !== 0) {
      console.log('Disconnecting previous connection...');
      await mongoose.disconnect();
    }

    // Connection URI directly in this endpoint for testing
    const uri = 'mongodb://root:password@localhost:27017/nextjs_db?authSource=admin';

    // Sanitize URI for logging (hide password)
    const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//\\1:****@');
    console.log('MongoDB URI:', sanitizedUri);

    // Try to connect directly
    console.log('Attempting direct database connection...');
    let connectionSuccess = false;
    try {
      await mongoose.connect(uri, { bufferCommands: false });
      connectionSuccess = true;
      console.log('Direct database connection successful');

      // Test a simple query
      console.log('Testing a simple query...');
      if (!mongoose.connection.db) {
        throw new Error('Database connection not initialized');
      }
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(
        'Collections:',
        collections.map(c => c.name)
      );

      // Optional: show users count if the collection exists
      const hasUsersCollection = collections.some(c => c.name === 'users');
      if (hasUsersCollection && mongoose.connection.db) {
        const usersCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log('Users count:', usersCount);
      }

      // Success response
      const response = NextResponse.json({
        status: 'success',
        connected: connectionSuccess,
        readyState: mongoose.connection.readyState,
        dbName: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        mongooseVersion: mongoose.version,
        nodeVersion: process.version,
        collections: collections.map(c => c.name),
      });

      // Close connection after response is prepared
      await mongoose.disconnect();
      console.log('Connection closed after successful test');

      return response;
    } catch (dbError) {
      console.error('Direct database connection or query failed:', dbError);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          error: String(dbError),
          readyState: mongoose.connection.readyState,
          mongooseVersion: mongoose.version,
          nodeVersion: process.version,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('MongoDB debug error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Error checking MongoDB connection',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
