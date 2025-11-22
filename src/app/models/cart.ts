export interface CartItem {
  product: any;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Cart {
  _id?: string;
  cashier: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "active" | "completed" | "abandoned";
  createdAt?: Date;
  updatedAt?: Date;
}
