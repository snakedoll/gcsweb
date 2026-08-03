// Common types used across the application

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

// Add more types here as needed
