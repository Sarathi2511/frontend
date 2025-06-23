import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Order, OrderStatus, Staff } from '@/lib/types';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { PaymentStatusBadge } from '@/components/orders/PaymentStatusBadge';
import { fetchStaff } from '@/lib/api';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { Trash, Clipboard, Printer, Pencil, Calendar, CircleDollarSign, FileText } from 'lucide-react';
import { cn, generateOrderPDF } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface OrderViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onMarkPaid?: (orderId: string) => void;
  onEditOrder?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
  formatCurrency: (value: number) => string;
}

export function OrderViewDialog({
  isOpen,
  onOpenChange,
  order,
  onStatusChange,
  onMarkPaid,
  onEditOrder,
  onDeleteOrder,
  formatCurrency
}: OrderViewDialogProps) {
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<any>(null);
  const { user, isAdmin, isExecutive } = useAuth();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isMobileOrTablet = isMobile || isTablet;
  
  const getOrderId = (order: Order | null) => {
    if (!order) return '';
    return order._id || order.id || '';
  };
  
  const getDisplayOrderId = (order: Order | null) => {
    if (!order) return '';
    if (order.orderNumber) {
      return order.orderNumber;
    } else {
      return `#${(order._id || order.id || '').substring(0, 8)}`;
    }
  };

  const getPaymentConditionText = (condition?: string) => {
    switch (condition) {
      case 'immediate':
        return 'Immediate';
      case 'days15':
        return '>15 Days';
      case 'days30':
        return '>30 Days';
      default:
        return 'Not specified';
    }
  };

  const getPriorityText = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      default:
        return 'Normal';
    }
  };
  
  // Fetch staff members data when dialog opens
  useEffect(() => {
    if (!isOpen || !order) return;
    
    const fetchStaffData = async () => {
      try {
        // Fetch all staff members
        const allStaff = await fetchStaff();
        setStaffMembers(allStaff);
        
        // If order has assignedTo, find that staff member in the fetched list
        if (order.assignedTo) {
          const assignedStaff = allStaff.find(staff => 
            staff._id === order.assignedTo || staff.id === order.assignedTo
          );
          if (assignedStaff) {
            // We keep all staff in staffMembers but highlight the assigned one in UI
          }
        }
        
        // If order has deliveryPerson, find that staff member in the fetched list
        if (order.deliveryPerson) {
          const foundDeliveryStaff = allStaff.find(staff => 
            staff._id === order.deliveryPerson || staff.id === order.deliveryPerson
          );
          if (foundDeliveryStaff) {
            setDeliveryStaff(foundDeliveryStaff);
          }
        } else {
          setDeliveryStaff(null);
        }
      } catch (error) {
        console.error("Error fetching staff data:", error);
      }
    };
    
    fetchStaffData();
  }, [isOpen, order]);

  // Get assigned staff member name
  const getAssignedStaffName = () => {
    if (!order || !order.assignedTo || staffMembers.length === 0) {
      return 'Not Assigned';
    }
    
    const assignedStaff = staffMembers.find(staff => 
      staff._id === order.assignedTo || staff.id === order.assignedTo
    );
    
    return assignedStaff ? assignedStaff.name : 'Unknown Staff';
  };
  
  // Get delivery person name
  const getDeliveryPersonName = () => {
    if (!order || !order.deliveryPerson) {
      return 'Not Assigned';
    }
    
    return deliveryStaff ? deliveryStaff.name : 'Unknown Staff';
  };
  
  // Early return after all hooks are defined
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[800px] max-h-[90vh] overflow-y-auto",
        isMobile && "p-3 w-[95vw] max-w-full"
      )}>
        <DialogHeader className={cn(isMobile && "mb-2")}>
          <DialogTitle className={cn(isMobile && "text-lg")}>Order Details</DialogTitle>
          <DialogDescription className={cn(isMobile && "text-xs")}>
            View the complete details of this order.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("space-y-6 mt-4", isMobile && "space-y-4 mt-2")}>
          {/* Mobile/Tablet status change options */}
          {isMobileOrTablet && (
            <div className="border rounded-md p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Update Order Status</p>
                <Select
                  defaultValue={order.status}
                  onValueChange={(value) => onStatusChange(getOrderId(order), value as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="dc">DC Generated</SelectItem>
                    <SelectItem value="invoice">Invoice Generated</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col gap-2">
                {!order.isPaid && onMarkPaid && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      onMarkPaid(getOrderId(order));
                    }}
                  >
                    Mark as Paid
                  </Button>
                )}
                
                {onDeleteOrder && (
                  <Button 
                    variant="destructive" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => {
                      onOpenChange(false);
                      onDeleteOrder(order);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                    Delete Order
                  </Button>
                )}
              </div>
            </div>
          )}

          {order.orderImage && (
            <div className="w-full">
              <p className={cn("font-medium mb-2", isMobile ? "text-xs" : "text-sm")}>Order Image</p>
              <div className="border rounded-md overflow-hidden">
                <img 
                  src={order.orderImage} 
                  alt="Order document" 
                  className="w-full h-auto max-h-[200px] object-contain"
                  onClick={() => window.open(order.orderImage, '_blank')}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Click image to view full size</p>
            </div>
          )}

          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2 gap-3" : "grid-cols-1 sm:grid-cols-2"
          )}>
            <div className={cn(isMobile && "col-span-2")}>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Order ID</p>
              <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{getDisplayOrderId(order)}</p>
            </div>
            <div className={cn(isMobile && "col-span-2")}>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Date</p>
              <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                {format(new Date(order.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className={cn(isMobile && "col-span-2")}>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Customer</p>
              <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{order.customerName}</p>
            </div>
            <div className={cn(isMobile && "col-span-2")}>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Status</p>
              <p className={cn("mt-1 flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                <OrderStatusBadge order={order} />
                <PaymentStatusBadge 
                  order={order} 
                  onClick={onMarkPaid && order.isPaid === false ? () => {
                    onMarkPaid(getOrderId(order));
                    onOpenChange(false);
                  } : undefined}
                />
              </p>
            </div>
            <div>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Payment Condition</p>
              <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                {getPaymentConditionText(order.paymentCondition)}
              </p>
            </div>
            <div>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Priority</p>
              <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                {getPriorityText(order.priority)}
              </p>
            </div>
            <div className={cn(isMobile && "col-span-2")}>
              <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Assigned To</p>
              <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                {getAssignedStaffName()}
              </p>
            </div>
            
            {order.status === 'dispatched' && (
              <div className={cn(isMobile && "col-span-2")}>
                <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Delivery Person</p>
                <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                  {getDeliveryPersonName()}
                </p>
              </div>
            )}
            
            {order.paidAt && (
              <div>
                <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Payment Date</p>
                <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                  {format(new Date(order.paidAt.toString()), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {order.dispatchDate && (
              <div>
                <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Dispatch Date</p>
                <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                  {format(new Date(order.dispatchDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {order.customerEmail && (
              <div className={cn(isMobile && "col-span-2")}>
                <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Email</p>
                <p className={cn("text-muted-foreground break-words", isMobile ? "text-xs" : "text-sm")}>{order.customerEmail}</p>
              </div>
            )}
            {order.customerPhone && (
              <div>
                <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Phone</p>
                <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{order.customerPhone}</p>
              </div>
            )}
            {order.customerAddress && (
              <div className={cn(isMobile && "col-span-2")}>
                <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Address</p>
                <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{order.customerAddress}</p>
              </div>
            )}
          </div>

          <div className={cn("mt-6", isMobile && "mt-4")}>
            <p className={cn("font-medium mb-2", isMobile ? "text-xs" : "text-sm")}>Items</p>
            <div className="border rounded-md overflow-x-auto">
              {isMobile ? (
                <div className="p-2 space-y-3">
                  {(order.orderItems || order.items || []).map((item, index) => (
                    <Card key={item._id || item.id || index} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="text-xs font-medium mb-2 truncate">{item.productName}</div>
                        <div className="grid grid-cols-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <div className="font-medium">{item.quantity}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <div className="font-medium">{formatCurrency(item.price)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={cn("min-w-[160px]", isMobile && "text-xs py-2")}>Item</TableHead>
                      <TableHead className={cn("text-right w-[80px]", isMobile && "text-xs py-2")}>Qty</TableHead>
                      <TableHead className={cn("text-right w-[100px]", isMobile && "text-xs py-2")}>Price</TableHead>
                      <TableHead className={cn("text-right w-[100px]", isMobile && "text-xs py-2")}>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.orderItems || order.items || []).map((item, index) => (
                      <TableRow key={item._id || item.id || index}>
                        <TableCell className={cn("max-w-[200px] truncate", isMobile && "text-xs py-2")}>
                          {item.productName}
                        </TableCell>
                        <TableCell className={cn("text-right", isMobile && "text-xs py-2")}>
                          {item.quantity}
                        </TableCell>
                        <TableCell className={cn("text-right", isMobile && "text-xs py-2")}>
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className={cn("text-right", isMobile && "text-xs py-2")}>
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className={cn("flex justify-between pt-4 border-t", isMobile && "pt-3")}>
            <p className={cn("font-medium", isMobile ? "text-sm" : "text-sm")}>Total</p>
            <p className={cn(isMobile ? "text-base font-bold" : "text-lg font-semibold")}>
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>

        <DialogFooter className={cn("mt-6", isMobile && "mt-4 flex-col gap-2")}>
          <div className={cn(
            "flex gap-2 w-full", 
            isMobile ? "flex-col" : "flex-col sm:flex-row"
          )}>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
              size={isMobile ? "sm" : "default"}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => generateOrderPDF(order)}
              className="w-full"
              size={isMobile ? "sm" : "default"}
            >
              <Printer className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
              Print to PDF
            </Button>
            {onEditOrder && (
              <Button
                onClick={() => {
                  onEditOrder(order);
                  onOpenChange(false);
                }}
                className="w-full"
                size={isMobile ? "sm" : "default"}
              >
                Edit Order
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}