export interface ContainerInfo {
  category: number; // 0 = none, 1–4 = C1–C4
  quantity: number; // units in the selected container
}

export interface InventoryItem {
  code: string;
  name: string;
  type: string;
  showroom: number;
  warehouse: number;
  containers: ContainerInfo; // ← category + quantity
  closet: number; // ← Add this
  checked?: boolean; // ← Add checkbox field
  note?: string; // ← Add note field
  editable?: boolean;
}
