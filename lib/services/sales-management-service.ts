import type {
  InventoryItem,
  SalesOrder,
  SalesProduct,
  SalesStore,
  StoreFormInput,
} from '@/types/sales-management';
import type { ListResult } from './contracts';

export interface SalesManagementService {
  getStore(): Promise<SalesStore | null>;
  checkStoreIdentifier(storeIdentifier: StoreFormInput['storeIdentifier']): Promise<boolean>;
  saveStore(store: StoreFormInput): Promise<SalesStore>;
  getProducts(): Promise<ListResult<SalesProduct>>;
  saveProduct(product: Omit<SalesProduct, 'id'>): Promise<SalesProduct>;
  getOrders(): Promise<ListResult<SalesOrder>>;
  getInventory(): Promise<ListResult<InventoryItem>>;
}
