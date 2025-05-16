/**
 * Migration to ensure no uniqueness constraints on sensors collection.
 */
module.exports = {
  async up(db, client) {
    // No actions - the model has already been updated
    // This migration serves as a marker that the model has changed
    console.log('Sensor model updated to remove all uniqueness constraints');
  },

  async down(db, client) {
    // No actions needed - we don't want to revert this change
  },
};
