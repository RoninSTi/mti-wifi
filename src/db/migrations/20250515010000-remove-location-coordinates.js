/**
 * Migration: Remove Location Coordinates
 *
 * This migration removes the latitude and longitude fields from the Location collection
 * as they are no longer needed in the application.
 */

module.exports = {
  // Apply the migration
  async up(db, _client) {
    const locationsCollection = db.collection('locations');

    // Remove latitude and longitude fields from all documents
    await locationsCollection.updateMany({}, { $unset: { latitude: '', longitude: '' } });

    console.log('Removed latitude and longitude fields from locations collection');
  },

  // Revert the migration (add back empty fields)
  async down(db, _client) {
    const locationsCollection = db.collection('locations');

    // To revert, we add back the fields with null values
    // This doesn't restore the original values, but adds the fields back
    await locationsCollection.updateMany(
      { latitude: { $exists: false } },
      { $set: { latitude: null } }
    );

    await locationsCollection.updateMany(
      { longitude: { $exists: false } },
      { $set: { longitude: null } }
    );

    console.log('Added back latitude and longitude fields to locations collection');
  },
};
