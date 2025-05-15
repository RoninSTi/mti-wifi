const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');

    // Connection URI
    const uri = 'mongodb://root:password@localhost:27017/nextjs_db?authSource=admin';
    console.log('Connecting with URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//\\1:****@'));

    // Connect to MongoDB
    await mongoose.connect(uri, { bufferCommands: false });

    console.log('Connection successful!');
    console.log('Connected to database:', mongoose.connection.name);
    console.log('Connection state:', mongoose.connection.readyState);

    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(
      'Collections:',
      collections.map(c => c.name)
    );

    return { success: true };
  } catch (error) {
    console.error('Connection failed:', error);
    return { success: false, error: error.message };
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testConnection()
  .then(result => {
    console.log('Test result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
