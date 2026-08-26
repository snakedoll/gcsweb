export type SalesManagementSection =
  | 'home'
  | 'store'
  | 'products'
  | 'orders'
  | 'inventory';

export interface SalesStore {
  id: string;
  name: string;
  storeIdentifier: string;
  visitorOrderUrl: string;
  description?: string;
  imageUrl?: string;
}

export interface StoreFormInput {
  name: string;
  storeIdentifier: string;
}

export interface SellerSummary {
  store: SalesStore | null;
  productCount: number;
  orderCount: number;
  lowStockCount: number;
}

export interface SalesProduct {
  id: string;
  storeId: SalesStore['id'];
  name: string;
  price: number;
  imageUrl?: string;
  isVisible: boolean;
}

export type SalesOrderStatus = 'new' | 'confirmed' | 'completed' | 'cancelled';

export interface SalesOrder {
  id: string;
  orderCode: string;
  buyerName: string;
  totalAmount: number;
  status: SalesOrderStatus;
  orderedAt: string;
}

export interface InventoryItem {
  productId: SalesProduct['id'];
  productName: string;
  quantity: number;
  soldOut: boolean;
}
