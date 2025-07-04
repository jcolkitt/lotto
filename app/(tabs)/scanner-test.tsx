import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, ScrollView, Platform, Keyboard } from 'react-native';
import { Card, Text, Button, Divider, Chip } from 'react-native-paper';
import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeRawBarcode, extractBarcodeIdentifier } from '@/utils/scannerUtils';

export default function ScannerTestScreen() {
  const [input, setInput] = useState('');
  const [lastScan, setLastScan] = useState('');
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [scannerDelay, setScannerDelay] = useState(500);
  const [debugInfo, setDebugInfo] = useState<{
    rawLength: number;
    cleanedLength: number;
    charCodes: number[];
  } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const inputBufferRef = useRef<string>('');
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load scanner delay setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedDelay = await AsyncStorage.getItem('scanner_delay');
        if (savedDelay) {
          setScannerDelay(parseInt(savedDelay, 10));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);
  
  useEffect(() => {
    // Focus the input field when component mounts
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
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
  
  const handleInputChange = (text: string) => {
    setInput(text);
    
    // Add to buffer for complete capture
    inputBufferRef.current += text;
    
    // Analyze the input
    const analysis = analyzeRawBarcode(inputBufferRef.current);
    setDebugInfo({
      rawLength: analysis.rawLength,
      cleanedLength: analysis.cleanedLength,
      charCodes: analysis.charCodes
    });
    
    // Clear any existing auto-submit timeout
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    
    // Auto-submit if input ends with a return character or reaches sufficient length
    if (
      inputBufferRef.current.includes('\n') || 
      inputBufferRef.current.includes('\r') || 
      analysis.cleanedLength >= 24 || // Auto-submit on complete barcode
      inputBufferRef.current.length >= 30 // Safety limit for buffer
    ) {
      // Use the configured delay to ensure all digits are captured
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
    
    // Process the barcode from buffer
    const analysis = analyzeRawBarcode(inputBufferRef.current);
    const cleanedInput = analysis.cleanedBarcode;
    
    if (cleanedInput.length > 0) {
      setLastScan(cleanedInput);
      setScanHistory(prev => [cleanedInput, ...prev].slice(0, 10));
    }
    
    // Clear the input field and buffer
    setInput('');
    inputBufferRef.current = '';
    
    // Refocus the input field
    focusInput();
  };
  
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (Platform.OS === 'web') {
        setTimeout(() => Keyboard.dismiss(), 50);
      }
    }
  };
  
  const clearHistory = () => {
    setScanHistory([]);
    setLastScan('');
    setDebugInfo(null);
  };
  
  // Function to display non-printable characters in a readable format
  const formatRawInput = (input: string) => {
    return Array.from(input).map(char => {
      const code = char.charCodeAt(0);
      if (code < 32 || code === 127) {
        // Return a visual representation of control characters
        return `[${code}]`;
      }
      return char;
    }).join('');
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Scanner Test Tool" />
        <Card.Content>
          <Text style={styles.instructions}>
            Scan a barcode to test your scanner. This tool will help identify if digits are being dropped.
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={handleInputChange}
              placeholder="Scan barcode here"
              keyboardType="default" // Changed to default to capture all characters
              autoCapitalize="none"
              autoCorrect={false}
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
          </View>
          
          <View style={styles.buttonRow}>
            <Button 
              mode="contained" 
              onPress={() => handleSubmit()}
              style={styles.button}
              disabled={!inputBufferRef.current.trim()}
            >
              Submit
            </Button>
            <Button 
              mode="outlined" 
              onPress={focusInput}
              style={styles.button}
            >
              Refocus
            </Button>
          </View>
          
          {lastScan ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Last Scan:</Text>
              <Text style={styles.resultValue}>{lastScan}</Text>
              <Text style={styles.resultInfo}>
                Length: {lastScan.length} characters
              </Text>
              {debugInfo && (
                <Text style={styles.resultInfo}>
                  Raw input length: {debugInfo.rawLength} characters
                </Text>
              )}
            </View>
          ) : null}
          
          <Divider style={styles.divider} />
          
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Scan History</Text>
            <Button 
              mode="text" 
              onPress={clearHistory}
              disabled={scanHistory.length === 0}
            >
              Clear
            </Button>
          </View>
          
          {scanHistory.length > 0 ? (
            <View style={styles.historyList}>
              {scanHistory.map((scan, index) => (
                <Chip 
                  key={index} 
                  style={styles.historyItem}
                  onPress={() => {}}
                >
                  {scan} ({scan.length})
                </Chip>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHistory}>No scans yet</Text>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Scanner Tips" />
        <Card.Content>
          <Text style={styles.tipText}>
            • If digits are being dropped, try increasing the scanner delay in Settings
          </Text>
          <Text style={styles.tipText}>
            • Ensure your scanner is set to the lowest transfer speed
          </Text>
          <Text style={styles.tipText}>
            • For best results, scan slowly and steadily
          </Text>
          <Text style={styles.tipText}>
            • Make sure the barcode is well-lit and not damaged
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
  instructions: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    minHeight: 100, // Increased height for multiline input
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlignVertical: 'top', // Better alignment for multiline
    },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  resultInfo: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  historyItem: {
    margin: 4,
  },
  emptyHistory: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  tipText: {
    marginBottom: 8,
  },
});