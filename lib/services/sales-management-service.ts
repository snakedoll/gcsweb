import type {
  InventoryItem,
  SalesOrder,
  SalesProduct,
  SalesStore,
  SellerSummary,
} from '@/types/sales-management';
import type { ListResult } from './contracts';

export interface SalesManagementLandingService {
  getSellerSummary(): Promise<SellerSummary>;
}

export interface SalesManagementService extends SalesManagementLandingService {
  getStore(): Promise<SalesStore | null>;
  saveStore(store: Omit<SalesStore, 'id'>): Promise<SalesStore>;
  getProducts(): Promise<ListResult<SalesProduct>>;
  saveProduct(product: Omit<SalesProduct, 'id'>): Promise<SalesProduct>;
  getOrders(): Promise<ListResult<SalesOrder>>;
  getInventory(): Promise<ListResult<InventoryItem>>;
}
