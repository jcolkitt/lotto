import { ValidationResult } from '@/types/inventory';
import { useInventoryStore } from '@/store/inventoryStore';

export const validateBarcode = (barcode: string, slotId: number): ValidationResult => {
  // Basic validation
  if (!barcode.trim()) {
    return { isValid: false, message: 'Please enter a barcode' };
  }

  if (barcode.length < 14) {
    return { isValid: false, message: 'Barcode must be at least 14 digits' };
  }

  if (!/^\d+$/.test(barcode)) {
    return { isValid: false, message: 'Barcode must contain only numbers' };
  }

  // Extract gamepack number (first 11 digits)
  const gamepackNumber = barcode.substring(0, 11);
  
  // Special case for empty slot marker
  if (gamepackNumber === "00000000000") {
    return { isValid: true };
  }

  // Get store functions
  const store = useInventoryStore.getState();
  const previousGamepack = store.getPreviousGamepack(slotId);
  
  // Check if this is a new gamepack for this slot
  if (previousGamepack && previousGamepack !== "00000000000" && previousGamepack !== gamepackNumber) {
    // Previous pack exists and is different - need confirmation it's sold out
    return {
      isValid: false,
      requiresConfirmation: true,
      previousGamepack,
      message: `Was the previous pack (${previousGamepack}) in Slot ${slotId} completely sold out?`
    };
  }
  
  // Check uniqueness across all slots
  const isUnique = store.checkGamepackUniqueness(gamepackNumber);
  if (!isUnique) {
    return {
      isValid: false,
      message: `This gamepack (${gamepackNumber}) is already active in another slot today.`
    };
  }
  
  // All validations passed
  return { isValid: true };
};