declare module 'fft-js' {
  interface FFTMethods {
    fft(input: number[]): [number, number][];
    ifft(input: [number, number][]): [number, number][];
  }

  const fft: FFTMethods;
  export = fft;
}
