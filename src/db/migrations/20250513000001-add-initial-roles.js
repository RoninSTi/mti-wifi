/**
 * Migration: Add Initial Roles
 *
 * This migration creates a roles collection and adds initial role definitions
 * for basic user types (admin, user) in the system.
 */

module.exports = {
  // Apply the migration
  async up(db, _client) {
    // Create the roles collection if it doesn't exist
    const rolesColl = db.collection('roles');

    // Prepare default roles with permissions
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: ['read', 'write', 'update', 'delete', 'manage_users', 'manage_roles'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'user',
        description: 'Standard user with limited access',
        permissions: ['read', 'write_own', 'update_own', 'delete_own'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'guest',
        description: 'Guest user with read-only access',
        permissions: ['read'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Insert roles, ignoring duplicates to ensure idempotency
    try {
      await rolesColl.insertMany(defaultRoles, { ordered: false });
      console.log('Added default roles');
    } catch (error) {
      // Some documents may already exist, which is fine for idempotency
      if (error.code !== 11000) {
        throw error; // Rethrow if it's not a duplicate key error
      }
      console.log('Some roles already existed, added missing ones');
    }

    // Create an index on the role name for faster lookups
    await rolesColl.createIndex(
      { name: 1 },
      {
        unique: true,
        background: true,
        name: 'role_name_unique',
      }
    );
  },

  // Revert the migration
  async down(db, _client) {
    const rolesColl = db.collection('roles');

    // Remove the default roles
    await rolesColl.deleteMany({
      name: { $in: ['admin', 'user', 'guest'] },
    });

    // Drop the index
    await rolesColl.dropIndex('role_name_unique');

    console.log('Removed default roles');
  },
};
