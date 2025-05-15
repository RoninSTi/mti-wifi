/**
 * Migration: Add Organization Models
 *
 * This migration creates collections and indexes for the organization hierarchy:
 * Organization -> Location -> Area -> Equipment -> Sensor
 */

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, _client) {
    // Create collections for each model
    const organizationsColl = db.collection('organizations');
    const locationsColl = db.collection('locations');
    const areasColl = db.collection('areas');
    const equipmentColl = db.collection('equipment');
    const sensorsColl = db.collection('sensors');

    // Create indexes for Organization collection
    await organizationsColl.createIndex(
      { name: 1 },
      {
        unique: true,
        background: true,
        name: 'organization_name_unique',
      }
    );

    await organizationsColl.createIndex(
      { contactEmail: 1 },
      {
        background: true,
        sparse: true,
        name: 'organization_email_index',
      }
    );

    // Create indexes for Location collection
    await locationsColl.createIndex(
      { name: 1, organization: 1 },
      {
        unique: true,
        background: true,
        name: 'location_name_org_unique',
      }
    );

    await locationsColl.createIndex(
      { organization: 1 },
      {
        background: true,
        name: 'location_organization_index',
      }
    );

    // Optional geospatial index if coordinates are used
    await locationsColl.createIndex(
      { latitude: 1, longitude: 1 },
      {
        background: true,
        sparse: true,
        name: 'location_coordinates_index',
      }
    );

    // Create indexes for Area collection
    await areasColl.createIndex(
      { name: 1, location: 1 },
      {
        unique: true,
        background: true,
        name: 'area_name_location_unique',
      }
    );

    await areasColl.createIndex(
      { location: 1 },
      {
        background: true,
        name: 'area_location_index',
      }
    );

    await areasColl.createIndex(
      { areaType: 1 },
      {
        background: true,
        sparse: true,
        name: 'area_type_index',
      }
    );

    // Create indexes for Equipment collection
    await equipmentColl.createIndex(
      { name: 1, area: 1 },
      {
        unique: true,
        background: true,
        name: 'equipment_name_area_unique',
      }
    );

    await equipmentColl.createIndex(
      { area: 1 },
      {
        background: true,
        name: 'equipment_area_index',
      }
    );

    await equipmentColl.createIndex(
      { equipmentType: 1 },
      {
        background: true,
        name: 'equipment_type_index',
      }
    );

    await equipmentColl.createIndex(
      { status: 1 },
      {
        background: true,
        name: 'equipment_status_index',
      }
    );

    await equipmentColl.createIndex(
      { criticalityLevel: 1 },
      {
        background: true,
        name: 'equipment_criticality_index',
      }
    );

    // Create indexes for Sensor collection
    await sensorsColl.createIndex(
      { name: 1, equipment: 1 },
      {
        unique: true,
        background: true,
        name: 'sensor_name_equipment_unique',
      }
    );

    await sensorsColl.createIndex(
      { equipment: 1 },
      {
        background: true,
        name: 'sensor_equipment_index',
      }
    );

    await sensorsColl.createIndex(
      { serial: 1 },
      {
        unique: true,
        background: true,
        name: 'sensor_serial_unique',
      }
    );

    await sensorsColl.createIndex(
      { status: 1 },
      {
        background: true,
        name: 'sensor_status_index',
      }
    );

    await sensorsColl.createIndex(
      { connected: 1 },
      {
        background: true,
        name: 'sensor_connected_index',
      }
    );

    console.log('Created organization hierarchy collections and indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, _client) {
    // Drop collections in reverse order to respect dependencies
    await db
      .collection('sensors')
      .drop()
      .catch(err => {
        if (err.codeName !== 'NamespaceNotFound') throw err;
      });

    await db
      .collection('equipment')
      .drop()
      .catch(err => {
        if (err.codeName !== 'NamespaceNotFound') throw err;
      });

    await db
      .collection('areas')
      .drop()
      .catch(err => {
        if (err.codeName !== 'NamespaceNotFound') throw err;
      });

    await db
      .collection('locations')
      .drop()
      .catch(err => {
        if (err.codeName !== 'NamespaceNotFound') throw err;
      });

    await db
      .collection('organizations')
      .drop()
      .catch(err => {
        if (err.codeName !== 'NamespaceNotFound') throw err;
      });

    console.log('Dropped organization hierarchy collections');
  },
};
