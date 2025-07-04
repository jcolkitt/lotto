import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Card, IconButton, Badge } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { InventorySlot as InventorySlotType } from '@/types/inventory';
import { colors } from '@/constants/theme';

interface InventorySlotProps {
  slot: InventorySlotType;
  onPress: (id: number) => void;
  onClear: (id: number) => void;
  onMarkEmpty: (id: number) => void;
  hideActions?: boolean;
}

const InventorySlot: React.FC<InventorySlotProps> = ({
  slot,
  onPress,
  onClear,
  onMarkEmpty,
  hideActions = false,
}) => {
  const renderRightActions = () => {
    if (hideActions) return null;
    
    return (
      <View style={styles.rightActions}>
        <IconButton
          icon="delete"
          iconColor="white"
          size={24}
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={() => onClear(slot.id)}
        />
        <IconButton
          icon="cancel"
          iconColor="white"
          size={24}
          style={[styles.actionButton, { backgroundColor: colors.warning }]}
          onPress={() => onMarkEmpty(slot.id)}
        />
      </View>
    );
  };

  const getStatusColor = () => {
    switch (slot.status) {
      case 'scanned':
        return slot.soldOut ? colors.warning : colors.success;
      case 'pending':
        return colors.warning;
      case 'empty':
        return colors.disabled;
      default:
        // For slots that are neither scanned nor marked empty
        if (slot.barcode !== "00000000000000" && slot.barcode !== null) {
          return colors.error;
        }
        return colors.error; // Changed to always show red for empty slots
    }
  };

  // Determine if the slot is unscanned but not marked empty
  const isUnscanned = slot.status !== 'scanned' && 
                      (slot.barcode !== "00000000000000");
                       
  // Extract only the 12th-14th digits of the barcode for display
  const getTicketNumber = (barcode: string | null) => {
    if (!barcode || barcode.length < 14) return '';
    
    // Extract digits 12-14 (index 11-13 since it's zero-based)
    return barcode.substring(11, 14);
  };

  return (
    <Swipeable renderRightActions={renderRightActions} enabled={!hideActions}>
      <Card style={styles.card} onPress={() => onPress(slot.id)}>
        <Card.Content style={styles.content}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <View style={styles.slotInfo}>
            <Text style={styles.slotNumber}>Slot {slot.id}</Text>
            
            {slot.status === 'scanned' && slot.gamepackNumber ? (
              <>
                <Text style={styles.gamepackText}>
                  {slot.gamepackNumber}
                </Text>
                <Text style={styles.barcodeText}>
                  <Text style={styles.barcodeLabel}>Ticket Number: </Text>
                  <Text style={styles.barcodeValue}>{getTicketNumber(slot.barcode)}</Text>
                </Text>
              </>
            ) : (
              <Text style={[
                styles.barcodeText, 
                isUnscanned ? styles.notScannedText : null
              ]}>
                {isUnscanned ? "No Entry" : 
                 (slot.barcode === "00000000000000" ? "Marked Empty" : "No Entry")}
              </Text>
            )}
            
            {slot.soldOut && (
              <Badge style={styles.soldOutBadge}>Sold Out</Badge>
            )}
          </View>
          {!hideActions && (
            <IconButton
              icon="barcode-scan"
              size={24}
              onPress={() => onPress(slot.id)}
            />
          )}
        </Card.Content>
      </Card>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gamepackText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
  },
  barcodeText: {
    fontSize: 13,
    color: '#666',
  },
  barcodeLabel: {
    fontWeight: 'bold',
  },
  barcodeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'Courier New',
  },
  notScannedText: {
    color: colors.error,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButton: {
    margin: 4,
  },
  soldOutBadge: {
    backgroundColor: colors.warning,
    color: 'white',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
});

export default InventorySlot;