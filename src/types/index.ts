// Centralized app types (small, incremental - add more as needed)
export type Product = {
  _id?: string;
  id?: number;
  slug?: string;
  name: string;
  description?: string;
  price?: number;
  stock?: number;
  published?: boolean;
  image?: string;
  tags?: string[];
  deletedAt?: string | null;
};

export type CartItem = {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  quantity: number;
  stock?: number;
};

export type User = {
  email: string;
  role?: 'user' | 'admin' | string;
  [key: string]: unknown;
};
