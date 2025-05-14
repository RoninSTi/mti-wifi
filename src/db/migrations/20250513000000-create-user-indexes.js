/**
 * Migration: Create User Indexes
 *
 * This migration creates indexes for the User collection to optimize queries
 * and ensure data integrity by enforcing unique constraints on username and email.
 */

module.exports = {
  // Apply the migration
  async up(db, _client) {
    const usersCollection = db.collection('users');

    // Create an index on username field for faster lookups and ensure uniqueness
    await usersCollection.createIndex(
      { username: 1 },
      {
        unique: true,
        background: true,
        name: 'username_unique',
      }
    );

    // Create an index on email field for faster lookups and ensure uniqueness
    await usersCollection.createIndex(
      { email: 1 },
      {
        unique: true,
        background: true,
        name: 'email_unique',
      }
    );

    // Create a compound index on username and email
    // This is useful for query optimization when searching by either field
    await usersCollection.createIndex(
      { username: 1, email: 1 },
      {
        background: true,
        name: 'username_email_compound',
      }
    );

    console.log('Created indexes on users collection');
  },

  // Revert the migration
  async down(db, _client) {
    const usersCollection = db.collection('users');

    // Drop the indexes in reverse order
    await usersCollection.dropIndex('username_email_compound');
    await usersCollection.dropIndex('email_unique');
    await usersCollection.dropIndex('username_unique');

    console.log('Dropped indexes from users collection');
  },
};
