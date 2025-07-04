import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView, TextInput, Animated, Keyboard, Platform } from 'react-native';
import { FAB, Text, Button } from 'react-native-paper';
import { useInventoryStore } from '@/store/inventoryStore';
import InventorySlot from '@/components/InventorySlot';
import { colors } from '@/constants/theme';
import { validateBarcode } from '@/utils/barcodeValidation';
import { getScannerDelay } from '@/utils/scannerUtils';
import { X } from 'lucide-react-native';

export default function InventoryScreen() {
  const { slots, initializeSlots, setSelectedSlot, clearSlot, markAsEmpty, updateSlot, markAsSoldOut } = useInventoryStore();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannerDelay, setScannerDelay] = useState(500);
  
  const inputRef = useRef<TextInput>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fabRef = useRef<any>(null);
  
  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize slots if they don't exist
    if (slots.length === 0) {
      initializeSlots();
    }
    
    // Load scanner delay setting
    const loadSettings = async () => {
      try {
        const delay = await getScannerDelay();
        setScannerDelay(delay);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
    
    // Clean up timeouts on unmount
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, [initializeSlots, slots.length]);

  const handleSlotPress = (id: number) => {
    setSelectedSlotId(id);
    setSelectedSlot(id);
    enterScanMode();
  };

  const enterScanMode = () => {
    setScanMode(true);
    setScanInput('');
    setError(null);
    
    // Animate the slots up and scan input in
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Focus the input after animation completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (Platform.OS === 'web') {
            setTimeout(() => Keyboard.dismiss(), 50);
          }
        }
      }, 100);
    });
  };

  const exitScanMode = () => {
    // Clear any pending auto-submit
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    
    // Animate the slots down and scan input out
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setScanMode(false);
      setSelectedSlotId(null);
      setSelectedSlot(null);
      setScanInput('');
      setError(null);
    });
  };

  const handleScanInputChange = (text: string) => {
    // Store the raw input without any processing
    setScanInput(text);
    
    // Clear any existing auto-submit timeout
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    
    // Auto-submit if input contains a return character
    if (text.includes('\n') || text.includes('\r')) {
      // Use the configured delay to ensure the full input is captured
      autoSubmitTimeoutRef.current = setTimeout(() => {
        handleSubmitScan();
      }, scannerDelay);
    }
  };

  /**
   * Find the next available slot that needs processing
   * A slot needs processing if:
   * 1. It has no barcode (null) AND is not marked as empty ("00000000000000")
   * 2. It has a pending status
   * 
   * Skip slots that:
   * 1. Have a valid barcode entry (status === 'scanned')
   * 2. Have been explicitly marked as empty (barcode === "00000000000000")
   */
  const findNextAvailableSlot = () => {
    // First, check if there are any slots with pending status
    const pendingSlot = slots.find(slot => 
      slot.status === 'pending'
    );
    
    if (pendingSlot) return pendingSlot.id;
    
    // Next, find slots that have no barcode and are not marked as empty
    const unprocessedSlot = slots.find(slot => 
      slot.barcode === null && 
      slot.status === 'empty'
    );
    
    if (unprocessedSlot) return unprocessedSlot.id;
    
    // If all slots are processed (have barcodes or are marked empty),
    // find the first slot that's not scanned (could be marked empty)
    const nonScannedSlot = slots.find(slot => 
      slot.status !== 'scanned'
    );
    
    if (nonScannedSlot) return nonScannedSlot.id;
    
    // If all slots are scanned, just use the first slot
    return 1;
  };

  /**
   * Trigger the FAB programmatically to navigate to the next slot
   * This function is called:
   * 1. After a successful barcode scan
   * 2. After marking a slot as empty
   * 3. When the FAB button is pressed manually
   */
  const triggerFabForNextSlot = () => {
    // Find the next slot to scan
    const nextSlotId = findNextAvailableSlot();
    
    // Set a timeout to allow the UI to update before triggering the next scan
    setTimeout(() => {
      setSelectedSlotId(nextSlotId);
      setSelectedSlot(nextSlotId);
      enterScanMode();
    }, 500); // 500ms delay before showing the next scan input
  };

  const handleSubmitScan = () => {
    // Clear any pending auto-submit
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    
    if (!selectedSlotId) {
      setError('No slot selected');
      return;
    }

    // Extract only numeric characters from the input
    const numericOnly = scanInput.replace(/[^0-9]/g, '');
    
    // Basic validation
    if (!numericOnly) {
      setError('No numeric data detected in scan');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (Platform.OS === 'web') {
            setTimeout(() => Keyboard.dismiss(), 50);
          }
        }
      }, 100);
      return;
    }
    
    if (numericOnly.length < 14) {
      setError(`Barcode too short: ${numericOnly.length}/14 digits minimum required`);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (Platform.OS === 'web') {
            setTimeout(() => Keyboard.dismiss(), 50);
          }
        }
      }, 100);
      return;
    }
    
    // Now validate the barcode against business rules
    const validationResult = validateBarcode(numericOnly, selectedSlotId);
    
    if (!validationResult.isValid) {
      if (validationResult.requiresConfirmation && validationResult.previousGamepack) {
        // Mark previous pack as sold out and add new pack
        markAsSoldOut(selectedSlotId);
        
        // Use the numeric-only barcode
        updateSlot(selectedSlotId, numericOnly);
        
        // Exit scan mode and trigger next scan
        exitScanMode();
        triggerFabForNextSlot();
      } else {
        // Regular validation error
        setError(validationResult.message || 'Invalid barcode');
        // Refocus input after showing error
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            if (Platform.OS === 'web') {
              setTimeout(() => Keyboard.dismiss(), 50);
            }
          }
        }, 100);
      }
      return;
    }

    // Use the numeric-only barcode
    updateSlot(selectedSlotId, numericOnly);
    
    // Exit scan mode and trigger next scan
    exitScanMode();
    triggerFabForNextSlot();
  };

  const handleClearInput = () => {
    setScanInput('');
    setError(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (Platform.OS === 'web') {
          setTimeout(() => Keyboard.dismiss(), 50);
        }
      }
    }, 100);
  };

  /**
   * Handle marking a slot as empty
   * This function:
   * 1. Marks the slot as empty with the special barcode
   * 2. Exits scan mode
   * 3. Triggers navigation to the next slot
   */
  const handleMarkEmpty = () => {
    if (selectedSlotId) {
      markAsEmpty(selectedSlotId);
      exitScanMode();
      // Also trigger next scan after marking empty
      triggerFabForNextSlot();
    }
  };

  /**
   * Handle clearing a slot from the list
   * This function:
   * 1. Clears the slot data
   * 2. If in scan mode, exits scan mode
   * 3. Triggers navigation to the next slot
   */
  const handleClearSlot = (id: number) => {
    clearSlot(id);
    // After clearing a slot, check if we should trigger the next slot
    if (scanMode) {
      exitScanMode();
    }
    // Find and trigger the next slot that needs attention
    setTimeout(() => triggerFabForNextSlot(), 300);
  };

  /**
   * Handle marking a slot as empty from the list
   * This function:
   * 1. Marks the slot as empty
   * 2. If in scan mode, exits scan mode
   * 3. Triggers navigation to the next slot
   */
  const handleMarkEmptyFromList = (id: number) => {
    markAsEmpty(id);
    // After marking a slot as empty, check if we should trigger the next slot
    if (scanMode) {
      exitScanMode();
    }
    // Find and trigger the next slot that needs attention
    setTimeout(() => triggerFabForNextSlot(), 300);
  };

  // Calculate transform values for animations
  const slotsTransform = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -200], // Slide up by 200 units
        }),
      },
    ],
  };

  const scannerOpacity = {
    opacity: fadeAnimation,
    transform: [
      {
        translateY: fadeAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0], // Slide up from below
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.slotsContainer, slotsTransform]}>
        <FlatList
          data={slots}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <InventorySlot
              slot={item}
              onPress={handleSlotPress}
              onClear={handleClearSlot}
              onMarkEmpty={handleMarkEmptyFromList}
              hideActions={scanMode}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      </Animated.View>
      
      {scanMode && (
        <Animated.View style={[styles.scannerContainer, scannerOpacity]}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>
              Scan Barcode for <Text style={styles.highlightedSlot}>SLOT {selectedSlotId}</Text>
            </Text>
            <Button
              icon={({ size, color }) => <X size={size} color={color} />}
              onPress={exitScanMode}
              style={styles.closeButton}
            />
          </View>
          
          <TextInput
            ref={inputRef}
            style={styles.scannerInput}
            value={scanInput}
            onChangeText={handleScanInputChange}
            placeholder="Scan or enter barcode"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSubmitScan}
            returnKeyType="done"
            showSoftInputOnFocus={Platform.OS === 'web' ? false : true}
            caretHidden={Platform.OS === 'web'}
            onFocus={() => {
              if (Platform.OS === 'web') {
                setTimeout(() => Keyboard.dismiss(), 50);
              }
            }}
            multiline={true}
            numberOfLines={3}
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {/* Simple debug info showing numeric extraction */}
          {scanInput ? (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                Numeric data: {scanInput.replace(/[^0-9]/g, '')}
              </Text>
              <Text style={styles.debugText}>
                Length: {scanInput.replace(/[^0-9]/g, '').length} digits
              </Text>
            </View>
          ) : null}
          
          <View style={styles.scannerButtons}>
            <Button
              mode="outlined"
              onPress={handleClearInput}
              style={styles.scannerButton}
              icon="refresh"
            >
              Clear
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitScan}
              style={styles.scannerButton}
              disabled={!scanInput.trim()}
            >
              Submit
            </Button>
            <Button
              mode="contained"
              onPress={handleMarkEmpty}
              style={styles.scannerButton}
              buttonColor={colors.warning}
              icon="tray-remove"
            >
              Empty
            </Button>
          </View>
        </Animated.View>
      )}
      
      <View style={styles.fabContainer}>
        <FAB
          ref={fabRef}
          style={styles.fab}
          icon="plus"
          onPress={() => {
            // Find the next slot that needs attention
            const nextSlotId = findNextAvailableSlot();
            
            setSelectedSlotId(nextSlotId);
            setSelectedSlot(nextSlotId);
            enterScanMode();
          }}
          color="white"
          label="Scan New Ticket"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slotsContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 80, // Extra padding for FAB
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  fab: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  highlightedSlot: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
  scannerInput: {
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
  debugText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'Courier New',
    color: '#666',
  },
  scannerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scannerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});