export interface InventoryItem {
  code: string;
  name: string;
  type: string;
  showroom: number;
  warehouse: number;
  storage: number;
  closet: number; // ← Add this
  checked?: boolean; // ← Add checkbox field
  note?: string; // ← Add note field
  editable?: boolean;
}
