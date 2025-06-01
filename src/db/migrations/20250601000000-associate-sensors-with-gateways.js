/**
 * Migration to associate existing sensors with gateways
 *
 * This migration will:
 * 1. Find all sensors that don't have a gateway association
 * 2. For each sensor, find a gateway in the same location as the sensor's equipment
 * 3. Associate the sensor with that gateway
 */

module.exports = {
  async up(db, client) {
    console.log('Starting sensor-gateway association migration...');

    // Get all sensors that don't have a gateway associated
    const sensorsWithoutGateway = await db
      .collection('sensors')
      .find({
        $or: [{ gateway: { $exists: false } }, { gateway: null }],
      })
      .toArray();

    console.log(`Found ${sensorsWithoutGateway.length} sensors without gateway associations`);

    let updatedCount = 0;

    for (const sensor of sensorsWithoutGateway) {
      try {
        // Get the equipment for this sensor
        const equipment = await db.collection('equipment').findOne({
          _id: sensor.equipment,
        });

        if (!equipment) {
          console.log(`Equipment not found for sensor ${sensor._id}`);
          continue;
        }

        // Get the area for this equipment
        const area = await db.collection('areas').findOne({
          _id: equipment.area,
        });

        if (!area) {
          console.log(`Area not found for equipment ${equipment._id}`);
          continue;
        }

        // Find a gateway in the same location as this area
        const gateway = await db.collection('gateways').findOne({
          location: area.location,
        });

        if (!gateway) {
          console.log(`No gateway found for location ${area.location}`);
          continue;
        }

        // Associate the sensor with the gateway
        await db
          .collection('sensors')
          .updateOne({ _id: sensor._id }, { $set: { gateway: gateway._id } });

        updatedCount++;
        console.log(`Associated sensor ${sensor._id} with gateway ${gateway._id}`);
      } catch (error) {
        console.error(`Error processing sensor ${sensor._id}:`, error);
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} sensors with gateway associations.`);
  },

  async down(db, client) {
    console.log('Rolling back sensor-gateway associations...');

    // Remove all gateway associations from sensors
    const result = await db
      .collection('sensors')
      .updateMany({ gateway: { $exists: true } }, { $unset: { gateway: '' } });

    console.log(`Removed gateway associations from ${result.modifiedCount} sensors`);
  },
};
