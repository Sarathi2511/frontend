import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Order } from '@/lib/types';

interface MarkPaidDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onMarkPaid: (orderId: string) => void;
  formatCurrency: (value: number) => string;
}

export function MarkPaidDialog({
  isOpen,
  onOpenChange,
  order,
  onMarkPaid,
  formatCurrency,
}: MarkPaidDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleMarkPaid = async () => {
    if (!order) return;
    
    setIsLoading(true);
    try {
      await onMarkPaid(order.id || order._id || '');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Order as Paid</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this order as paid? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Order ID:</span> {order.orderNumber || order.id?.substring(0, 8)}
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Customer:</span> {order.customerName}
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span> {formatCurrency(order.total)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMarkPaid}
            disabled={isLoading}
            className="gap-1"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark as Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 