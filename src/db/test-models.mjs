// Simple script to test database connection and model registration
// Using relative paths from the current directory
import { connectToDatabase } from '../../src/lib/db/mongoose';
import mongoose from 'mongoose';

// Import all models explicitly
import Area from '../../src/models/Area';
import Equipment from '../../src/models/Equipment';
import Location from '../../src/models/Location';
import Organization from '../../src/models/Organization';

async function testModels() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Connected to database!');

    // Print registered models
    console.log('Registered models:', Object.keys(mongoose.models));

    // Try to access each model
    console.log('Checking Area model...', Area.modelName);
    console.log('Checking Equipment model...', Equipment.modelName);
    console.log('Checking Location model...', Location.modelName);
    console.log('Checking Organization model...', Organization.modelName);

    console.log('All models are correctly registered!');
  } catch (error) {
    console.error('Error testing models:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

testModels();