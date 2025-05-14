// Database configuration helpers

interface DatabaseConfig {
  uri: string;
  options: {
    bufferCommands: boolean;
    // Add other mongoose options as needed
  };
}

// Get environment-specific database configuration
export function getDatabaseConfig(): DatabaseConfig {
  // Default to local configuration
  const config: DatabaseConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/nextjs_db',
    options: {
      bufferCommands: false,
    }
  };

  // Apply production-specific settings if in production
  if (process.env.NODE_ENV === 'production') {
    // AWS DocumentDB might need additional options
    config.options = {
      ...config.options,
      // SSL settings, connection pools, etc. can be added here
    };
  }

  return config;
}