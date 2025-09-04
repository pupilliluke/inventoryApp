export interface ActiveUser {
  id: string;
  name: string;
}

export interface LogEntry {
  logId?: string;
  message: string;
  userId: string;
  userName: string;
  ts: number;
}

export interface User {
  id: string;
  name: string;
  list?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}