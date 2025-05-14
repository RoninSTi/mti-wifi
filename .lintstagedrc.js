module.exports = {
  // Run prettier on all supported files
  '**/*.{js,jsx,ts,tsx,json,css,scss,md}': ['prettier --write'],

  // Run ESLint on JavaScript and TypeScript files
  '**/*.{js,jsx,ts,tsx}': ['eslint --fix'],

  // Run TypeScript compiler check on TypeScript files
  '**/*.{ts,tsx}': () => 'tsc --noEmit',
};
