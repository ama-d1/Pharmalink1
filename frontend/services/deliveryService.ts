import { API } from '@/constants/api';

export type DeliveryRequest = {
  orderId: string;
  deliverySpeed: 'standard' | 'express' | 'priority';
  address: string;
  phoneNumber: string;
  instructions?: string;
  estimatedFee: number;
};

export type DeliveryStatus = {
  id: string;
  orderId: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  driverName?: string;
  driverPhone?: string;
  estimatedArrival?: string;
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
};

export async function requestDelivery(deliveryData: DeliveryRequest): Promise<DeliveryStatus> {
  const res = await fetch(`${API.delivery}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deliveryData),
  });
  
  if (!res.ok) {
    throw new Error('Failed to request delivery');
  }
  
  return res.json();
}

export async function trackDelivery(trackingNumber: string): Promise<DeliveryStatus> {
  const res = await fetch(`${API.delivery}/track/${trackingNumber}`);
  
  if (!res.ok) {
    throw new Error('Failed to track delivery');
  }
  
  return res.json();
}

export async function getDeliveryHistory(userId: string): Promise<DeliveryStatus[]> {
  const res = await fetch(`${API.delivery}/history/${userId}`);
  
  if (!res.ok) {
    throw new Error('Failed to get delivery history');
  }
  
  return res.json();
}

export async function cancelDelivery(deliveryId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API.delivery}/${deliveryId}/cancel`, {
    method: 'POST',
  });
  
  if (!res.ok) {
    throw new Error('Failed to cancel delivery');
  }
  
  return res.json();
}

export async function getDeliveryFee(
  fromAddress: string, 
  toAddress: string, 
  deliverySpeed: string
): Promise<{ fee: number; estimatedTime: string }> {
  const params = new URLSearchParams({
    from: fromAddress,
    to: toAddress,
    speed: deliverySpeed,
  });
  
  const res = await fetch(`${API.delivery}/calculate-fee?${params}`);
  
  if (!res.ok) {
    throw new Error('Failed to calculate delivery fee');
  }
  
  return res.json();
}