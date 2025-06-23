import React from 'react';
import { Order, OrderStatus } from '@/lib/types';

interface OrderStatusBadgeProps {
  order: Order;
}

export function OrderStatusBadge({ order }: OrderStatusBadgeProps) {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'dc':
        return 'bg-blue-100 text-blue-800';
      case 'invoice':
        return 'bg-purple-100 text-purple-800';
      case 'dispatched':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'dc':
        return 'DC Generated';
      case 'invoice':
        return 'Invoice Generated';
      case 'dispatched':
        return 'Dispatched';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
        order.status
      )}`}
    >
      {getStatusText(order.status)}
    </span>
  );
}
