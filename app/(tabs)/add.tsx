import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Keyboard, TextInput as RNTextInput, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { useInventoryStore } from '@/store/inventoryStore';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { validateBarcode } from '@/utils/barcodeValidation';
import { getScannerDelay, analyzeRawBarcode, extractBarcodeIdentifier } from '@/utils/scannerUtils';

export default function AddScreen() {
  const [barcode, setBarcode] = useState('');
  const [slotNumber, setSlotNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannerDelay, setScannerDelay] = useState(500);
  const { slots, updateSlot, markAsSoldOut } = useInventoryStore();
  const barcodeInputRef = useRef<RNTextInput>(null);
  const slotInputRef = useRef<RNTextInput>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeBufferRef = useRef<string>('');

  // Load scanner delay setting
  useEffect(() => {
    const loadScannerDelay = async () => {
      const delay = await getScannerDelay();
      setScannerDelay(delay);
    };
    
    loadScannerDelay();
  }, []);

  // Focus management for inputs
  useEffect(() => {
    // Set up a timer to focus the slot input after component mounts
    const timer = setTimeout(() => {
      if (slotInputRef.current) {
        slotInputRef.current.focus();
        // Hide keyboard immediately after focus on web
        if (Platform.OS === 'web') {
          setTimeout(() => Keyboard.dismiss(), 50);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Handle barcode changes with buffer approach
  const handleBarcodeChange = (text: string) => {
    // Store the raw input
    setBarcode(text);
    
    // Add to buffer for complete capture
    barcodeBufferRef.current += text;
    
    // Clear any existing auto-submit timeout
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    
    // Get cleaned barcode from buffer
    const analysis = analyzeRawBarcode(barcodeBufferRef.current);
    
    // Auto-submit if barcode contains a return character or reaches sufficient length
    if (
      barcodeBufferRef.current.includes('\n') || 
      barcodeBufferRef.current.includes('\r') || 
      analysis.cleanedLength >= 24 || // Auto-submit on complete barcode
      barcodeBufferRef.current.length >= 30 // Safety limit for buffer
    ) {
      // Use the configured delay to ensure the full barcode is captured
      autoSubmitTimeoutRef.current = setTimeout(() => {
        handleSubmit();
      }, scannerDelay);
    }
  };

  // Focus the barcode input when slot is selected
  const handleSlotChange = (text: string) => {
    setSlotNumber(text);
    
    // If a valid slot number is entered, focus the barcode input
    if (/^([1-9]|1[0-9]|20)$/.test(text)) {
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
          // Hide keyboard immediately after focus on web
          if (Platform.OS === 'web') {
            setTimeout(() => Keyboard.dismiss(), 50);
          }
        }
      }, 100);
    }
  };

  const handleSubmit = () => {
    // Clear any pending auto-submit
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    
    setError(null);
    
    if (!barcodeBufferRef.current.trim()) {
      setError('Please enter a barcode');
      return;
    }

    // Process the barcode from buffer
    const analysis = analyzeRawBarcode(barcodeBufferRef.current);
    const cleanedBarcode = analysis.cleanedBarcode;
    
    // Validate barcode format
    if (cleanedBarcode.length < 14) {
      setError(`Barcode too short: ${cleanedBarcode.length}/14 digits minimum required`);
      return;
    }
    
    // Warn if barcode might be incomplete (expecting 24 digits)
    if (cleanedBarcode.length < 24 && cleanedBarcode.length >= 14) {
      // Show warning but allow submission
      Alert.alert(
        'Incomplete Barcode',
        `Detected ${cleanedBarcode.length} digits, but expected 24. Continue anyway?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setError('Scan canceled. Please try again for complete barcode.');
              // Refocus barcode input
              setTimeout(() => {
                if (barcodeInputRef.current) {
                  barcodeInputRef.current.focus();
                  if (Platform.OS === 'web') {
                    setTimeout(() => Keyboard.dismiss(), 50);
                  }
                }
              }, 100);
              // Reset buffer
              barcodeBufferRef.current = '';
              setBarcode('');
            }
          },
          {
            text: 'Continue',
            onPress: () => {
              // Proceed with validation and submission
              validateAndSubmit(cleanedBarcode);
            }
          }
        ]
      );
      return;
    }
    
    // If we have a complete barcode, proceed with validation
    validateAndSubmit(cleanedBarcode);
  };
  
  // Separate function for validation and submission logic
  const validateAndSubmit = (cleanedBarcode: string) => {
    const slotId = parseInt(slotNumber, 10);
    
    if (isNaN(slotId) || slotId < 1 || slotId > 20) {
      setError('Please enter a valid slot number (1-20)');
      return;
    }

    // Validate the barcode
    const validationResult = validateBarcode(cleanedBarcode, slotId);
    
    if (!validationResult.isValid) {
      if (validationResult.requiresConfirmation && validationResult.previousGamepack) {
        // Need confirmation about previous pack being sold out
        Alert.alert(
          'Confirm Previous Pack Status',
          validationResult.message || `Was the previous pack sold out?`,
          [
            {
              text: 'No',
              style: 'cancel',
              onPress: () => {
                setError('Previous pack must be sold out before adding a new pack');
                // Refocus barcode input
                setTimeout(() => {
                  if (barcodeInputRef.current) {
                    barcodeInputRef.current.focus();
                    if (Platform.OS === 'web') {
                      setTimeout(() => Keyboard.dismiss(), 50);
                    }
                  }
                }, 300);
                // Reset buffer
                barcodeBufferRef.current = '';
                setBarcode('');
              }
            },
            {
              text: 'Yes',
              onPress: () => {
                // Mark previous pack as sold out and add new pack
                markAsSoldOut(slotId);
                
                // Use the full barcode without truncation
                updateSlot(slotId, cleanedBarcode);
                
                // Reset form
                setBarcode('');
                setSlotNumber('');
                barcodeBufferRef.current = '';
                
                // Navigate back to inventory
                router.push('/(tabs)');
              }
            }
          ]
        );
        return;
      } else {
        // Regular validation error
        setError(validationResult.message || 'Invalid barcode');
        // Refocus barcode input
        setTimeout(() => {
          if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
            if (Platform.OS === 'web') {
              setTimeout(() => Keyboard.dismiss(), 50);
            }
          }
        }, 100);
        // Reset buffer
        barcodeBufferRef.current = '';
        setBarcode('');
        return;
      }
    }

    // Use the full barcode without truncation
    updateSlot(slotId, cleanedBarcode);
    
    // Reset form
    setBarcode('');
    setSlotNumber('');
    barcodeBufferRef.current = '';
    
    // Navigate back to inventory
    router.push('/(tabs)');
  };

  // Function to clear the buffer and reset the input
  const handleClearInput = () => {
    barcodeBufferRef.current = '';
    setBarcode('');
    setError(null);
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
        if (Platform.OS === 'web') {
          setTimeout(() => Keyboard.dismiss(), 50);
        }
      }
    }, 100);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Add New Ticket Pack</Text>
          
          <TextInput
            ref={slotInputRef}
            label="Slot Number (1-20)"
            value={slotNumber}
            onChangeText={handleSlotChange}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            showSoftInputOnFocus={Platform.OS === 'web' ? false : true}
            caretHidden={Platform.OS === 'web'}
            onFocus={() => {
              if (Platform.OS === 'web') {
                setTimeout(() => Keyboard.dismiss(), 50);
              }
            }}
          />
          
          <TextInput
            ref={barcodeInputRef}
            label="Barcode"
            value={barcode}
            onChangeText={handleBarcodeChange}
            keyboardType="default" // Changed to default to capture all characters
            style={styles.input}
            mode="outlined"
            placeholder="Scan or enter barcode"
            showSoftInputOnFocus={Platform.OS === 'web' ? false : true}
            caretHidden={Platform.OS === 'web'}
            onFocus={() => {
              if (Platform.OS === 'web') {
                setTimeout(() => Keyboard.dismiss(), 50);
              }
            }}
            multiline={true} // Allow multiline input to better capture return characters
            numberOfLines={3} // Provide space for multiline input
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={handleClearInput}
              style={styles.clearButton}
              icon="refresh"
            >
              Clear
            </Button>
            
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              Add Ticket Pack
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Available Slots</Text>
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <Card
                key={slot.id}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor:
                      slot.status === 'empty'
                        ? colors.success
                        : slot.status === 'pending'
                        ? colors.warning
                        : colors.disabled,
                  },
                ]}
                onPress={() => {
                  setSlotNumber(slot.id.toString());
                  // Focus barcode input after selecting slot
                  setTimeout(() => {
                    if (barcodeInputRef.current) {
                      barcodeInputRef.current.focus();
                      if (Platform.OS === 'web') {
                        setTimeout(() => Keyboard.dismiss(), 50);
                      }
                    }
                  }, 100);
                }}
              >
                <Text style={styles.slotText}>{slot.id}</Text>
              </Card>
            ))}
          </View>
          <Text style={styles.legend}>
            <Text style={{ color: colors.success }}>■</Text> Available | 
            <Text style={{ color: colors.warning }}>■</Text> Pending | 
            <Text style={{ color: colors.disabled }}>■</Text> Filled
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
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotCard: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotText: {
    color: 'white',
    fontWeight: 'bold',
  },
  legend: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
});