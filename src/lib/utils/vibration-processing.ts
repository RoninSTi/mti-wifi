import { z } from 'zod';
// Dynamic import for FFT library to avoid module resolution issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FFT: any;

// Zod schemas for validation
export const vibrationDataPointSchema = z.object({
  time: z.number(),
  value: z.number(),
});

export const vibrationWaveformSchema = z.object({
  data: z.array(vibrationDataPointSchema),
  sampleRate: z.number().positive(),
  unit: z.enum(['g', 'm/s', 'm/s²', 'm']),
  label: z.string(),
});

export const fftResultSchema = z.object({
  frequencies: z.array(z.number()),
  magnitudes: z.array(z.number()),
  unit: z.string(),
  label: z.string(),
});

export const integrationOptionsSchema = z.object({
  method: z.enum(['trapezoidal', 'simpson']).default('trapezoidal'),
  initialValue: z.number().default(0),
});

// Type inference
export type VibrationDataPoint = z.infer<typeof vibrationDataPointSchema>;
export type VibrationWaveform = z.infer<typeof vibrationWaveformSchema>;
export type FFTResult = z.infer<typeof fftResultSchema>;
export type IntegrationOptions = z.infer<typeof integrationOptionsSchema>;

/**
 * Numerical integration using trapezoidal rule
 */
function trapezoidalIntegration(
  data: VibrationDataPoint[],
  initialValue: number = 0
): VibrationDataPoint[] {
  if (data.length < 2) return data;

  const result: VibrationDataPoint[] = [{ time: data[0].time, value: initialValue }];

  for (let i = 1; i < data.length; i++) {
    const dt = data[i].time - data[i - 1].time;
    const avgValue = (data[i].value + data[i - 1].value) / 2;
    const integral = result[i - 1].value + avgValue * dt;

    result.push({
      time: data[i].time,
      value: integral,
    });
  }

  return result;
}

/**
 * Numerical integration using Simpson's rule (more accurate)
 */
function simpsonIntegration(
  data: VibrationDataPoint[],
  initialValue: number = 0
): VibrationDataPoint[] {
  if (data.length < 3) {
    return trapezoidalIntegration(data, initialValue);
  }

  const result: VibrationDataPoint[] = [{ time: data[0].time, value: initialValue }];

  // Use trapezoidal for first step
  const dt1 = data[1].time - data[0].time;
  const integral1 = initialValue + ((data[0].value + data[1].value) / 2) * dt1;
  result.push({ time: data[1].time, value: integral1 });

  // Use Simpson's rule for remaining points
  for (let i = 2; i < data.length; i++) {
    const h = (data[i].time - data[i - 2].time) / 2;
    const simpsonValue = ((data[i - 2].value + 4 * data[i - 1].value + data[i].value) * h) / 3;
    const integral = result[i - 2].value + simpsonValue;

    result.push({
      time: data[i].time,
      value: integral,
    });
  }

  return result;
}

/**
 * Numerical differentiation using finite differences
 */
function finiteDifferentiation(data: VibrationDataPoint[]): VibrationDataPoint[] {
  if (data.length < 2) return data;

  const result: VibrationDataPoint[] = [];

  // Forward difference for first point
  const dt0 = data[1].time - data[0].time;
  const derivative0 = (data[1].value - data[0].value) / dt0;
  result.push({ time: data[0].time, value: derivative0 });

  // Central difference for middle points
  for (let i = 1; i < data.length - 1; i++) {
    const dt = data[i + 1].time - data[i - 1].time;
    const derivative = (data[i + 1].value - data[i - 1].value) / dt;
    result.push({ time: data[i].time, value: derivative });
  }

  // Backward difference for last point
  const dtLast = data[data.length - 1].time - data[data.length - 2].time;
  const derivativeLast = (data[data.length - 1].value - data[data.length - 2].value) / dtLast;
  result.push({ time: data[data.length - 1].time, value: derivativeLast });

  return result;
}

/**
 * Differentiate displacement to velocity or velocity to acceleration
 */
export function differentiateWaveform(waveform: VibrationWaveform): VibrationWaveform {
  const validatedWaveform = vibrationWaveformSchema.parse(waveform);

  const differentiatedData = finiteDifferentiation(validatedWaveform.data);

  // Determine new unit and label
  let newUnit: 'g' | 'm/s' | 'm/s²' | 'm';
  let newLabel: string;

  switch (validatedWaveform.unit) {
    case 'm':
      newUnit = 'm/s';
      newLabel = validatedWaveform.label.replace(/displacement/i, 'velocity');
      break;
    case 'm/s':
      newUnit = 'm/s²';
      newLabel = validatedWaveform.label.replace(/velocity/i, 'acceleration');
      break;
    default:
      throw new Error(`Cannot differentiate from unit: ${validatedWaveform.unit}`);
  }

  return {
    data: differentiatedData,
    sampleRate: validatedWaveform.sampleRate,
    unit: newUnit,
    label: newLabel,
  };
}

/**
 * Integrate acceleration to velocity or velocity to displacement
 */
export function integrateWaveform(
  waveform: VibrationWaveform,
  options: Partial<IntegrationOptions> = {}
): VibrationWaveform {
  const validatedWaveform = vibrationWaveformSchema.parse(waveform);
  const validatedOptions = integrationOptionsSchema.parse(options);

  const integratedData =
    validatedOptions.method === 'simpson'
      ? simpsonIntegration(validatedWaveform.data, validatedOptions.initialValue)
      : trapezoidalIntegration(validatedWaveform.data, validatedOptions.initialValue);

  // Determine new unit and label
  let newUnit: 'g' | 'm/s' | 'm/s²' | 'm';
  let newLabel: string;

  switch (validatedWaveform.unit) {
    case 'g':
    case 'm/s²':
      newUnit = 'm/s';
      newLabel = validatedWaveform.label.replace(/acceleration/i, 'velocity');
      break;
    case 'm/s':
      newUnit = 'm';
      newLabel = validatedWaveform.label.replace(/velocity/i, 'displacement');
      break;
    default:
      throw new Error(`Cannot integrate from unit: ${validatedWaveform.unit}`);
  }

  return {
    data: integratedData,
    sampleRate: validatedWaveform.sampleRate,
    unit: newUnit,
    label: newLabel,
  };
}

/**
 * Perform FFT on waveform data
 */
export async function performFFT(waveform: VibrationWaveform): Promise<FFTResult> {
  // Load FFT library dynamically if not already loaded
  if (!FFT) {
    FFT = await import('fft-js');
  }
  const validatedWaveform = vibrationWaveformSchema.parse(waveform);

  if (validatedWaveform.data.length === 0) {
    throw new Error('Cannot perform FFT on empty data');
  }

  // Extract just the values for FFT
  const values = validatedWaveform.data.map(point => point.value);

  // Pad to nearest power of 2 for efficiency
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(values.length)));
  const paddedValues = [...values];
  while (paddedValues.length < nextPowerOf2) {
    paddedValues.push(0);
  }

  // Perform FFT
  const phasors = FFT.fft(paddedValues);

  // Calculate frequencies and magnitudes
  const frequencies: number[] = [];
  const magnitudes: number[] = [];

  const freqResolution = validatedWaveform.sampleRate / paddedValues.length;

  // Only take first half (positive frequencies)
  for (let i = 0; i < paddedValues.length / 2; i++) {
    frequencies.push(i * freqResolution);

    // Calculate magnitude from complex number [real, imaginary]
    const real = phasors[i][0];
    const imag = phasors[i][1];
    const magnitude = Math.sqrt(real * real + imag * imag);
    magnitudes.push(magnitude);
  }

  return {
    frequencies,
    magnitudes,
    unit: `${validatedWaveform.unit}/Hz`,
    label: `${validatedWaveform.label} (FFT)`,
  };
}

/**
 * Convert G-force to m/s²
 */
export function gToMeterPerSecondSquared(gValue: number): number {
  return gValue * 9.80665;
}

/**
 * Convert raw vibration readings to waveform format
 */
export function vibrationArrayToWaveform(
  values: number[],
  sampleRate: number,
  axis: 'X' | 'Y' | 'Z',
  unit: 'g' | 'm/s²' = 'g'
): VibrationWaveform {
  const data: VibrationDataPoint[] = values.map((value, index) => ({
    time: index / sampleRate,
    value: unit === 'g' ? value : gToMeterPerSecondSquared(value),
  }));

  return {
    data,
    sampleRate,
    unit: unit === 'g' ? 'g' : 'm/s²',
    label: `${axis}-axis acceleration`,
  };
}
