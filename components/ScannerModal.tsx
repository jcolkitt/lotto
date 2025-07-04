import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, Platform, Alert, Keyboard, AppState } from 'react-native';
import { Modal, Portal, Button, Text, Divider } from 'react-native-paper';
import { useInventoryStore } from '@/store/inventoryStore';
import { colors } from '@/constants/theme';
import { validateBarcode } from '@/utils/barcodeValidation';
import { getScannerDelay } from '@/utils/scannerUtils';

interface ScannerModalProps {
  visible: boolean;
  onDismiss: () => void;
  slotId: number | null;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ visible, onDismiss, slotId }) => {
  // Single state for raw input
  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannerDelay, setScannerDelay] = useState(500);
  
  const { updateSlot, markAsSoldOut, markAsEmpty } = useInventoryStore();
  const inputRef = useRef<TextInput>(null);
  const appState = useRef(AppState.currentState);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load scanner delay setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const delay = await getScannerDelay();
        setScannerDelay(delay);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Function to focus the input field
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      
      // On web, we need to keep the focus but hide the keyboard
      if (Platform.OS === 'web') {
        // Small delay to ensure focus happens before dismissing keyboard
        setTimeout(() => {
          Keyboard.dismiss();
        }, 50);
      }
    }
  };

  // Reset state and focus input when modal opens
  useEffect(() => {
    if (visible) {
      setRawInput('');
      setError(null);
      
      // Clear any existing timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
      
      // Set a timeout to focus the input after modal animation completes
      focusTimeoutRef.current = setTimeout(() => {
        focusInput();
      }, 300);
      
      // Set up app state change listener to refocus when app comes to foreground
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) && 
          nextAppState === 'active' &&
          visible
        ) {
          // App has come to the foreground and modal is visible
          focusInput();
        }
        appState.current = nextAppState;
      });
      
      return () => {
        // Clean up timeout and subscription
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
        if (autoSubmitTimeoutRef.current) {
          clearTimeout(autoSubmitTimeoutRef.current);
        }
        subscription.remove();
      };
    }
  }, [visible]);

  // Handle input changes with minimal processing
  const handleInputChange = (text: string) => {
    // Store the raw input without any processing
    setRawInput(text);
    
    // Clear any existing auto-submit timeout
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    
    // Auto-submit if input contains a return character
    if (text.includes('\n') || text.includes('\r')) {
      // Use the configured delay to ensure the full input is captured
      autoSubmitTimeoutRef.current = setTimeout(() => {
        handleSubmit();
      }, scannerDelay);
    }
  };

  const handleSubmit = () => {
    // Clear any pending auto-submit
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    
    if (!slotId) {
      setError('No slot selected');
      return;
    }

    // Extract only numeric characters from the input
    const numericOnly = rawInput.replace(/[^0-9]/g, '');
    
    // Basic validation
    if (!numericOnly) {
      setError('No numeric data detected in scan');
      setTimeout(focusInput, 100);
      return;
    }
    
    if (numericOnly.length < 14) {
      setError(`Barcode too short: ${numericOnly.length}/14 digits minimum required`);
      setTimeout(focusInput, 100);
      return;
    }
    
    // Now validate the barcode against business rules
    const validationResult = validateBarcode(numericOnly, slotId);
    
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
                // Refocus input after alert is dismissed
                setTimeout(focusInput, 300);
              }
            },
            {
              text: 'Yes',
              onPress: () => {
                // Mark previous pack as sold out and add new pack
                markAsSoldOut(slotId);
                
                // Use the numeric-only barcode
                updateSlot(slotId, numericOnly);
                onDismiss();
              }
            }
          ]
        );
        return;
      } else {
        // Regular validation error
        setError(validationResult.message || 'Invalid barcode');
        // Refocus input after showing error
        setTimeout(focusInput, 100);
        return;
      }
    }

    // Use the numeric-only barcode
    updateSlot(slotId, numericOnly);
    onDismiss();
  };

  const handleMarkAsEmpty = () => {
    if (!slotId) {
      setError('No slot selected');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Mark Slot as Empty',
      `Are you sure you want to mark Slot ${slotId} as empty?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // User cancelled, refocus input
            setTimeout(focusInput, 300);
          }
        },
        {
          text: 'Yes, Mark Empty',
          onPress: () => {
            try {
              // Call the markAsEmpty function from the store
              markAsEmpty(slotId);
              
              // Close the modal
              onDismiss();
            } catch (error) {
              console.error('Error marking slot as empty:', error);
              setError('Failed to mark slot as empty. Please try again.');
              // Refocus input after error
              setTimeout(focusInput, 300);
            }
          }
        }
      ]
    );
  };

  // Function to clear the input
  const handleClearInput = () => {
    setRawInput('');
    setError(null);
    setTimeout(focusInput, 100);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>Scan Barcode</Text>
        {slotId ? (
          <View style={styles.slotBadge}>
            <Text style={styles.slotText}>SLOT {slotId}</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Select a slot first</Text>
        )}
        
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={rawInput}
          onChangeText={handleInputChange}
          placeholder="Scan or enter barcode"
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          showSoftInputOnFocus={Platform.OS === 'web' ? false : true}
          caretHidden={Platform.OS === 'web'}
          onFocus={() => {
            if (Platform.OS === 'web') {
              setTimeout(() => Keyboard.dismiss(), 50);
            }
          }}
          autoFocus={false}
          multiline={true}
          numberOfLines={3}
        />
        
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        {/* Debug info showing numeric extraction */}
        {rawInput ? (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Scan Info:</Text>
            <Text style={styles.debugText}>
              Numeric data: {rawInput.replace(/[^0-9]/g, '')}
            </Text>
            <Text style={styles.debugText}>
              Length: {rawInput.replace(/[^0-9]/g, '').length} digits
            </Text>
          </View>
        ) : null}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            disabled={!rawInput.trim()}
          >
            Submit
          </Button>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleClearInput}
            style={styles.button}
            icon="refresh"
          >
            Clear Input
          </Button>
          <Button
            mode="contained"
            onPress={handleMarkAsEmpty}
            style={styles.button}
            icon="tray-remove"
            buttonColor={colors.warning}
          >
            Mark Empty
          </Button>
        </View>
        
        <Text style={styles.helpText}>
          Use the scanner to capture barcode data
        </Text>
        
        {/* Hidden button to help maintain focus on web */}
        {Platform.OS === 'web' && (
          <Button
            onPress={focusInput}
            style={styles.hiddenButton}
          >
            Refocus
          </Button>
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  slotBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  slotText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
  },
  errorText: {
    color: colors.error,
    marginBottom: 16,
  },
  debugContainer: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 12,
  },
  debugText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'Courier New',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  hiddenButton: {
    height: 0,
    width: 0,
    opacity: 0,
    position: 'absolute',
  },
});

export default ScannerModal;