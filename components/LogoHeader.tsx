import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Ticket } from 'lucide-react-native';

const LogoHeader = () => {
  return (
    <View style={styles.container}>
      <Ticket size={24} color="white" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.umText}>UM</Text>
        <Text style={styles.trackerText}>ScratchTracker</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  umText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 4,
  },
  trackerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
});

export default LogoHeader;