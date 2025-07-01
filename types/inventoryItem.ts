export interface InventoryItem {
  code: string;
  name: string;
  type: string;
  showroom: number;
  warehouse: number;
  storage: number;
  closet: number; // ← Add this
  editable?: boolean;
}
