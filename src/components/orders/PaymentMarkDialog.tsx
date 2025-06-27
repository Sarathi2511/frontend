import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fetchStaff } from '@/lib/api';
import { toast } from 'sonner';

interface PaymentMarkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onMarkPaid: (orderId: string, paidBy: string, paymentReceivedBy: string) => Promise<void>;
  formatCurrency: (value: number) => string;
}

export function PaymentMarkDialog({
  isOpen,
  onOpenChange,
  order,
  onMarkPaid,
  formatCurrency,
}: PaymentMarkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string; }>>([]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [paymentReceivedBy, setPaymentReceivedBy] = useState<string>('');
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Load staff members when dialog opens
  useEffect(() => {
    const fetchStaffMembers = async () => {
      if (!isOpen) return;
      
      setIsLoadingStaff(true);
      try {
        const staff = await fetchStaff();
        const formattedStaff = staff.map((member: any) => ({
          id: member._id || member.id,
          name: member.name
        }));
        setStaffMembers(formattedStaff);
      } catch (error) {
        console.error('Failed to fetch staff members:', error);
        toast.error('Failed to load staff members');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaffMembers();
  }, [isOpen]);

  const handleMarkPaid = async () => {
    if (!order || !paidBy || !paymentReceivedBy) return;
    
    setIsLoading(true);
    try {
      await onMarkPaid(order._id || order.id || '', paidBy, paymentReceivedBy);
      toast.success('Order marked as paid successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to mark order as paid:', error);
      toast.error('Failed to mark order as paid');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset selected staff when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPaidBy('');
      setPaymentReceivedBy('');
    }
  }, [isOpen]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Order as Paid</DialogTitle>
          <DialogDescription>
            Please select who marked this order as paid and who received the payment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Order ID:</span> {order.orderNumber || (order._id?.substring(0, 8))}
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Customer:</span> {order.customerName}
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span> {formatCurrency(order.total)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid-by">Who marked it as Paid?</Label>
            {isLoadingStaff ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={paidBy}
                onValueChange={setPaidBy}
                disabled={isLoading || staffMembers.length === 0}
              >
                <SelectTrigger id="paid-by">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                  {staffMembers.length === 0 && (
                    <SelectItem value="none" disabled>
                      No staff available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-received-by">Who has received the payment?</Label>
            {isLoadingStaff ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={paymentReceivedBy}
                onValueChange={setPaymentReceivedBy}
                disabled={isLoading || staffMembers.length === 0}
              >
                <SelectTrigger id="payment-received-by">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                  {staffMembers.length === 0 && (
                    <SelectItem value="none" disabled>
                      No staff available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMarkPaid}
            disabled={isLoading || !paidBy || !paymentReceivedBy}
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