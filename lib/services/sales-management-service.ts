import type {
  InventoryItem,
  ProductFormInput,
  SalesOrder,
  SalesProduct,
  SalesStore,
} from '@/types/sales-management';
import type { ListResult } from './contracts';

export interface SalesManagementService {
  getStore(): Promise<SalesStore | null>;
  saveStore(store: Omit<SalesStore, 'id'>): Promise<SalesStore>;
  getProducts(): Promise<ListResult<SalesProduct>>;
  saveProduct(product: ProductFormInput): Promise<SalesProduct>;
  getOrders(): Promise<ListResult<SalesOrder>>;
  getInventory(): Promise<ListResult<InventoryItem>>;
}
