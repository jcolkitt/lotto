import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import { Card, Text, Button, List, Divider } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [scannerDelay, setScannerDelay] = useState(500);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedDelay = await AsyncStorage.getItem('scanner_delay');
        if (savedDelay) {
          setScannerDelay(parseInt(savedDelay, 10));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('scanner_delay', scannerDelay.toString());
      Alert.alert('Settings Saved', 'Your scanner settings have been saved.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  // Update scanner delay
  const handleDelayChange = (value: number) => {
    setScannerDelay(value);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Scanner Settings" />
        <Card.Content>
          <Text style={styles.label}>Scanner Input Delay: {scannerDelay}ms</Text>
          <View style={styles.sliderContainer}>
            <Text>100ms</Text>
            <View style={styles.slider}>
              {/* Simple slider implementation since react-native-paper doesn't have a Slider component */}
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill, 
                    { width: `${((scannerDelay - 100) / 900) * 100}%` }
                  ]} 
                />
              </View>
              <View style={styles.buttonRow}>
                {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(value => (
                  <Button 
                    key={value}
                    mode={scannerDelay === value ? "contained" : "outlined"}
                    onPress={() => handleDelayChange(value)}
                    style={styles.delayButton}
                    labelStyle={styles.delayButtonLabel}
                    disabled={isLoading}
                  >
                    {value}
                  </Button>
                ))}
              </View>
            </View>
            <Text>1000ms</Text>
          </View>
          <Text style={styles.description}>
            Adjust this value if you're experiencing dropped digits during scanning.
            Higher values give more time for all digits to be captured but make scanning feel slower.
          </Text>
          
          <Button 
            mode="contained" 
            onPress={saveSettings}
            style={styles.button}
            disabled={isLoading}
          >
            Save Settings
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Scanner Configuration Guide" />
        <Card.Content>
          <Text style={styles.intro}>
            For optimal performance with the Eyoyo EY-040 scanner, please configure the following settings:
          </Text>
          
          <List.Section>
            <List.Subheader>Recommended Settings</List.Subheader>
            <List.Item 
              title="Transfer Speed" 
              description="Set to 'Very Low' or 'Low'" 
              left={props => <List.Icon {...props} icon="speedometer-slow" />}
            />
            <List.Item 
              title="Scan Mode" 
              description="Set to 'Single Scan' mode (not continuous)" 
              left={props => <List.Icon {...props} icon="barcode-scan" />}
            />
            <List.Item 
              title="Suffix Setting" 
              description="Add Enter/Return suffix (if available)" 
              left={props => <List.Icon {...props} icon="keyboard-return" />}
            />
            <List.Item 
              title="Prefix/Suffix Delay" 
              description="If available, set to 50-100ms" 
              left={props => <List.Icon {...props} icon="timer-outline" />}
            />
          </List.Section>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Troubleshooting Tips</Text>
          
          <List.Section>
            <List.Item 
              title="Scan Slowly" 
              description="Allow a brief pause between scans" 
            />
            <List.Item 
              title="Clean Scanner" 
              description="Ensure scanner lens is clean and free of debris" 
            />
            <List.Item 
              title="Proper Distance" 
              description="Hold scanner 4-8 inches from barcode" 
            />
            <List.Item 
              title="Verify Barcodes" 
              description="Use the Scanner Test tool to verify complete capture" 
            />
          </List.Section>
          
          <Text style={styles.note}>
            Note: If you continue to experience dropped digits, try scanning more slowly or consider using a different scanner model.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginVertical: 8,
  },
  sliderFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  delayButton: {
    margin: 2,
    padding: 0,
    minWidth: 0,
  },
  delayButtonLabel: {
    fontSize: 10,
    margin: 0,
    padding: 0,
  },
  description: {
    marginTop: 8,
    marginBottom: 16,
    color: '#666',
  },
  button: {
    marginTop: 16,
    backgroundColor: colors.primary,
  },
  intro: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  note: {
    marginTop: 16,
    fontStyle: 'italic',
    color: colors.warning,
  },
});