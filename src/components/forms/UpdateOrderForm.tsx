import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2, Upload, Search, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

import { Order, OrderStatus, PaymentCondition, Product, OrderItem, User, OrderPriority, ProductDimension } from '@/lib/types';
import { updateOrder, updateOrderWithImage, fetchStaff, fetchProducts, updateProduct, createProduct } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Order form schema
const orderFormSchema = z.object({
  customerName: z.string().min(2, { message: 'Customer name is required' }),
  customerPhone: z.string().min(10, { message: 'Phone number is required' }),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerAddress: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'dc', 'invoice', 'dispatched']),
  paymentCondition: z.enum(['immediate', 'days15', 'days30']),
  priority: z.enum(['urgent', 'normal']),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface UpdateOrderFormProps {
  order: Order;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UpdateOrderForm({ order, onSuccess, onCancel }: UpdateOrderFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [orderImage, setOrderImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(order.orderImage || null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>('');
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  
  // Product creation dialog state
  const [isCreateProductDialogOpen, setIsCreateProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductDimension, setNewProductDimension] = useState<ProductDimension>('Pc');
  const [newProductThreshold, setNewProductThreshold] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  
  // Ref for detecting clicks outside the search dropdown
  const searchRef = React.useRef<HTMLDivElement>(null);
  
  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fetch products from API when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const productsData = await fetchProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Error loading products:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    loadProducts();
  }, []);
  
  // Fetch staff members when component mounts
  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        const staff = await fetchStaff();
        setStaffMembers(staff);
      } catch (error) {
        console.error("Error loading staff members:", error);
        toast.error("Failed to load staff members");
      }
    };
    
    loadStaffMembers();
  }, []);
  
  // Initialize order items from the existing order
  useEffect(() => {
    // Convert order items to the format expected by the form
    if (order.orderItems && order.orderItems.length > 0) {
      const formattedItems = order.orderItems.map(item => ({
        id: item._id || item.id || Math.random().toString(36).substring(2, 9),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        dimension: item.dimension || 'Pc'
      }));
      setOrderItems(formattedItems);
    } else if (order.items && order.items.length > 0) {
      // Fallback for orders that might have items in an 'items' property
      const formattedItems = order.items.map(item => ({
        id: item._id || item.id || Math.random().toString(36).substring(2, 9),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        dimension: item.dimension || 'Pc'
      }));
      setOrderItems(formattedItems);
    }
  }, [order]);
  
  // Initialize form with order data
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      customerAddress: order.customerAddress || '',
      status: order.status as OrderStatus,
      paymentCondition: order.paymentCondition as PaymentCondition || 'immediate',
      priority: order.priority as OrderPriority || 'normal',
      assignedTo: order.assignedTo || 'all',
      notes: order.notes || '',
    },
  });

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Compress the image before setting it
      compressImage(file).then(compressedFile => {
        setOrderImage(compressedFile);
        
        // Create a preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      }).catch(error => {
        console.error('Image compression failed:', error);
        // Fallback to original file if compression fails
        setOrderImage(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  // Function to compress images
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200; // Max dimension for the compressed image
          
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to Blob with quality compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }
              // Create a new file from the blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`Image compressed: ${file.size} -> ${compressedFile.size} bytes (${Math.round((compressedFile.size / file.size) * 100)}% of original)`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7 // Quality parameter: 0.7 = 70% quality, good balance between quality and size
          );
        };
        img.onerror = () => {
          reject(new Error('Error loading image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
    });
  };

  // Filter products based on search term
  const filteredProducts = productSearch.trim() === ''
    ? products
    : products.filter(product => {
        // Type assertion for products that might have 'sku' property
        const productWithSku = product as (Product & { sku?: string });
        
        return product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (productWithSku.sku && typeof productWithSku.sku === 'string' && productWithSku.sku.toLowerCase().includes(productSearch.toLowerCase()));
      });

  // Handle product selection from search results
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setPrice('');
    setShowProductResults(false);
  };
  
  // Handle creating a new product
  const handleCreateProduct = async () => {
    if (!newProductName || !newProductStock) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsCreatingProduct(true);
    
    try {
      // Parse the threshold value as number or undefined if empty
      const thresholdValue = newProductThreshold ? parseInt(newProductThreshold) : undefined;
      
      // Prepare the product data
      const productData = {
        name: newProductName,
        stock: parseInt(newProductStock),
        dimension: newProductDimension,
        threshold: thresholdValue,
      };
      
      // Create the product
      const newProduct = await createProduct(productData);
      
      // Add it to the products list
      setProducts([newProduct, ...products]);
      
      // Auto-select the new product
      setSelectedProduct(newProduct);
      setProductSearch(newProduct.name);
      
      // Reset form fields
      setNewProductName('');
      setNewProductStock('');
      setNewProductDimension('Pc');
      setNewProductThreshold('');
      
      // Close dialog
      setIsCreateProductDialogOpen(false);
      
      toast.success('Product created and added to order');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Add item to order
  const handleAddItem = () => {
    const quantityValue = parseInt(quantity) || 0;
    const priceValue = parseFloat(price) || 0;
    if (!selectedProduct || quantityValue <= 0 || priceValue <= 0) return;
    
    // No need to find the product again, we already have it as selectedProduct
    const productId = selectedProduct._id || selectedProduct.id;
    
    // Check if we already have this product in our items (match by both productId and price)
    const existingItemIndex = orderItems.findIndex(
      item => item.productId === productId && item.price === priceValue
    );
    
    if (existingItemIndex >= 0) {
      // Update the existing item
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantityValue;
      setOrderItems(updatedItems);
      toast.success(`Updated quantity for ${selectedProduct.name}`);
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: Math.random().toString(36).substring(2, 9),
        productId: productId,
        productName: selectedProduct.name,
        quantity: quantityValue,
        price: priceValue,
        dimension: selectedProduct.dimension || 'Pc'
      };
      setOrderItems([...orderItems, newItem]);
      toast.success(`Added ${selectedProduct.name} to order`);
    }
    
    // Reset selection
    setSelectedProduct(null);
    setProductSearch('');
    setQuantity('');
    setPrice('');
    setShowProductResults(false);
  };

  // Update item quantity directly
  const handleUpdateItemQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const updatedItems = orderItems.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setOrderItems(updatedItems);
    toast.success('Item quantity updated');
  };
  
  // Update item price
  const handleUpdateItemPrice = (id: string, newPrice: number) => {
    if (newPrice <= 0) return;
    
    const updatedItems = orderItems.map(item => 
      item.id === id ? { ...item, price: newPrice } : item
    );
    
    setOrderItems(updatedItems);
    toast.success('Item price updated');
  };

  // Remove item from order
  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  // Calculate order total
  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  // Handle form submission
  const onSubmit = async (values: OrderFormValues) => {
    if (orderItems.length === 0) {
      toast.error('Please add at least one product to the order');
      return;
    }

    setIsLoading(true);
    
    try {
      // Set dispatchDate if status is dispatched
      const dispatchDate = values.status === 'dispatched' ? new Date().toISOString() : undefined;
      
      // Track inventory changes
      const inventoryAdjustments: Record<string, number> = {};
      
      // Calculate inventory adjustments by comparing original quantities with new quantities
      const originalItems = [...(order.orderItems || order.items || [])];
      
      // First, track what was in the original order
      originalItems.forEach(originalItem => {
        const productId = originalItem.productId;
        // Negative means we'll need to add this back to inventory
        inventoryAdjustments[productId] = -originalItem.quantity;
      });
      
      // Then, track what's in the updated order
      orderItems.forEach(newItem => {
        const productId = newItem.productId;
        if (productId in inventoryAdjustments) {
          // If product already exists, add the new quantity (will result in net adjustment)
          inventoryAdjustments[productId] += newItem.quantity;
        } else {
          // If it's a new product, just take the quantity
          inventoryAdjustments[productId] = newItem.quantity;
        }
      });
      
      // Clean up order items to match backend expectations
      const sanitizedItems = orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        dimension: item.dimension || 'Pc'
      }));
      
      // Create the base order data
      const orderData = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail || '',
        customerAddress: values.customerAddress || '',
        status: values.status,
        paymentCondition: values.paymentCondition,
        priority: values.priority,
        assignedTo: values.assignedTo === 'all' ? null : values.assignedTo,
        notes: values.notes || '',
        items: sanitizedItems,
        total: calculateTotal()
      };

      // Create a new object with the dispatchDate if needed
      const finalOrderData = dispatchDate 
        ? { ...orderData, dispatchDate } 
        : orderData;
      
      // Update the order first
      let updatedOrder;
      
      // If we need to update with a new image, we should use FormData
      if (orderImage) {
        const formData = new FormData();
        formData.append('orderData', JSON.stringify(finalOrderData));
        formData.append('orderImage', orderImage);
        
        // Use the update with FormData approach
        updatedOrder = await updateOrderWithImage(order._id, formData);
      } else {
        // Update order without changing the image
        updatedOrder = await updateOrder(order._id, finalOrderData);
      }
      
      // Only if the order updated successfully, update product inventories
      if (updatedOrder) {
        // Update product stock levels based on inventory adjustments
        for (const [productId, adjustment] of Object.entries(inventoryAdjustments)) {
          // Only make API calls if there's actually a change in quantity
          if (adjustment !== 0) {
            try {
              // Find the current product data
              const product = products.find(p => (p._id === productId || p.id === productId));
              
              if (product) {
                // Calculate new stock level (subtract because taking from inventory)
                // If adjustment is positive, we're using more product (reduce stock)
                // If adjustment is negative, we're using less product (increase stock)
                const newStock = Math.max(0, product.stock - adjustment);
                
                // Update the product stock
                await updateProduct(productId, { stock: newStock });
                console.log(`Updated product ${product.name} stock from ${product.stock} to ${newStock}`);
              }
            } catch (error) {
              console.error(`Error updating stock for product ${productId}:`, error);
              // Continue with other products even if one fails
            }
          }
        }
      }
      
      toast.success('Order updated successfully');
      
      // Notification system removed as per requirements
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Update Order</h2>
          <p className="text-sm text-muted-foreground">Edit the existing order details</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel || (() => navigate('/orders'))}
          className="sm:self-start"
        >
          Cancel
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-md sm:text-lg font-medium">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter customer address"
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Order Image Display */}
              {imagePreview && (
                <div className="space-y-2">
                  <FormLabel>Order Image</FormLabel>
                  <div className="relative w-full h-32">
                    <img 
                      src={imagePreview} 
                      alt="Order Preview" 
                      className="w-full h-full object-contain rounded-md border" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Order Settings */}
            <div className="space-y-4">
              <h3 className="text-md sm:text-lg font-medium">Order Settings</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="dc">DC Generated</SelectItem>
                          <SelectItem value="invoice">Invoice Generated</SelectItem>
                          <SelectItem value="dispatched">Dispatched</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {staffMembers.map((staff) => (
                            <SelectItem 
                              key={staff.id || staff._id} 
                              value={staff.id || staff._id}
                            >
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="paymentCondition"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Payment Condition</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-wrap gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="immediate" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Immediate
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="days15" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            15 Days
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="days30" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            30 Days
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Urgent Order?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-wrap gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="urgent" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Yes
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="normal" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            No
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <h3 className="text-md sm:text-lg font-medium">Order Items</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <p className="text-sm text-muted-foreground">Current items in order:</p>
                </div>
                
                {orderItems.length > 0 ? (
                  <Card>
                    <CardContent className="p-0 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Dimension</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="max-w-[120px] sm:max-w-none truncate">{item.productName}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemQuantity(item.id!, parseInt(e.target.value) || 1)}
                                  className="w-16 h-8 text-center p-1"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => handleUpdateItemPrice(item.id!, parseFloat(e.target.value) || item.price)}
                                  className="w-20 h-8 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                              <TableCell className="text-center">{item.dimension || 'Pc'}</TableCell>
                              <TableCell className="text-right p-0 pr-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(item.id!)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-6 border rounded-md border-dashed">
                    <p className="text-muted-foreground">No items in this order</p>
                  </div>
                )}
                
                <div className="mt-6">
                  <p className="text-sm font-medium mb-2">Add New Items</p>
                  <div className="relative" ref={searchRef}>
                    <div className="flex">
                      <Input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          if (e.target.value.trim() !== '') {
                            setShowProductResults(true);
                          } else {
                            setShowProductResults(false);
                          }
                        }}
                        placeholder="Search products"
                        className="rounded-r-none"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Qty"
                        className="w-full sm:w-20 rounded-r-none rounded-l-none border-l-0"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price"
                        className="w-full sm:w-24 rounded-l-none rounded-r-none border-l-0"
                      />
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!selectedProduct || !quantity || !price}
                        className="rounded-l-none"
                      >
                        Add
                      </Button>
                    </div>
                    
                    {/* Search results */}
                    {showProductResults && productSearch && (
                      <div className="absolute w-full z-10 mt-1 border rounded-md bg-background shadow-lg">
                        <ScrollArea className="h-60">
                          {isLoadingProducts ? (
                            <div className="p-4 text-center">
                              <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
                            </div>
                          ) : filteredProducts.length === 0 ? (
                            <div className="p-4">
                              <p className="text-sm text-center text-muted-foreground mb-2">
                                No products found
                              </p>
                              <Button 
                                onClick={() => {
                                  setIsCreateProductDialogOpen(true);
                                  setNewProductName(productSearch);
                                  setShowProductResults(false);
                                }}
                                variant="outline"
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create "{productSearch}"
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <div className="sticky top-0 p-2 bg-background border-b">
                                <Button 
                                  onClick={() => {
                                    setIsCreateProductDialogOpen(true);
                                    setNewProductName(productSearch);
                                    setShowProductResults(false);
                                  }}
                                  variant="outline"
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create new product
                                </Button>
                              </div>
                              {filteredProducts.map((product) => {
                                // Type assertion for product in the UI
                                const productWithSku = product as (Product & { sku?: string });
                                
                                return (
                                  <div
                                    key={product._id || product.id}
                                    className={cn(
                                      "flex items-center justify-between p-3 cursor-pointer hover:bg-muted transition-colors",
                                      product.stock <= 0 && "opacity-50"
                                    )}
                                    onClick={() => product.stock > 0 && handleSelectProduct(product)}
                                  >
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className={cn(
                                        "text-xs",
                                        product.stock <= 5 ? "text-destructive" : "text-muted-foreground"
                                      )}>
                                        Stock: {product.stock}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {orderItems.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-xl font-bold">₹{calculateTotal().toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel || (() => navigate('/orders'))}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Updating Order...' : 'Update Order'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Create Product Dialog */}
      <Dialog open={isCreateProductDialogOpen} onOpenChange={setIsCreateProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Fill in the details for your new product.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-product-name">Product Name</Label>
              <Input
                id="new-product-name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-product-stock">Initial Stock</Label>
              <Input
                id="new-product-stock"
                type="number"
                min="0"
                value={newProductStock}
                onChange={(e) => setNewProductStock(e.target.value)}
                placeholder="Enter initial stock"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-product-threshold">Low Stock Threshold</Label>
              <Input
                id="new-product-threshold"
                type="number"
                min="1"
                value={newProductThreshold}
                onChange={(e) => setNewProductThreshold(e.target.value)}
                placeholder="Enter threshold value"
              />
              <p className="text-xs text-muted-foreground">
                Alert will be shown when stock is below this number
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-product-dimension">Unit/Dimension</Label>
              <Select 
                value={newProductDimension} 
                onValueChange={(value) => setNewProductDimension(value as ProductDimension)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bag">Bag</SelectItem>
                  <SelectItem value="Bundle">Bundle</SelectItem>
                  <SelectItem value="Box">Box</SelectItem>
                  <SelectItem value="Carton">Carton</SelectItem>
                  <SelectItem value="Coils">Coils</SelectItem>
                  <SelectItem value="Dozen">Dozen</SelectItem>
                  <SelectItem value="Ft">Ft</SelectItem>
                  <SelectItem value="Gross">Gross</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Mtr">Mtr</SelectItem>
                  <SelectItem value="Pc">Pc</SelectItem>
                  <SelectItem value="Pkt">Pkt</SelectItem>
                  <SelectItem value="Set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={isCreatingProduct}>
              {isCreatingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}