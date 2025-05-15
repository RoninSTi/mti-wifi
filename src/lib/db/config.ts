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
  // Default to local configuration with auth credentials in the URI
  const username = process.env.MONGODB_USERNAME || 'root';
  const password = process.env.MONGODB_PASSWORD || 'password';
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || 'nextjs_db';

  // Build the URI with credentials
  const uri =
    process.env.MONGODB_URI ||
    `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;

  const config: DatabaseConfig = {
    uri,
    options: {
      bufferCommands: false,
    },
  };

  // Apply production-specific settings if in production
  if (process.env.NODE_ENV === 'production') {
    // AWS DocumentDB might need additional options
    config.options = {
      ...config.options,
      // SSL settings, connection pools, etc. can be added here
    };
  }

  console.log('Using database config:', {
    uri: config.uri.replace(/\/\/([^:]+):([^@]+)@/, '//\\1:****@'),
  });

  return config;
}
