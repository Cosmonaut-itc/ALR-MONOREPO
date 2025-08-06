import { create } from 'zustand';

interface InspectionItem {
  id: string;
  barcode: string;
  name: string;
  returned: boolean;
}

interface InspectionProgress {
  total: number;
  returned: number;
  percentage: number;
}

interface KitsStore {
  // Existing properties
  kits: any[];
  kitLoading: boolean;

  // New properties
  inspectionItems: InspectionItem[];
  inspectionLoading: boolean;

  // Existing methods
  loadKits: () => void;
  addKit: (kit: any) => void;
  removeKit: (kitId: string) => void;

  // New methods
  loadInspection: (kitId: string, items: InspectionItem[]) => void;
  toggleInspectionItem: (itemId: string) => void;
  toggleInspectionGroup: (barcode: string) => void;
  markAllReturned: (kitId: string) => void;
  getInspectionProgress: () => InspectionProgress;
}

const useKitsStore = create<KitsStore>((set, get) => ({
  kits: [],
  kitLoading: false,
  inspectionItems: [],
  inspectionLoading: false,

  loadKits: () => {
    set({ kitLoading: true });
    // Simulate loading
    setTimeout(() => {
      set({ 
        kits: [{ id: '1', name: 'Kit 1' }, { id: '2', name: 'Kit 2' }],
        kitLoading: false 
      });
    }, 1000);
  },

  addKit: (kit) => {
    set((state) => ({
      kits: [...state.kits, kit]
    }));
  },

  removeKit: (kitId) => {
    set((state) => ({
      kits: state.kits.filter(kit => kit.id !== kitId)
    }));
  },

  loadInspection: (kitId, items) => {
    set({ inspectionLoading: true });
    // Simulate loading
    setTimeout(() => {
      set({ 
        inspectionItems: items,
        inspectionLoading: false 
      });
    }, 1000);
  },

  toggleInspectionItem: (itemId) => {
    set((state) => ({
      inspectionItems: state.inspectionItems.map(item =>
        item.id === itemId 
          ? { ...item, returned: !item.returned }
          : item
      )
    }));
  },

  toggleInspectionGroup: (barcode) => {
    set((state) => {
      const groupItems = state.inspectionItems.filter(item => item.barcode === barcode);
      const allReturned = groupItems.every(item => item.returned);
      
      return {
        inspectionItems: state.inspectionItems.map(item =>
          item.barcode === barcode
            ? { ...item, returned: !allReturned }
            : item
        )
      };
    });
  },

  markAllReturned: (kitId) => {
    set((state) => ({
      inspectionItems: state.inspectionItems.map(item => ({
        ...item,
        returned: true
      }))
    }));
  },

  getInspectionProgress: () => {
    const state = get();
    const total = state.inspectionItems.length;
    const returned = state.inspectionItems.filter(item => item.returned).length;
    const percentage = total > 0 ? Math.round((returned / total) * 100) : 0;
    
    return { total, returned, percentage };
  }
}));

export default useKitsStore;
