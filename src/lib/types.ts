// User Type's
export type UserRole = 'admin' | 'staff' | 'executive';

export interface User {
  id: string;
  _id?: string; // MongoDB ID
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  email?: string;
  password?: string; // Add password field for staff login
  createdAt?: string;
  attendance?: {
    date: string;
    isPresent: boolean;
    remarks?: string;
  }[];
}

export interface Staff extends User {
  password?: string;
  attendance?: AttendanceRecord[];
}

export interface AttendanceRecord {
  date: string;
  isPresent: boolean;
  remarks?: string;
}

export type ProductDimension = 'Bag' | 'Bundle' | 'Box' | 'Carton' | 'Coils' | 'Dozen' | 'Ft' | 'Gross' | 'Kg' | 'Mtr' | 'Pc' | 'Pkt' | 'Set' | 'Not Applicable';

export interface Product {
  id?: string;
  _id?: string; // MongoDB ID
  name: string;
  stock: number;
  dimension?: ProductDimension;
  threshold?: number; // Add threshold field with default
  createdAt: Date;
  updatedAt: Date;
}

// Order Types
export type OrderStatus = 'pending' | 'dc' | 'invoice' | 'dispatched';
export type PaymentCondition = 'immediate' | 'days15' | 'days30';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type OrderPriority = 'urgent' | 'normal';

export interface OrderItem {
  id?: string;
  _id?: string; // MongoDB ID
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  dimension?: ProductDimension;
}

export interface Order {
  _id: string;
  id?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  orderItems: OrderItem[];
  items?: OrderItem[]; // For backward compatibility
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentCondition?: PaymentCondition;
  priority?: OrderPriority;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderImage?: string;
  dispatchDate?: string;
  scheduledDate?: string;
  assignedTo?: string;
  createdBy?: string; // ID of the staff member who created the order
  isPaid?: boolean;
  paidAt?: string | Date;
  deliveryPerson?: string; // Added for tracking who delivers the order
}

// Analytics Types
export interface SalesByPeriod {
  date: string;
  amount: number;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalSales: number;
  averageOrderValue: number;
  pendingOrders: number;
}
