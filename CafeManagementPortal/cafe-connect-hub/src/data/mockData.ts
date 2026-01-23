export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: Date;
  tableNumber?: number;
}

export interface Notification {
  id: string;
  type: 'order' | 'kitchen' | 'system';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    customerName: 'John Smith',
    customerPhone: '+1 234 567 890',
    type: 'dine-in',
    status: 'pending',
    tableNumber: 5,
    items: [
      { id: '1', name: 'Cappuccino', quantity: 2, price: 4.50 },
      { id: '2', name: 'Avocado Toast', quantity: 1, price: 12.00, notes: 'No tomatoes' },
      { id: '3', name: 'Blueberry Muffin', quantity: 2, price: 3.50 },
    ],
    total: 28.00,
    createdAt: new Date(Date.now() - 5 * 60000),
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    customerName: 'Emily Davis',
    type: 'takeaway',
    status: 'preparing',
    items: [
      { id: '4', name: 'Latte', quantity: 1, price: 5.00 },
      { id: '5', name: 'Croissant', quantity: 1, price: 4.00 },
    ],
    total: 9.00,
    createdAt: new Date(Date.now() - 12 * 60000),
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    customerName: 'Michael Brown',
    customerPhone: '+1 555 123 456',
    type: 'delivery',
    status: 'ready',
    items: [
      { id: '6', name: 'Espresso', quantity: 3, price: 3.00 },
      { id: '7', name: 'Club Sandwich', quantity: 2, price: 14.00 },
    ],
    total: 37.00,
    createdAt: new Date(Date.now() - 25 * 60000),
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    customerName: 'Sarah Wilson',
    type: 'dine-in',
    status: 'pending',
    tableNumber: 3,
    items: [
      { id: '8', name: 'Green Tea', quantity: 1, price: 3.50 },
      { id: '9', name: 'Caesar Salad', quantity: 1, price: 11.00 },
    ],
    total: 14.50,
    createdAt: new Date(Date.now() - 3 * 60000),
  },
  {
    id: '5',
    orderNumber: 'ORD-005',
    customerName: 'David Lee',
    type: 'takeaway',
    status: 'preparing',
    items: [
      { id: '10', name: 'Mocha', quantity: 2, price: 5.50 },
      { id: '11', name: 'Chocolate Cake', quantity: 1, price: 6.00 },
    ],
    total: 17.00,
    createdAt: new Date(Date.now() - 18 * 60000),
  },
  {
    id: '6',
    orderNumber: 'ORD-006',
    customerName: 'Lisa Anderson',
    type: 'dine-in',
    status: 'completed',
    tableNumber: 8,
    items: [
      { id: '12', name: 'Americano', quantity: 2, price: 3.50 },
      { id: '13', name: 'Bagel with Cream Cheese', quantity: 2, price: 5.00 },
    ],
    total: 17.00,
    createdAt: new Date(Date.now() - 45 * 60000),
  },
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'New Order Received',
    message: 'Order #ORD-001 has been placed by John Smith',
    createdAt: new Date(Date.now() - 5 * 60000),
    read: false,
  },
  {
    id: '2',
    type: 'kitchen',
    title: 'Order Ready',
    message: 'Order #ORD-003 is ready for pickup',
    createdAt: new Date(Date.now() - 10 * 60000),
    read: false,
  },
  {
    id: '3',
    type: 'system',
    title: 'Low Stock Alert',
    message: 'Blueberry muffins are running low (5 remaining)',
    createdAt: new Date(Date.now() - 30 * 60000),
    read: true,
  },
  {
    id: '4',
    type: 'order',
    title: 'Order Cancelled',
    message: 'Order #ORD-007 has been cancelled by the customer',
    createdAt: new Date(Date.now() - 60 * 60000),
    read: true,
  },
  {
    id: '5',
    type: 'kitchen',
    title: 'Order Delayed',
    message: 'Order #ORD-002 preparation is delayed by 5 minutes',
    createdAt: new Date(Date.now() - 15 * 60000),
    read: false,
  },
];

export const dashboardStats = {
  todayOrders: 47,
  pendingOrders: 8,
  revenue: 1245.50,
  averageOrderValue: 26.50,
};

// Menu Items
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: 'short' | 'long';
  cookTime: number; // in minutes
}

export const mockItems: MenuItem[] = [
  { id: '1', name: 'Cappuccino', price: 4.50, image: '/placeholder.svg', size: 'short', cookTime: 3 },
  { id: '2', name: 'Latte', price: 5.00, image: '/placeholder.svg', size: 'long', cookTime: 4 },
  { id: '3', name: 'Espresso', price: 3.00, image: '/placeholder.svg', size: 'short', cookTime: 2 },
  { id: '4', name: 'Mocha', price: 5.50, image: '/placeholder.svg', size: 'long', cookTime: 5 },
  { id: '5', name: 'Avocado Toast', price: 12.00, image: '/placeholder.svg', size: 'long', cookTime: 8 },
  { id: '6', name: 'Croissant', price: 4.00, image: '/placeholder.svg', size: 'short', cookTime: 3 },
  { id: '7', name: 'Blueberry Muffin', price: 3.50, image: '/placeholder.svg', size: 'short', cookTime: 2 },
  { id: '8', name: 'Club Sandwich', price: 14.00, image: '/placeholder.svg', size: 'long', cookTime: 12 },
  { id: '9', name: 'Caesar Salad', price: 11.00, image: '/placeholder.svg', size: 'long', cookTime: 7 },
  { id: '10', name: 'Green Tea', price: 3.50, image: '/placeholder.svg', size: 'short', cookTime: 2 },
  { id: '11', name: 'Chocolate Cake', price: 6.00, image: '/placeholder.svg', size: 'short', cookTime: 3 },
  { id: '12', name: 'Bagel with Cream Cheese', price: 5.00, image: '/placeholder.svg', size: 'short', cookTime: 4 },
];

// Menus
export interface Menu {
  id: string;
  name: string;
  itemIds: string[];
  isActive: boolean;
  timeSlot: {
    startTime: string;
    endTime: string;
    activeDays: string[];
  };
}

export const mockMenus: Menu[] = [
  {
    id: '1',
    name: 'Breakfast Menu',
    itemIds: ['1', '2', '5', '6', '7', '12'],
    isActive: true,
    timeSlot: {
      startTime: '06:00',
      endTime: '11:00',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
  },
  {
    id: '2',
    name: 'Lunch Special',
    itemIds: ['3', '4', '8', '9'],
    isActive: true,
    timeSlot: {
      startTime: '11:00',
      endTime: '15:00',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  },
  {
    id: '3',
    name: 'All Day Coffee',
    itemIds: ['1', '2', '3', '4', '10'],
    isActive: true,
    timeSlot: {
      startTime: '06:00',
      endTime: '22:00',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
  },
  {
    id: '4',
    name: 'Weekend Brunch',
    itemIds: ['1', '2', '5', '6', '7', '8', '11'],
    isActive: false,
    timeSlot: {
      startTime: '09:00',
      endTime: '14:00',
      activeDays: ['saturday', 'sunday'],
    },
  },
];
