export type SlotStatus = 'empty' | 'scanned' | 'pending';

export interface InventorySlot {
  id: number;
  status: SlotStatus;
  barcode: string | null;
  timestamp: string | null;
  gamepackNumber?: string | null; // First 11 digits of barcode
  soldOut?: boolean; // Track if pack is sold out
}

export interface SoldOutPack {
  id: string; // Unique identifier
  gamepackNumber: string; // First 11 digits of barcode
  gameName?: string; // Name of the game
  price?: string; // Price of the game
  type?: string; // Type of game
  soldOutDate: string; // Timestamp when marked as sold out
  slotId: number; // Slot where the pack was located
}

export interface InventoryState {
  slots: InventorySlot[];
  selectedSlot: number | null;
  soldOutPacks: SoldOutPack[]; // New array to track sold out packs
  initializeSlots: () => void;
  setSelectedSlot: (id: number | null) => void;
  updateSlot: (id: number, barcode: string) => void;
  clearSlot: (id: number) => void;
  markAsEmpty: (id: number) => void;
  markAsSoldOut: (id: number) => void;
  getPreviousGamepack: (slotId: number) => string | null;
  checkGamepackUniqueness: (gamepack: string) => boolean;
  getSoldOutPacksForToday: () => SoldOutPack[]; // New function to get today's sold out packs
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  previousGamepack?: string | null;
  requiresConfirmation?: boolean;
}