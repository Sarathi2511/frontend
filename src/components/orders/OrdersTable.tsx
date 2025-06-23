import React from 'react';
import { format } from 'date-fns';
import { Loader2, MoreHorizontal, Printer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { Order, OrderStatus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn, generateOrderPDF } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface OrdersTableProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onMarkPaid: (order: Order) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onUpdateOrder: (order: Order) => void;
  isUpdateLoading: boolean;
  formatCurrency: (value: number) => string;
}

export function OrdersTable({
  orders,
  onViewOrder,
  onDeleteOrder,
  onMarkPaid,
  onStatusChange,
  onUpdateOrder,
  isUpdateLoading,
  formatCurrency
}: OrdersTableProps) {
  const { isExecutive, isAdmin, user } = useAuth();
  const getOrderId = (order: Order) => order._id || order.id || '';
  const getDisplayOrderId = (order: Order) => {
    if (order.orderNumber) {
      return order.orderNumber;
    } else {
      return `#${(order._id || order.id || '').substring(0, 8)}`;
    }
  };

  return (
    <div className="rounded-md border-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow 
              key={getOrderId(order)} 
              className="transition-all hover:bg-muted/50"
            >
              <TableCell className="font-medium">{getDisplayOrderId(order)}</TableCell>
              <TableCell>
                <button 
                  onClick={() => onViewOrder(order)}
                  className="text-left hover:text-primary hover:underline transition-colors cursor-pointer flex items-center gap-1 w-full"
                  title="Click to view order details"
                >
                  {order.customerName}
                </button>
              </TableCell>
              <TableCell>
                {format(new Date(order.createdAt), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <OrderStatusBadge order={order} />
                  <PaymentStatusBadge 
                    order={order} 
                    onClick={order.isPaid ? undefined : () => onMarkPaid(order)}
                  />
                </div>
              </TableCell>
              <TableCell>
                {order.priority === 'urgent' && (
                  <Badge
                    className="bg-red-100 text-red-800 hover:bg-red-100 text-xs py-0 h-5"
                  >
                    Urgent
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatCurrency(order.total)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onViewOrder(order)}
                      >
                        View details
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={() => generateOrderPDF(order)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print to PDF
                      </DropdownMenuItem>
                      
                      {!isExecutive && (isAdmin || (order.assignedTo === user?._id || order.assignedTo === user?.id)) && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateOrder(order)}
                          >
                            Edit Order
                          </DropdownMenuItem>
                          
                          {(isAdmin || (order.status === 'dispatched' && !order.isPaid)) && (
                            <DropdownMenuItem 
                              onClick={() => onMarkPaid(order)}
                              disabled={order.isPaid}
                            >
                              Mark as Paid
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={order.status === 'pending' || isUpdateLoading}
                            onClick={() => onStatusChange(getOrderId(order), 'pending')}
                          >
                            {isUpdateLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Mark as Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={order.status === 'dc' || isUpdateLoading}
                            onClick={() => onStatusChange(getOrderId(order), 'dc')}
                          >
                            {isUpdateLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Generate DC
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={order.status === 'invoice' || isUpdateLoading}
                            onClick={() => onStatusChange(getOrderId(order), 'invoice')}
                          >
                            {isUpdateLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Generate Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={order.status === 'dispatched' || isUpdateLoading}
                            onClick={() => onStatusChange(getOrderId(order), 'dispatched')}
                          >
                            {isUpdateLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Mark as Dispatched
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isAdmin && (
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDeleteOrder(order)}
                            >
                              Delete Order
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
