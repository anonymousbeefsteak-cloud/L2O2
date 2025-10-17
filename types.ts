
export interface MenuItem {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
}

export interface OrderData {
  source: string;
  liffUserId: string;
  customerName: string;
  customerPhone: string;
  customerLineId: string;
  product: string;
  totalAmount: number;
  pickupTime: string;
  notes: string;
  timestamp: string;
}

export interface NotificationState {
    message: string;
    type: 'success' | 'error';
}
