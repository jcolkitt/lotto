/**
 * API utility functions for handling network requests
 */

// Default timeout for fetch requests (in milliseconds)
const DEFAULT_TIMEOUT = 10000;

/**
 * Enhanced fetch function with timeout and error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds
 * @returns Promise with the fetch response
 */
export const fetchWithTimeout = async (
  url: string, 
  options: RequestInit = {}, 
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> => {
  // Create an abort controller for the timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Add the signal to the options
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    // Handle network errors gracefully
    if (error.message && error.message.includes('fetch failed')) {
      throw new Error('Network connection error. Please check your internet connection.');
    }
    
    throw error;
  }
};

/**
 * GET request with JSON response
 * @param url The URL to fetch
 * @param options Additional fetch options
 * @returns Promise with the parsed JSON data
 */
export const getJSON = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  return response.json() as Promise<T>;
};

/**
 * POST request with JSON body and response
 * @param url The URL to post to
 * @param data The data to send
 * @param options Additional fetch options
 * @returns Promise with the parsed JSON response
 */
export const postJSON = async <T, R>(url: string, data: T, options: RequestInit = {}): Promise<R> => {
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  });
  
  return response.json() as Promise<R>;
};

/**
 * Check if the device is online
 * @returns Promise<boolean> indicating online status
 */
export const isOnline = async (): Promise<boolean> => {
  try {
    // Try to fetch a small resource to check connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
      mode: 'no-cors',
      // Short timeout for quick check
      signal: AbortSignal.timeout(3000)
    });
    return true;
  } catch (error) {
    return false;
  }
};