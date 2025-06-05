/**
 * Migration to ensure no uniqueness constraints on sensors collection.
 */
module.exports = {
  async up(_db, _client) {
    // No actions - the model has already been updated
    // This migration serves as a marker that the model has changed
    console.log('Sensor model updated to remove all uniqueness constraints');
  },

  async down(_db, _client) {
    // No actions needed - we don't want to revert this change
  },
};
