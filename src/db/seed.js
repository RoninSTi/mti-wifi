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

    // Seed organization hierarchy
    await seedOrganizationHierarchy(db);

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

/**
 * Create sample organization hierarchy
 */
async function seedOrganizationHierarchy(db) {
  const organizationsCollection = db.collection('organizations');
  const locationsCollection = db.collection('locations');
  const areasCollection = db.collection('areas');
  const equipmentCollection = db.collection('equipment');
  const sensorsCollection = db.collection('sensors');

  // Check if data already exists
  const existingOrg = await organizationsCollection.findOne({ name: 'Manufacturing Corp' });
  if (existingOrg) {
    console.log('Organization hierarchy already exists, skipping');
    return;
  }

  // Create organization
  const orgResult = await organizationsCollection.insertOne({
    name: 'Manufacturing Corp',
    description: 'Sample manufacturing company',
    contactName: 'John Doe',
    contactEmail: 'john@manufacturingcorp.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const orgId = orgResult.insertedId;

  // Create locations
  const location1Result = await locationsCollection.insertOne({
    name: 'Main Factory',
    description: 'Primary manufacturing facility',
    organization: orgId,
    address: '123 Industrial Way',
    city: 'Factory City',
    state: 'CA',
    country: 'USA',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const location1Id = location1Result.insertedId;

  const location2Result = await locationsCollection.insertOne({
    name: 'Warehouse',
    description: 'Storage and distribution center',
    organization: orgId,
    address: '456 Storage Ave',
    city: 'Factory City',
    state: 'CA',
    country: 'USA',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const location2Id = location2Result.insertedId;

  // Create areas
  const area1Result = await areasCollection.insertOne({
    name: 'Production Floor A',
    description: 'Main production area',
    location: location1Id,
    areaType: 'production',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const area1Id = area1Result.insertedId;

  const area2Result = await areasCollection.insertOne({
    name: 'Quality Control',
    description: 'Quality assurance area',
    location: location1Id,
    areaType: 'other',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const area2Id = area2Result.insertedId;

  // Create equipment
  const equipment1Result = await equipmentCollection.insertOne({
    name: 'CNC Machine #1',
    description: 'Primary CNC machine',
    area: area1Id,
    equipmentType: 'CNC Machine',
    manufacturer: 'Industrial Corp',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const equipment1Id = equipment1Result.insertedId;

  const equipment2Result = await equipmentCollection.insertOne({
    name: 'Quality Scanner',
    description: 'Automated quality scanner',
    area: area2Id,
    equipmentType: 'Scanner',
    manufacturer: 'QualityTech',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const equipment2Id = equipment2Result.insertedId;

  // Create sensors
  await sensorsCollection.insertMany([
    {
      name: 'Vibration Sensor',
      description: 'Monitors machine vibration',
      equipment: equipment1Id,
      serial: 123456,
      partNumber: 'VIB-001',
      status: 'active',
      connected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Temperature Sensor',
      description: 'Monitors machine temperature',
      equipment: equipment1Id,
      serial: 123457,
      partNumber: 'TEMP-001',
      status: 'warning',
      connected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Position Sensor',
      description: 'Monitors scanner position',
      equipment: equipment2Id,
      serial: 123458,
      partNumber: 'POS-001',
      status: 'active',
      connected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log('Organization hierarchy seeded successfully');
}

// Run seeding
seedDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  });
