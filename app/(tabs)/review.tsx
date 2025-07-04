import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Card, Text, Button, DataTable, Divider } from 'react-native-paper';
import { useInventoryStore } from '@/store/inventoryStore';
import { colors } from '@/constants/theme';

export default function ReviewScreen() {
  const { slots, soldOutPacks, getSoldOutPacksForToday } = useInventoryStore();
  
  const scannedSlots = slots.filter(slot => slot.status === 'scanned');
  const emptySlots = slots.filter(slot => slot.status === 'empty');
  const todaySoldOutPacks = getSoldOutPacksForToday();
  
  const handleSubmit = () => {
    // In a real app, this would send data to a server
    Alert.alert(
      'Submit Inventory',
      `Are you sure you want to submit ${scannedSlots.length} scanned items?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: () => {
            // Simulate submission
            Alert.alert(
              'Success',
              'Inventory submitted successfully!',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  // Format timestamp to remove seconds
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Inventory Summary</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scannedSlots.length}</Text>
              <Text style={styles.statLabel}>Scanned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{emptySlots.length}</Text>
              <Text style={styles.statLabel}>Empty</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todaySoldOutPacks.length}</Text>
              <Text style={styles.statLabel}>Sold Out</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Scanned Items</Text>
          
          {scannedSlots.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title style={styles.slotColumn}>Slot</DataTable.Title>
                <DataTable.Title style={styles.barcodeColumn}>Barcode</DataTable.Title>
                <DataTable.Title style={styles.timestampColumn}>Time</DataTable.Title>
              </DataTable.Header>
              
              {scannedSlots.map((slot) => (
                <DataTable.Row key={slot.id}>
                  <DataTable.Cell style={styles.slotColumn}>{slot.id}</DataTable.Cell>
                  <DataTable.Cell style={styles.barcodeColumn}>{slot.barcode}</DataTable.Cell>
                  <DataTable.Cell style={styles.timestampColumn}>
                    {formatTimestamp(slot.timestamp)}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          ) : (
            <Text style={styles.emptyText}>No items scanned yet</Text>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Sold Out Packs</Text>
          
          {todaySoldOutPacks.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title style={styles.gameNumberColumn}>Game #</DataTable.Title>
                <DataTable.Title style={styles.gameNameColumn}>Game</DataTable.Title>
                <DataTable.Title style={styles.priceColumn}>Price</DataTable.Title>
                <DataTable.Title style={styles.timeColumn}>Time</DataTable.Title>
              </DataTable.Header>
              
              {todaySoldOutPacks.map((pack) => (
                <DataTable.Row key={pack.id}>
                  <DataTable.Cell style={styles.gameNumberColumn}>
                    {pack.gamepackNumber.substring(0, 5)}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.gameNameColumn}>{pack.gameName}</DataTable.Cell>
                  <DataTable.Cell style={styles.priceColumn}>{pack.price}</DataTable.Cell>
                  <DataTable.Cell style={styles.timeColumn}>
                    {formatTimestamp(pack.soldOutDate)}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          ) : (
            <Text style={styles.emptyText}>No packs marked as sold out today</Text>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Empty Slots</Text>
          
          {emptySlots.length > 0 ? (
            <View style={styles.emptySlots}>
              {emptySlots.map((slot) => (
                <View key={slot.id} style={styles.emptySlot}>
                  <Text>{slot.id}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No empty slots</Text>
          )}
        </Card.Content>
      </Card>
      
      <Button
        mode="contained"
        onPress={handleSubmit}
        style={styles.submitButton}
        disabled={scannedSlots.length === 0}
      >
        Submit Inventory
      </Button>
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
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 16,
  },
  emptySlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptySlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  submitButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: colors.primary,
  },
  // Column width styles for scanned items
  slotColumn: {
    flex: 0.2, // Narrow column for slot numbers
  },
  barcodeColumn: {
    flex: 0.6, // Wider column for barcodes
  },
  timestampColumn: {
    flex: 0.3, // Medium width for timestamps
  },
  // Column width styles for sold out packs
  gameNumberColumn: {
    flex: 0.2, // Narrow column for game numbers
  },
  gameNameColumn: {
    flex: 0.4, // Wider column for game names
  },
  priceColumn: {
    flex: 0.2, // Narrow column for prices
  },
  timeColumn: {
    flex: 0.3, // Medium width for timestamps
  },
});