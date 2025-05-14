# Testing the OpenTelemetry Setup

This guide will help you verify that the OpenTelemetry integration is working properly.

## Starting the Development Environment

1. Start the complete development environment:

```bash
npm run dev:full
```

This command will:
- Start the MongoDB container
- Start the OpenTelemetry Collector container
- Start the Jaeger container
- Run database migrations
- Start the Next.js development server

## Testing the OpenTelemetry Integration

### Using the Test Endpoint

A test endpoint has been created at `/api/test-telemetry` that demonstrates OpenTelemetry instrumentation. This endpoint:

- Creates custom spans
- Adds custom attributes
- Simulates database operations
- Occasionally generates random errors (20% of requests) to demonstrate error tracing

To test it:

1. Open your browser or use curl to send requests to the endpoint:

```bash
curl http://localhost:3000/api/test-telemetry
```

2. Make several requests to generate a mix of successful and error traces

### Viewing Traces in Jaeger

1. Open the Jaeger UI in your browser:

```
http://localhost:16686
```

2. In the Jaeger UI:
   - Select "nextjs-starter" from the Service dropdown
   - Click "Find Traces" to see the traces from your application
   - Explore the traces to see the span hierarchy, attributes, and errors

3. Look for traces with the operation name "GET /api/test-telemetry" and examine:
   - Span hierarchy (parent-child relationships)
   - Custom attributes
   - Database operation spans
   - Error information (for failed requests)

## Testing Real API Endpoints

Once you've verified the test endpoint works, try accessing your real API endpoints:

```bash
# Examples (adjust based on your actual API endpoints)
curl http://localhost:3000/api/auth/register
curl http://localhost:3000/api/users
```

Then check Jaeger UI to see traces for these endpoints.

## Troubleshooting

If you don't see traces in Jaeger:

1. Check that all Docker containers are running:

```bash
docker ps
```

2. Check the OpenTelemetry Collector logs:

```bash
docker logs otel-collector
```

3. Check the Jaeger logs:

```bash
docker logs jaeger
```

4. Make sure your application is correctly configured to send telemetry data to the collector:
   - Verify `.env.local` has the correct OpenTelemetry settings
   - Check that the OpenTelemetry collector is accessible from your app

5. Restart the development environment:

```bash
npm run dev:stop
npm run dev:full
```

## Extending Telemetry

To add custom spans to your API routes or services:

```typescript
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';

// For API routes
export async function GET(request: NextRequest) {
  return await createApiSpan('your-endpoint.get', async () => {
    // Your API logic here
    // ...
    
    return NextResponse.json({ /* your response */ });
  });
}

// For database operations
const users = await createDatabaseSpan('find', 'users', async () => {
  return await User.find();
});
```