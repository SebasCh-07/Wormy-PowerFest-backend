export enum ReservationStatus {
  RESERVED = 'RESERVED',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
