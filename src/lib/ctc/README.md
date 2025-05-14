# CTC Connect Wireless API Service

This service provides an interface to the Connection Technology Center wireless sensor solution via WebSocket communication.

## Features

- WebSocket connection management
- Send commands to the CTC API
- Process return commands
- Subscribe to notification events
- TypeScript support with full type definitions

## Installation

The service is already integrated with the project. No additional installation steps are required.

## Basic Usage

```typescript
import { ctcApiService } from '@/lib/ctc/ctcApiService';

// Connect to the CTC WebSocket API
await ctcApiService.connect('ws://your-api-endpoint:port');

// Subscribe to notifications
await ctcApiService.subscribeToChanges();

// Get all connected sensors
const sensors = await ctcApiService.getConnectedDynamicSensors();
console.log('Connected sensors:', sensors);

// Disconnect when done
ctcApiService.disconnect();
```

## API Reference

### Connection Management

```typescript
// Connect to the WebSocket server
await ctcApiService.connect('ws://your-api-endpoint:port');

// Disconnect from the WebSocket server
ctcApiService.disconnect();
```

### Event Handling

```typescript
// Listen for sensor connection changes
ctcApiService.on('sensorConnectionChange', (data) => {
  console.log('Sensor connection changed:', data);
});

// Listen for vibration readings
ctcApiService.on('vibrationReading', (data) => {
  console.log('Vibration reading received:', data);
});

// Listen for temperature readings
ctcApiService.on('temperatureReading', (data) => {
  console.log('Temperature reading received:', data);
});

// Listen for battery readings
ctcApiService.on('batteryReading', (data) => {
  console.log('Battery reading received:', data);
});

// Listen for errors
ctcApiService.on('error', (error) => {
  console.error('Error from CTC API:', error);
});

// Remove event listeners when no longer needed
ctcApiService.off('vibrationReading', myHandler);
```

### Sensor Management

```typescript
// Get all sensors
const allSensors = await ctcApiService.getDynamicSensors();

// Get specific sensors by serial numbers
const specificSensors = await ctcApiService.getDynamicSensors([123456, 789012]);

// Get only connected sensors
const connectedSensors = await ctcApiService.getConnectedDynamicSensors();
```

### Sensor Readings

```typescript
// Trigger a vibration reading (result comes via event handler)
await ctcApiService.takeDynamicVibrationReading(123456);

// Trigger a temperature reading (result comes via event handler)
await ctcApiService.takeDynamicTemperatureReading(123456);

// Trigger a battery reading (result comes via event handler)
await ctcApiService.takeDynamicBatteryReading(123456);
```

### Historical Data

```typescript
// Get vibration history
const vibrationHistory = await ctcApiService.getDynamicVibrationRecords({
  serials: [123456], // Optional: specific serial numbers
  start: '2025-05-01', // Optional: start date
  end: '2025-05-14', // Optional: end date
  max: 50 // Optional: maximum records to return (default: 25)
});

// Get temperature history
const temperatureHistory = await ctcApiService.getDynamicTemperatureRecords({
  serials: [123456],
  start: '2025-05-01',
  end: '2025-05-14',
  max: 50
});

// Get battery level history
const batteryHistory = await ctcApiService.getDynamicBatteryRecords({
  serials: [123456],
  start: '2025-05-01',
  end: '2025-05-14',
  max: 50
});
```

## Example: Real-time Sensor Dashboard

```typescript
import { useEffect, useState } from 'react';
import { ctcApiService } from '@/lib/ctc/ctcApiService';

export default function SensorDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [readings, setReadings] = useState({});
  
  useEffect(() => {
    // Connect to the CTC API
    async function connectToApi() {
      const connected = await ctcApiService.connect('ws://your-api-endpoint:port');
      if (connected) {
        setIsConnected(true);
        await ctcApiService.subscribeToChanges();
        const sensorData = await ctcApiService.getConnectedDynamicSensors();
        setSensors(Object.values(sensorData));
      }
    }
    
    // Set up event listeners
    function setupListeners() {
      ctcApiService.on('vibrationReading', (data) => {
        setReadings(prev => ({
          ...prev,
          [data.Serial]: {
            ...prev[data.Serial],
            vibration: {
              x: data.X,
              y: data.Y,
              z: data.Z,
              time: data.Time
            }
          }
        }));
      });
      
      ctcApiService.on('temperatureReading', (data) => {
        setReadings(prev => ({
          ...prev,
          [data.Serial]: {
            ...prev[data.Serial],
            temperature: {
              value: data.Temp,
              time: data.Time
            }
          }
        }));
      });
      
      ctcApiService.on('batteryReading', (data) => {
        setReadings(prev => ({
          ...prev,
          [data.Serial]: {
            ...prev[data.Serial],
            battery: {
              level: data.Batt,
              time: data.Time
            }
          }
        }));
      });
      
      ctcApiService.on('sensorConnectionChange', (data) => {
        if (data.Connected) {
          setSensors(prev => [...prev.filter(s => s.Serial !== data.Serial), data]);
        } else {
          setSensors(prev => prev.map(s => 
            s.Serial === data.Serial ? { ...s, Connected: 0 } : s
          ));
        }
      });
    }
    
    connectToApi();
    setupListeners();
    
    // Clean up on unmount
    return () => {
      ctcApiService.unsubscribeFromChanges().catch(console.error);
      ctcApiService.disconnect();
    };
  }, []);
  
  // Trigger a vibration reading for a sensor
  const triggerVibrationReading = async (serial) => {
    await ctcApiService.takeDynamicVibrationReading(serial);
  };
  
  return (
    <div>
      <h1>Sensor Dashboard</h1>
      <div className="connection-status">
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      <div className="sensors-list">
        <h2>Connected Sensors</h2>
        {sensors.map(sensor => (
          <div key={sensor.Serial} className="sensor-card">
            <h3>Sensor {sensor.Serial}</h3>
            <p>Connected: {sensor.Connected ? 'Yes' : 'No'}</p>
            <p>Part Number: {sensor.PartNum}</p>
            
            <div className="readings">
              {readings[sensor.Serial]?.vibration && (
                <div className="reading-card">
                  <h4>Vibration</h4>
                  <p>X: {readings[sensor.Serial].vibration.x}</p>
                  <p>Y: {readings[sensor.Serial].vibration.y}</p>
                  <p>Z: {readings[sensor.Serial].vibration.z}</p>
                  <p>Time: {readings[sensor.Serial].vibration.time}</p>
                </div>
              )}
              
              {readings[sensor.Serial]?.temperature && (
                <div className="reading-card">
                  <h4>Temperature</h4>
                  <p>Value: {readings[sensor.Serial].temperature.value}</p>
                  <p>Time: {readings[sensor.Serial].temperature.time}</p>
                </div>
              )}
              
              {readings[sensor.Serial]?.battery && (
                <div className="reading-card">
                  <h4>Battery</h4>
                  <p>Level: {readings[sensor.Serial].battery.level}%</p>
                  <p>Time: {readings[sensor.Serial].battery.time}</p>
                </div>
              )}
            </div>
            
            <div className="actions">
              <button onClick={() => triggerVibrationReading(sensor.Serial)}>
                Take Vibration Reading
              </button>
              <button onClick={() => ctcApiService.takeDynamicTemperatureReading(sensor.Serial)}>
                Take Temperature Reading
              </button>
              <button onClick={() => ctcApiService.takeDynamicBatteryReading(sensor.Serial)}>
                Take Battery Reading
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Notes

- All API commands correspond to the CTC Connect Wireless API documentation
- The service handles WebSocket connection management, message parsing, and event handling
- For real-time data, subscribe to the appropriate events after connecting
- Always disconnect from the WebSocket when finished to free up resources