import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors } from '@/constants/theme';
import { Wifi, WifiOff } from 'lucide-react-native';

interface NetworkStatusBarProps {
  showWhenConnected?: boolean;
}

const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ 
  showWhenConnected = false 
}) => {
  const { isConnected, checkConnection } = useNetworkStatus();

  // If connected and we don't want to show when connected, return null
  if (isConnected && !showWhenConnected) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: isConnected ? colors.success : colors.error }
    ]}>
      {isConnected ? (
        <Wifi size={16} color="white" />
      ) : (
        <WifiOff size={16} color="white" />
      )}
      <Text style={styles.text}>
        {isConnected ? 'Connected' : 'No internet connection'}
      </Text>
      {!isConnected && (
        <TouchableOpacity onPress={checkConnection} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    width: '100%',
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  retryButton: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NetworkStatusBar;