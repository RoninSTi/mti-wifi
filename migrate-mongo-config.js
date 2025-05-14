// Configuration for migrate-mongo
// This file should not contain sensitive credentials
// Instead, it uses environment variables loaded from .env files

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production.local' : '.env.local',
});

const config = {
  mongodb: {
    // Get MongoDB connection string from environment variables or use default for local development
    url:
      process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/admin?authSource=admin',

    // Extract database name from connection string or use default
    databaseName: process.env.MONGODB_DB_NAME || 'nextjs_db',

    options: {
      directConnection: true, // Direct connection for better performance
      socketTimeoutMS: 300000, // 5 minutes timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
    },
  },

  // Store migrations in a dedicated directory
  migrationsDir: 'src/db/migrations',

  // The mongodb collection where the applied changes are stored
  changelogCollectionName: 'migrations_changelog',

  // The mongodb collection where the lock will be created
  lockCollectionName: 'migrations_lock',

  // TTL for the lock in seconds (3 minutes)
  lockTtl: 180,

  // Use .js files for migrations
  migrationFileExtension: '.js',

  // Use file hash to avoid running migrations multiple times
  useFileHash: true,

  // Use CommonJS module system since this file is loaded as CommonJS
  moduleSystem: 'commonjs',
};

module.exports = config;
