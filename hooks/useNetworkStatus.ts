import { useState, useEffect } from 'react';
import { isOnline } from '@/utils/api';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * Hook to monitor network connectivity status
 * @returns Object containing online status and a refresh function
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);

  // Function to check connection status
  const checkConnection = async () => {
    if (isCheckingConnection) return;
    
    setIsCheckingConnection(true);
    try {
      const online = await isOnline();
      setIsConnected(online);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up app state change listener
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnection();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up interval for periodic checks (every 30 seconds)
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  return {
    isConnected,
    isCheckingConnection,
    checkConnection
  };
}