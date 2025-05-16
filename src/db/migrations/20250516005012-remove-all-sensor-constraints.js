/**
 * Migration to mark removal of sensor uniqueness constraints
 */
module.exports = {
  async up(db, client) {
    // No-op migration to mark a change in the schema
    console.log('Model updated: Sensors no longer have uniqueness constraints');
  },

  async down(db, client) {
    // No-op - we don't want to revert this change
  },
};
