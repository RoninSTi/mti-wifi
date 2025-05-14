/**
 * OpenTelemetry configuration for the application
 *
 * This sets up the OpenTelemetry SDK with appropriate exporters, resources, and
 * instrumentations for API monitoring.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
// Import with a namespace to avoid type/value confusion
import * as otelResources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'; // Uncomment when metrics are implemented
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from '@opentelemetry/core';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

// Store the SDK instance globally for shutdown
let otelSDK: NodeSDK | undefined;

// Get environment variables
const OTEL_COLLECTOR_URL = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'nextjs-starter';
const ENV = process.env.NODE_ENV || 'development';

// Create resource that identifies your service
const resourceAttributes = {
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: ENV,
};

// Use the helper function to create a resource
const resource = otelResources.resourceFromAttributes(resourceAttributes);

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${OTEL_COLLECTOR_URL}/v1/traces`,
  headers: {},
});

// Configure metrics exporter - commented out until needed
// const metricExporter = new OTLPMetricExporter({
//   url: `${OTEL_COLLECTOR_URL}/v1/metrics`,
//   headers: {},
// });

// Configure context manager to maintain trace context
const contextManager = new AsyncHooksContextManager();

// Configure propagator to work with W3C specifications
const propagator = new CompositePropagator({
  propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
});

// Configure instrumentation for various libraries and frameworks
const instrumentations = [
  new HttpInstrumentation({
    ignoreIncomingRequestHook: request => {
      const url = request.url || '';
      return url.includes('/api/health') || url.includes('/_next/static');
    },
  }),
  new ExpressInstrumentation(),
  new MongoDBInstrumentation({
    enhancedDatabaseReporting: true,
  }),
  new FetchInstrumentation({
    ignoreUrls: [/\/api\/health/],
  }),
  ...getNodeAutoInstrumentations({
    // Only enable select instrumentations to avoid overhead
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: true },
    '@opentelemetry/instrumentation-net': { enabled: true },
  }),
];

/**
 * Start the OpenTelemetry SDK
 */
export function startOpenTelemetry() {
  // Only initialize once
  if (otelSDK) {
    console.log('⚠️ OpenTelemetry SDK already initialized');
    return;
  }

  console.log('🔭 Initializing OpenTelemetry...');

  try {
    // Create and configure the SDK
    otelSDK = new NodeSDK({
      resource,
      traceExporter,
      // Use proper configuration keys
      // The SDK expects metrics exporter to be passed to metricReader
      spanProcessors: [],
      contextManager,
      textMapPropagator: propagator,
      instrumentations,
    });

    // Start the SDK
    otelSDK.start();
    console.log('✅ OpenTelemetry SDK started successfully');
  } catch (error) {
    console.error('❌ Error starting OpenTelemetry SDK:', error);
  }
}

/**
 * Shut down the OpenTelemetry SDK
 */
export async function shutdownOpenTelemetry() {
  if (!otelSDK) {
    return;
  }

  try {
    // Shutdown the SDK and export any pending data
    await otelSDK.shutdown();
    console.log('✅ OpenTelemetry SDK shut down successfully');
    otelSDK = undefined;
  } catch (error) {
    console.error('❌ Error shutting down OpenTelemetry SDK:', error);
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', () => {
  shutdownOpenTelemetry()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

process.on('SIGINT', () => {
  shutdownOpenTelemetry()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
