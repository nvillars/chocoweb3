export type PaymentMethod = 'card' | 'wallet';

export type OrderStatus = 'cart' | 'paid' | 'failed' | 'cancelled';

export type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number; // in units (not cents)
  lineTotal: number;
};

export type Address = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1?: string;
  reference?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
};

export type ShippingOption = {
  method: 'envio' | 'recojo';
  price: number;
};

export type CheckoutPayload = {
  items: OrderItem[];
  address: Address | null;
  shipping: ShippingOption;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
};
