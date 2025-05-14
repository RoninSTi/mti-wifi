'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Simple dashboard for telemetry visualization
 *
 * This is a client-side component that embeds Jaeger UI in an iframe
 * and provides buttons to generate test data.
 */
export default function TelemetryDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);

  // Function to send test request
  const sendTestRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/test-telemetry');
      const data = await res.json();

      setResponse(data);
    } catch (err) {
      setError('Error occurred while testing telemetry');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Function to send multiple test requests
  const sendMultipleRequests = async (count: number) => {
    setLoading(true);
    setError(null);

    try {
      // Send requests in parallel
      const promises = Array(count)
        .fill(0)
        .map(() => fetch('/api/test-telemetry').then(res => res.json()));

      const results = await Promise.allSettled(promises);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      setResponse({
        totalRequests: count,
        succeeded,
        failed,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError('Error occurred while sending multiple requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">OpenTelemetry Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Test Telemetry</h2>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => sendTestRequest()}
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Send Test Request
            </button>

            <button
              onClick={() => sendMultipleRequests(10)}
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Send 10 Requests
            </button>

            <button
              onClick={() => sendMultipleRequests(50)}
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Send 50 Requests
            </button>
          </div>

          {loading && <p className="text-muted-foreground">Loading...</p>}

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">{error}</div>
          )}

          {response && (
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-[300px]">
              <pre className="text-sm">{JSON.stringify(response, null, 2)}</pre>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              These buttons will generate telemetry data by sending requests to the test endpoint.
              Approximately 20% of requests will generate errors to demonstrate error tracing.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Jaeger UI</h2>

          <p className="mb-4">
            The Jaeger UI should be running at{' '}
            <a
              href="http://localhost:16686"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              http://localhost:16686
            </a>
          </p>

          <div className="border rounded-md overflow-hidden">
            <iframe
              src="http://localhost:16686"
              className="w-full h-[400px] border-0"
              title="Jaeger UI"
            />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Note: The iframe may not load Jaeger UI due to browser security settings. If it
            doesn&apos;t appear, please open Jaeger UI directly in a new tab.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">How to Use OpenTelemetry</h2>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            OpenTelemetry is set up to automatically trace all API endpoints and database
            operations. You can also add custom spans and attributes to your code:
          </p>

          <pre className="bg-muted p-4 rounded-md overflow-auto">
            {`import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';

// For API routes
export async function GET(request: NextRequest) {
  return await createApiSpan('your-endpoint.get', async () => {
    // Your API logic here
    
    // Add custom attributes
    addSpanAttributes({ 'custom.key': 'value' });
    
    return NextResponse.json({ /* your response */ });
  });
}`}
          </pre>

          <p>
            For more details, see the{' '}
            <Link href="/OTEL-TESTING.md" className="text-primary hover:underline">
              OpenTelemetry testing guide
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
