import { create } from 'zustand';
import { InventorySlot, InventoryState, SoldOutPack } from '@/types/inventory';

// Mock game data - in a real app, this would come from an API or database
const gameData: Record<string, { name: string; price: string; type: string }> = {
  // Sample game data with first 5 digits as key
  '12345': { name: 'Lucky 7s', price: '$5', type: 'Scratch-off' },
  '23456': { name: 'Gold Rush', price: '$10', type: 'Scratch-off' },
  '34567': { name: 'Mega Millions', price: '$20', type: 'Scratch-off' },
  '45678': { name: 'Cash Explosion', price: '$30', type: 'Scratch-off' },
  '56789': { name: 'Diamond Dazzler', price: '$2', type: 'Scratch-off' },
  // Default for unknown games
  'default': { name: 'Unknown Game', price: 'N/A', type: 'Scratch-off' },
};

// Helper to get game info from gamepack number
const getGameInfo = (gamepackNumber: string) => {
  // Use first 5 digits to look up game info
  const gamePrefix = gamepackNumber.substring(0, 5);
  return gameData[gamePrefix] || gameData['default'];
};

// Helper to check if a date is today
const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  slots: [],
  selectedSlot: null,
  soldOutPacks: [], // Initialize empty array for sold out packs

  initializeSlots: () => {
    const initialSlots: InventorySlot[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      status: 'empty',
      barcode: null,
      timestamp: null,
      gamepackNumber: null,
      soldOut: false,
    }));
    set({ slots: initialSlots });
  },

  setSelectedSlot: (id) => {
    set({ selectedSlot: id });
  },

  updateSlot: (id, barcode) => {
    // Extract gamepack number (first 11 digits)
    // Make sure we have at least 11 digits for the gamepack number
    const gamepackNumber = barcode.length >= 11 ? barcode.substring(0, 11) : barcode;
    
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              status: 'scanned',
              barcode,
              gamepackNumber,
              soldOut: false, // New packs are not sold out
              timestamp: new Date().toISOString(),
            }
          : slot
      ),
    }));
  },

  clearSlot: (id) => {
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              status: 'empty',
              barcode: null,
              gamepackNumber: null,
              soldOut: false,
              timestamp: null,
            }
          : slot
      ),
    }));
  },

  markAsEmpty: (id) => {
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              status: 'empty',
              barcode: "00000000000000", // Special barcode for empty slots
              gamepackNumber: "00000000000", // Special gamepack for empty slots
              timestamp: new Date().toISOString(),
            }
          : slot
      ),
    }));
  },

  markAsSoldOut: (id) => {
    const { slots } = get();
    const slot = slots.find(s => s.id === id);
    
    // Only proceed if slot exists and has a valid gamepack number
    if (slot && slot.gamepackNumber && slot.gamepackNumber !== "00000000000") {
      const now = new Date().toISOString();
      const gamepackNumber = slot.gamepackNumber;
      const gameInfo = getGameInfo(gamepackNumber);
      
      // Create a new sold out pack entry
      const newSoldOutPack: SoldOutPack = {
        id: `${gamepackNumber}-${now}`, // Create a unique ID
        gamepackNumber,
        gameName: gameInfo.name,
        price: gameInfo.price,
        type: gameInfo.type,
        soldOutDate: now,
        slotId: id
      };
      
      // Update the state
      set((state) => ({
        // Update the slot to mark as sold out
        slots: state.slots.map((s) =>
          s.id === id
            ? {
                ...s,
                soldOut: true,
              }
            : s
        ),
        // Add the new sold out pack to the list
        soldOutPacks: [...state.soldOutPacks, newSoldOutPack]
      }));
    }
  },

  getPreviousGamepack: (slotId) => {
    const { slots } = get();
    const slot = slots.find(s => s.id === slotId);
    
    // If slot has no barcode or is the empty placeholder, return null
    if (!slot?.barcode || slot.gamepackNumber === "00000000000") {
      return null;
    }
    
    return slot.gamepackNumber || null;
  },

  checkGamepackUniqueness: (gamepack) => {
    // Skip validation for empty placeholder
    if (gamepack === "00000000000") {
      return true;
    }
    
    const { slots } = get();
    const today = new Date().toDateString();
    
    // Check if this gamepack already exists in any active slot for today
    return !slots.some(slot => {
      // Skip if no timestamp or different gamepack
      if (!slot.timestamp || slot.gamepackNumber !== gamepack) {
        return false;
      }
      
      // Check if the entry is from today and not sold out
      const slotDate = new Date(slot.timestamp).toDateString();
      return slotDate === today && !slot.soldOut;
    });
  },

  getSoldOutPacksForToday: () => {
    const { soldOutPacks } = get();
    
    // Filter to only include packs sold out today
    return soldOutPacks
      .filter(pack => isToday(pack.soldOutDate))
      .sort((a, b) => {
        // Sort by sold out date in descending order (newest first)
        return new Date(b.soldOutDate).getTime() - new Date(a.soldOutDate).getTime();
      });
  }
}));