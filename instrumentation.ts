/**
 * Next.js instrumentation file for OpenTelemetry
 *
 * This file is loaded by Next.js at startup to enable OpenTelemetry instrumentation.
 * It uses the Next.js instrumentation hook to initialize OpenTelemetry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only register instrumentation in server environment
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startOpenTelemetry } = await import('./src/telemetry');
      startOpenTelemetry();
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
    }
  }
}
