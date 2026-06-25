export interface ContainerCounts {
  C1: number;
  C2: number;
  C3: number;
  C4: number;
}

export interface InventoryItem {
  code: string;
  name: string;
  type: string;
  showroom: number;
  warehouse: number;
  containers: ContainerCounts; // ← nested C1–C4 categories
  closet: number; // ← Add this
  checked?: boolean; // ← Add checkbox field
  note?: string; // ← Add note field
  editable?: boolean;
}
