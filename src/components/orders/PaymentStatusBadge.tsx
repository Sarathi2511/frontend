import React from 'react';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/lib/types';

interface PaymentStatusBadgeProps {
  order: Order;
  onClick?: () => void;
}

export function PaymentStatusBadge({ order, onClick }: PaymentStatusBadgeProps) {
  // Skip if order is already marked as paid
  if (order.isPaid) {
    return (
      <Badge variant="outline" className="ml-2 bg-green-600 text-white">
        Paid
      </Badge>
    );
  }

  // Only show payment status for dispatched orders
  if (order.status !== 'dispatched' || !order.dispatchDate) {
    return null;
  }

  const dispatchDate = new Date(order.dispatchDate);
  const today = new Date();
  const daysSinceDispatch = differenceInDays(today, dispatchDate);
  
  // Determine if payment is due based on the payment condition
  let isPaymentDue = false;
  
  switch (order.paymentCondition) {
    case 'immediate':
      isPaymentDue = true; // Always due for immediate payment
      break;
    case 'days15':
      isPaymentDue = daysSinceDispatch >= 15;
      break;
    case 'days30':
      isPaymentDue = daysSinceDispatch >= 30;
      break;
    default:
      isPaymentDue = true; // Default to payment due if condition not specified
  }
  
  if (!isPaymentDue) {
    return null;
  }
  
  return (
    <Badge 
      variant="destructive" 
      className="ml-2 cursor-pointer"
      onClick={onClick}
    >
      Payment Due
    </Badge>
  );
} 