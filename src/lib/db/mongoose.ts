import mongoose from 'mongoose';
// Config is used for more advanced configuration scenarios
import './config';

// Define the shape of our cached mongoose connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add mongoose to the NodeJS global type
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  // If we already have a connection and it's connected, use it
  if (cached.conn) {
    // Check if connection is still active
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    } else {
      // Connection exists but isn't active anymore, reset it
      cached.conn = null;
      cached.promise = null;
    }
  }

  // If there's a pending connection attempt, wait for it
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch {
      // Previous connection promise failed, reset it
      cached.promise = null;
    }
  }

  // Create a new connection
  // Use a direct connection string for simplicity and reliability
  const uri =
    process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/nextjs_db?authSource=admin';

  const options = { bufferCommands: false };

  // Create and store the connection promise
  cached.promise = mongoose
    .connect(uri, options)
    .then(mongoose => {
      return mongoose;
    })
    .catch(error => {
      // Log error but still throw it so it can be handled by the caller
      console.error('MongoDB connection error:', error);
      throw error;
    });

  // Wait for the connection and store it
  cached.conn = await cached.promise;
  return cached.conn;
}

// Optional: Add a disconnect function for testing
export async function disconnectFromDatabase() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
