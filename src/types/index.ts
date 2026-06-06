export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  created_at: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  sale_datetime: string;
  total_amount: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}
