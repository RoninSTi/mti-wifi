/**
 * Migration to remove the uniqueness constraint from sensor names within equipment
 */
module.exports = {
  async up(db, _client) {
    try {
      // Get all indexes to check if our target exists
      const indexes = await db.collection('sensors').listIndexes().toArray();
      const hasNameEquipmentIndex = indexes.some(
        index => index.key && index.key.name === 1 && index.key.equipment === 1
      );

      // If the index exists, drop it
      if (hasNameEquipmentIndex) {
        await db.collection('sensors').dropIndex('name_1_equipment_1');
      }
    } catch (error) {
      console.log('No existing index found or error dropping index:', error.message);
    }

    // Create a new non-unique index
    await db.collection('sensors').createIndex({ name: 1, equipment: 1 }, { background: true });
  },

  async down(db, _client) {
    try {
      // Drop the non-unique index if it exists
      await db.collection('sensors').dropIndex('name_1_equipment_1');
    } catch (error) {
      console.log('Error dropping index:', error.message);
    }

    // Recreate the unique index
    await db
      .collection('sensors')
      .createIndex({ name: 1, equipment: 1 }, { unique: true, background: true });
  },
};
