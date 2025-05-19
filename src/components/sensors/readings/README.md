# Sensor Readings Components

This directory contains components for displaying and interacting with sensor readings from the CTC Gateway.

## SensorReadingsPanel

A component that displays the most recent readings for a specific sensor and provides buttons to trigger new readings.

### Usage

```tsx
import { SensorReadingsPanel } from '@/components/sensors/readings';

// In your component:
function EquipmentDetail({ params }) {
  const { equipmentId } = params;
  const { data: equipment } = useEquipment(equipmentId);
  
  // If equipment has a gateway and sensor:
  if (equipment?.gateway && equipment?.sensor) {
    return (
      <div>
        <h1>{equipment.name}</h1>
        <SensorReadingsPanel 
          gatewayId={equipment.gateway.id} 
          sensorSerial={equipment.sensor.serial} 
        />
      </div>
    );
  }
  
  return <div>No gateway or sensor configured</div>;
}
```

### Features

- Displays the connection status of the sensor
- Shows the most recent battery, temperature, and vibration readings
- Provides buttons to:
  - Check sensor connection
  - Request a new battery reading
  - Request a new temperature reading
  - Request a new vibration reading
- Automatically updates when new readings are received
- Displays friendly timestamps for readings
- Shows loading states during requests
- Provides toast notifications for request statuses

### Props

| Prop | Type | Description |
|------|------|-------------|
| `gatewayId` | `string` | The ID of the gateway to connect to |
| `sensorSerial` | `number` | The serial number of the sensor to display readings for |

### Implementation Notes

- Uses the `useGatewayConnection` hook to communicate with the gateway
- Readings are automatically requested for temperature and battery when a sensor connects
- The component will automatically update when new readings are received through the WebSocket connection
- Vibration readings are not automatic as they may be more resource-intensive