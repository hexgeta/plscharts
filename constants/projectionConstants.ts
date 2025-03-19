// Constants for regression calculations
export const LINEAR_SLOPE_MULTIPLIER = 1;    // Range: 0.1 to 10 - Higher values create steeper linear trends
export const EXPONENTIAL_CURVE_INTENSITY = 1; // Range: 0.1 to 2 - Higher values create more aggressive exponential curves

// Sine wave parameters
export const SINE_AMPLITUDE = 0.8;     // Range: 0.1 to 2 - Controls wave height (peak-to-trough distance)
export const SINE_FREQUENCY = 0.01;    // Range: 0.001 to 0.1 - Controls wave length (lower = longer waves)
export const SINE_PHASE = 4.7;         // Range: 0 to 2π (≈6.28) - Shifts waves left/right by radians
export const SINE_OFFSET = 0.15;       // Range: -1 to 1 - Moves entire sine curve up/down

// End-of-stake dampening parameters
export const DAMPENING_FACTOR = 0.003; // Range: 0.0001 to 0.01 - How quickly waves flatten (lower = more gradual)
export const END_DAMPENING_START = 5000; // Range: 4000 to 5400 - Day to start reducing wave amplitude

// Day range constants
export const START_DAY = 881;
export const END_DAY = 5555; 