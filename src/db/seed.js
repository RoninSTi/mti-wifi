/**
 * Database Seed Script
 *
 * This script provides a way to seed the database with initial data for development.
 * It should NOT be run in production - it's intended for development and testing only.
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

dotenv.config({ path: '.env.local' });

// Connection URI
const uri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/nextjs_db';
const dbName = process.env.MONGODB_DB_NAME || 'nextjs_db';

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
  console.log('Starting database seed process...');

  let client;

  try {
    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Seed admin user
    await seedAdminUser(db);

    // Seed test users
    await seedTestUsers(db);

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

/**
 * Create admin user if it doesn't exist
 */
async function seedAdminUser(db) {
  const usersCollection = db.collection('users');

  // Check if admin user already exists
  const existingAdmin = await usersCollection.findOne({ username: 'admin' });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping');
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash('adminPassword123!', 10);

  await usersCollection.insertOne({
    username: 'admin',
    email: 'admin@example.com',
    password: passwordHash,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Admin user created successfully');
}

/**
 * Create test users if they don't exist
 */
async function seedTestUsers(db) {
  const usersCollection = db.collection('users');

  // Sample test users
  const testUsers = [
    { username: 'user1', email: 'user1@example.com', password: 'userPassword123!', role: 'user' },
    { username: 'user2', email: 'user2@example.com', password: 'userPassword123!', role: 'user' },
    { username: 'guest', email: 'guest@example.com', password: 'guestPassword123!', role: 'guest' },
  ];

  for (const user of testUsers) {
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ username: user.username });

    if (existingUser) {
      console.log(`User ${user.username} already exists, skipping`);
      continue;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(user.password, 10);

    // Create user
    await usersCollection.insertOne({
      username: user.username,
      email: user.email,
      password: passwordHash,
      role: user.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Test user ${user.username} created successfully`);
  }
}

// Run seeding
seedDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  });
