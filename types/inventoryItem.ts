export interface InventoryItem {
  code: string;
  name: string;
  type: string;
  showroom: number;
  warehouse: number;
  containers: number; // ← container category: 0 = none, 1–4 = C1–C4
  closet: number; // ← Add this
  checked?: boolean; // ← Add checkbox field
  note?: string; // ← Add note field
  editable?: boolean;
}
