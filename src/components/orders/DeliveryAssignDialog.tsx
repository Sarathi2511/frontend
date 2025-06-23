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
import { getAllStaffAttendanceByDate } from '@/lib/api';
import { toast } from 'sonner';

interface DeliveryAssignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onAssignDelivery: (orderId: string, staffId: string) => Promise<void>;
}

export function DeliveryAssignDialog({
  isOpen,
  onOpenChange,
  order,
  onAssignDelivery,
}: DeliveryAssignDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<Array<{ staffId: string; name: string; }>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Load available staff who are present today
  useEffect(() => {
    const fetchAvailableStaff = async () => {
      if (!isOpen || !order) return;
      
      setIsLoadingStaff(true);
      try {
        // Format today's date as YYYY-MM-DD
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        
        // Fetch staff attendance for today
        const response = await getAllStaffAttendanceByDate(formattedDate);
        
        // Filter staff who are present today
        const presentStaff = response.staffAttendance
          .filter((staff: any) => staff.attendance && staff.attendance.isPresent)
          .map((staff: any) => ({
            staffId: staff.staffId,
            name: staff.name
          }));
        
        setAvailableStaff(presentStaff);
      } catch (error) {
        console.error('Failed to fetch available staff:', error);
        toast.error('Failed to load available staff');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchAvailableStaff();
  }, [isOpen, order]);

  const handleAssignDelivery = async () => {
    if (!order || !selectedStaffId) return;
    
    setIsLoading(true);
    try {
      await onAssignDelivery(order._id || order.id || '', selectedStaffId);
      toast.success('Delivery person assigned successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign delivery person:', error);
      toast.error('Failed to assign delivery person');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset selected staff when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStaffId('');
    }
  }, [isOpen]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Delivery Person</DialogTitle>
          <DialogDescription>
            Select a staff member to deliver this order.
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
              <span className="font-medium">Address:</span> {order.customerAddress || 'N/A'}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-person">Delivery Person</Label>
            {isLoadingStaff ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
                disabled={isLoading || availableStaff.length === 0}
              >
                <SelectTrigger id="delivery-person">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map(staff => (
                    <SelectItem key={staff.staffId} value={staff.staffId}>
                      {staff.name}
                    </SelectItem>
                  ))}
                  {availableStaff.length === 0 && (
                    <SelectItem value="none" disabled>
                      No staff available today
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
            onClick={handleAssignDelivery}
            disabled={isLoading || !selectedStaffId}
            className="gap-1"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign Delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 