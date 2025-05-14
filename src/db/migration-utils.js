/**
 * Migration utilities for easier migrate-mongo operations
 * This file provides helper functions to simplify working with migrate-mongo
 */

import { connect, create, up, down, status } from 'migrate-mongo';
import path from 'path';

/**
 * Creates a new migration file
 * @param {string} name - The name of the migration
 * @returns {Promise<string>} - Path to the created migration file
 */
async function createMigration(name) {
  if (!name) {
    throw new Error('Migration name is required');
  }

  // Convert the name to kebab-case if it's not already
  const formattedName = name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

  console.log(`Creating migration: ${formattedName}`);

  try {
    // Create a new migration file
    const fileName = await create(formattedName);
    const filePath = path.resolve(process.cwd(), 'src/db/migrations', fileName);
    console.log(`Migration created at: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Failed to create migration:', error);
    throw error;
  }
}

/**
 * Applies all pending migrations
 * @returns {Promise<Array>} - List of applied migrations
 */
async function applyMigrations() {
  try {
    const db = await connect();
    const migrated = await up(db);

    if (migrated.length === 0) {
      console.log('No pending migrations to apply');
    } else {
      console.log('Applied migrations:');
      migrated.forEach(fileName => console.log(`- ${fileName}`));
    }

    await db.close();
    return migrated;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rolls back the last applied migration
 * @returns {Promise<Array>} - List of rolled back migrations
 */
async function rollbackMigration() {
  try {
    const db = await connect();
    const migrationsRolledBack = await down(db);

    if (migrationsRolledBack.length === 0) {
      console.log('No migrations to roll back');
    } else {
      console.log('Rolled back migrations:');
      migrationsRolledBack.forEach(fileName => console.log(`- ${fileName}`));
    }

    await db.close();
    return migrationsRolledBack;
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Checks the status of all migrations
 * @returns {Promise<Array>} - Status of all migrations
 */
async function checkMigrationStatus() {
  try {
    const db = await connect();
    const migrationStatus = await status(db);

    console.log('Migration status:');

    if (migrationStatus.length === 0) {
      console.log('No migrations found');
    } else {
      const pending = migrationStatus.filter(m => !m.appliedAt);
      const applied = migrationStatus.filter(m => m.appliedAt);

      console.log(`Applied migrations (${applied.length}):`);
      applied.forEach(m => console.log(`- ${m.fileName} (applied at: ${m.appliedAt})`));

      console.log(`\nPending migrations (${pending.length}):`);
      pending.forEach(m => console.log(`- ${m.fileName}`));
    }

    await db.close();
    return migrationStatus;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    throw error;
  }
}

export { createMigration, applyMigrations, rollbackMigration, checkMigrationStatus };
