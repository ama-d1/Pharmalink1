import { API } from '@/constants/api';

export type OrderItem = {
  drugName: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
};

export async function createOrder(
  userId: string,
  items: OrderItem[],
  deliveryAddress: string,
  paymentMethod: string
): Promise<Order> {
  const res = await fetch(`${API.orders}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, items, deliveryAddress, paymentMethod }),
  });
  return res.json();
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const res = await fetch(`${API.orders}/user/${userId}`);
  return res.json();
}

export async function getAvailableDrugs() {
  const res = await fetch(`${API.orders}/drugs`);
  return res.json();
}

export async function searchDrugs(query: string) {
  const res = await fetch(`${API.orders}/drugs/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function processPayment(orderId: string, paymentData?: any): Promise<Order> {
  const body = paymentData ? { paymentData } : {};
  const res = await fetch(`${API.orders}/${orderId}/pay`, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
