import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Scanner utility functions for handling barcode scanning
 */

// Default scanner delay in milliseconds
const DEFAULT_SCANNER_DELAY = 500;

/**
 * Get the configured scanner delay
 * @returns Promise with the scanner delay in milliseconds
 */
export const getScannerDelay = async (): Promise<number> => {
  try {
    const savedDelay = await AsyncStorage.getItem('scanner_delay');
    return savedDelay ? parseInt(savedDelay, 10) : DEFAULT_SCANNER_DELAY;
  } catch (error) {
    console.error('Error getting scanner delay:', error);
    return DEFAULT_SCANNER_DELAY;
  }
};

/**
 * Set the scanner delay
 * @param delay The delay in milliseconds
 * @returns Promise that resolves when the delay is saved
 */
export const setScannerDelay = async (delay: number): Promise<void> => {
  try {
    await AsyncStorage.setItem('scanner_delay', delay.toString());
  } catch (error) {
    console.error('Error setting scanner delay:', error);
    throw error;
  }
};

/**
 * Process a barcode input with the configured delay
 * @param barcode The barcode to process
 * @param callback The function to call with the processed barcode
 */
export const processBarcode = async (
  barcode: string,
  callback: (processedBarcode: string) => void
): Promise<void> => {
  // Get the configured delay
  const delay = await getScannerDelay();
  
  // Clean the barcode (remove any non-numeric characters)
  const cleanedBarcode = barcode.replace(/[^0-9]/g, '');
  
  // If the barcode is empty, don't process it
  if (!cleanedBarcode) {
    return;
  }
  
  // Wait for the configured delay to ensure all digits are captured
  setTimeout(() => {
    callback(cleanedBarcode);
  }, delay);
};

/**
 * Validate a barcode
 * @param barcode The barcode to validate
 * @returns Object with validation result
 */
export const validateBarcodeFormat = (barcode: string): { 
  isValid: boolean; 
  message?: string;
  isComplete?: boolean;
} => {
  // Basic validation
  if (!barcode.trim()) {
    return { isValid: false, message: 'Barcode is empty' };
  }

  // Clean the barcode (remove any non-numeric characters)
  const cleanedBarcode = barcode.replace(/[^0-9]/g, '');

  // Check if barcode contains only numbers after cleaning
  if (cleanedBarcode.length === 0) {
    return { isValid: false, message: 'Barcode must contain numbers' };
  }

  // Check if barcode is complete (at least 14 digits)
  if (cleanedBarcode.length < 14) {
    return { 
      isValid: true, 
      isComplete: false,
      message: `Barcode may be incomplete (${cleanedBarcode.length}/14 digits minimum)`
    };
  }
  
  // Check if barcode might be incomplete (expecting 24 digits)
  if (cleanedBarcode.length < 24) {
    return {
      isValid: true,
      isComplete: false,
      message: `Barcode may be incomplete (${cleanedBarcode.length}/24 digits expected)`
    };
  }

  // Barcode is valid and complete
  return { isValid: true, isComplete: true };
};

/**
 * Analyze a raw barcode input for debugging
 * @param rawInput The raw input from the scanner
 * @returns Object with analysis results
 */
export const analyzeRawBarcode = (rawInput: string): {
  rawLength: number;
  cleanedBarcode: string;
  cleanedLength: number;
  charCodes: number[];
  controlChars: {code: number, position: number}[];
} => {
  const cleanedBarcode = rawInput.replace(/[^0-9]/g, '');
  const charCodes = Array.from(rawInput).map(c => c.charCodeAt(0));
  
  // Identify control characters
  const controlChars = Array.from(rawInput).map((c, i) => ({
    code: c.charCodeAt(0),
    position: i
  })).filter(c => c.code < 32 || c.code === 127);
  
  return {
    rawLength: rawInput.length,
    cleanedBarcode,
    cleanedLength: cleanedBarcode.length,
    charCodes,
    controlChars
  };
};

/**
 * Extract the relevant 14-digit barcode from a complete scan
 * This function implements the specific extraction logic:
 * 1. From the total scan input, focus on the final 24 digits
 * 2. Within those 24 digits, extract only positions 1-14
 * 3. Discard the last 10 digits of the 24-digit sequence
 * 
 * @param rawInput The complete raw scanner input
 * @returns The extracted 14-digit barcode
 */
export const extractBarcodeIdentifier = (rawInput: string): string => {
  // Step 1: Clean the input to get only digits
  const allDigits = rawInput.replace(/[^0-9]/g, '');
  
  // Step 2: If we have at least 24 digits, extract the final 24
  if (allDigits.length >= 24) {
    const last24Digits = allDigits.slice(-24);
    
    // Step 3: From the 24 digits, take only the first 14 (positions 0-13)
    return last24Digits.substring(0, 14);
  } 
  
  // If we don't have 24 digits, return as many as we have up to 14
  return allDigits.length > 14 ? allDigits.slice(-14) : allDigits;
};