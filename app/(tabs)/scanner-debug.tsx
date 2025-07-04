import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, ScrollView, Platform, Keyboard } from 'react-native';
import { Card, Text, Button, Divider, Chip, DataTable } from 'react-native-paper';
import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScannerDebugScreen() {
  const [rawInput, setRawInput] = useState('');
  const [lastRawScan, setLastRawScan] = useState('');
  const [scanHistory, setScanHistory] = useState<Array<{
    raw: string,
    cleaned: string,
    timestamp: string
  }>>([]);
  const [scannerDelay, setScannerDelay] = useState(500);
  const inputRef = useRef<TextInput>(null);
  
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
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleInputChange = (text: string) => {
    // Store the raw input without any cleaning
    setRawInput(text);
    
    // Auto-submit if input ends with a return character or reaches sufficient length
    if (text.endsWith('\n') || text.endsWith('\r') || text.length >= 20) {
      // Use the configured delay to ensure all characters are captured
      setTimeout(() => {
        handleSubmit(text);
      }, scannerDelay);
    }
  };
  
  const handleSubmit = (text: string = rawInput) => {
    // Store the raw scan
    setLastRawScan(text);
    
    // Clean the input (remove any non-numeric characters) for comparison
    const cleanedInput = text.replace(/[^0-9]/g, '');
    
    if (text.length > 0) {
      setScanHistory(prev => [{
        raw: text,
        cleaned: cleanedInput,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 10));
    }
    
    // Clear the input field
    setRawInput('');
    
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
    setLastRawScan('');
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
        <Card.Title title="Barcode Scanner Diagnostics" />
        <Card.Content>
          <Text style={styles.instructions}>
            This tool captures the raw scanner input without any filtering or processing.
            It will help identify if characters are being dropped or modified.
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={rawInput}
              onChangeText={handleInputChange}
              placeholder="Scan barcode here"
              autoCapitalize="none"
              autoCorrect={false}
              // Critical: Don't restrict input type to allow all characters
              keyboardType="default"
              // Critical: Don't hide soft keyboard on native platforms
              showSoftInputOnFocus={true}
              // Critical: Allow caret to be visible on native platforms
              caretHidden={Platform.OS === 'web'}
              onFocus={() => {
                if (Platform.OS === 'web') {
                  setTimeout(() => Keyboard.dismiss(), 50);
                }
              }}
              multiline={true}
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.buttonRow}>
            <Button 
              mode="contained" 
              onPress={() => handleSubmit()}
              style={styles.button}
              disabled={!rawInput.trim()}
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
          
          {lastRawScan ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Last Raw Scan:</Text>
              <Text style={styles.resultValue}>{formatRawInput(lastRawScan)}</Text>
              <Text style={styles.resultInfo}>
                Raw Length: {lastRawScan.length} characters
              </Text>
              <Text style={styles.resultInfo}>
                Numeric Only: {lastRawScan.replace(/[^0-9]/g, '')}
              </Text>
              <Text style={styles.resultInfo}>
                Numeric Length: {lastRawScan.replace(/[^0-9]/g, '').length} digits
              </Text>
              <Text style={styles.resultInfo}>
                Character Codes: {Array.from(lastRawScan).map(c => c.charCodeAt(0)).join(', ')}
              </Text>
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
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Raw Input</DataTable.Title>
                <DataTable.Title numeric>Raw Length</DataTable.Title>
                <DataTable.Title numeric>Numeric Length</DataTable.Title>
              </DataTable.Header>
              
              {scanHistory.map((scan, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>{formatRawInput(scan.raw)}</DataTable.Cell>
                  <DataTable.Cell numeric>{scan.raw.length}</DataTable.Cell>
                  <DataTable.Cell numeric>{scan.cleaned.length}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          ) : (
            <Text style={styles.emptyHistory}>No scans yet</Text>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Diagnostic Instructions" />
        <Card.Content>
          <Text style={styles.tipText}>
            1. Scan several barcodes at different speeds
          </Text>
          <Text style={styles.tipText}>
            2. Check if any non-numeric characters appear in the raw input
          </Text>
          <Text style={styles.tipText}>
            3. Compare the raw length vs. numeric length
          </Text>
          <Text style={styles.tipText}>
            4. Look for patterns in character codes (e.g., prefix/suffix codes)
          </Text>
          <Text style={styles.tipText}>
            5. Try scanning the same barcode multiple times to check consistency
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
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlignVertical: 'top',
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
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'Courier New',
    color: colors.primary,
    marginBottom: 8,
  },
  resultInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'Courier New',
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