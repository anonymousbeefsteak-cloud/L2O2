
export interface MenuItem {
  id: number;
  name: string;
  price: number;
  emoji: string;
}

// FIX: Add missing OrderItem interface
export interface OrderItem extends MenuItem {
  quantity: number;
}
