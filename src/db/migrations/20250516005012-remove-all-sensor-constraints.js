/**
 * Migration to mark removal of sensor uniqueness constraints
 */
module.exports = {
  async up(_db, _client) {
    // No-op migration to mark a change in the schema
    console.log('Model updated: Sensors no longer have uniqueness constraints');
  },

  async down(_db, _client) {
    // No-op - we don't want to revert this change
  },
};
