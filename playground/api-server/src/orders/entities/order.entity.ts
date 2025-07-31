import type { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItem[];
  address: string;
  createdAt: Date;
  updatedAt: Date;
}
