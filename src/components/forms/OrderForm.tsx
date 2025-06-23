import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2, Upload, CalendarIcon, Search } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { OrderStatus, PaymentCondition, Product, ProductDimension, OrderItem, User, Order, OrderPriority } from '@/lib/types';
import { createOrder, fetchStaff, fetchProducts, updateProduct, updateOrder, updateOrderWithImage, createProduct } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
  customerEmail: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  customerAddress: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'dc', 'invoice', 'dispatched']),
  paymentCondition: z.enum(['immediate', 'days15', 'days30']),
  priority: z.enum(['urgent', 'normal']),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  onSuccess?: () => void;
  initialOrder?: Order;
  onCancel?: () => void;
}

export default function OrderForm({ onSuccess, initialOrder, onCancel }: OrderFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [orderImage, setOrderImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialOrder?.orderImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(() => {
    // Initialize order items immediately if initialOrder is provided
    if (initialOrder?.orderItems && initialOrder.orderItems.length > 0) {
      return initialOrder.orderItems.map(item => ({
        id: item._id || item.id || Math.random().toString(36).substring(2, 9),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        dimension: item.dimension
      }));
    }
    return [];
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
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
  
  // Fetch products from API
  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const fetchedProducts = await fetchProducts();
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error loading products:", error);
        toast.error("Failed to load products");
      } finally {
        setProductsLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
  // Filter products based on search term - similar to UpdateOrderForm
  const filteredProducts = productSearch.trim() === ''
    ? products
    : products.filter(product => {
        return product.name.toLowerCase().includes(productSearch.toLowerCase());
      });
      
  // Handle product selection from search results
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product._id || product.id);
    setProductSearch(product.name);
    setPrice('');
    setShowProductResults(false);
  };
  
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
  
  // Initialize form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: initialOrder?.customerName || '',
      customerPhone: initialOrder?.customerPhone || '',
      customerEmail: initialOrder?.customerEmail || '',
      customerAddress: initialOrder?.customerAddress || '',
      status: (initialOrder?.status as OrderStatus) || 'pending',
      paymentCondition: (initialOrder?.paymentCondition as PaymentCondition) || 'immediate',
      priority: (initialOrder?.priority as OrderPriority) || 'normal',
      assignedTo: initialOrder?.assignedTo || 'all',
      notes: initialOrder?.notes || '',
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

  // Add item to order
  const handleAddItem = () => {
    const quantityValue = parseInt(quantity) || 0;
    const priceValue = parseFloat(price) || 0;
    if (!selectedProduct || quantityValue <= 0 || priceValue <= 0) return;
    
    const product = products.find(p => p._id === selectedProduct || p.id === selectedProduct);
    if (!product) return;
    
    // Check if we already have this product in our items (match by both productId and price)
    const existingItemIndex = orderItems.findIndex(
      item => item.productId === selectedProduct && item.price === priceValue
    );
    
    if (existingItemIndex >= 0) {
      // Update the existing item
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantityValue;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: Math.random().toString(36).substring(2, 9),
        productId: product._id || product.id || '',
        productName: product.name,
        quantity: quantityValue,
        price: priceValue,
        dimension: product.dimension
      };
      setOrderItems([...orderItems, newItem]);
    }
    
    // Reset selection
    setSelectedProduct('');
    setQuantity('');
    setPrice('');
    setProductSearch('');
    setShowProductResults(false);
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
      const dispatchDate = values.status === 'dispatched' ? new Date() : undefined;
      
      // Clean up order items to match backend expectations
      const sanitizedItems = orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        dimension: item.dimension
      }));
      
      // Create the base order data
      const orderData: any = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail || undefined, // Make email optional
        customerAddress: values.customerAddress || undefined, // Make address optional
        status: values.status,
        paymentCondition: values.paymentCondition,
        priority: values.priority,
        assignedTo: values.assignedTo === 'all' ? null : values.assignedTo,
        notes: values.notes || '',
        items: sanitizedItems,
        total: calculateTotal(),
        isPaid: initialOrder?.isPaid || false,
      };

      // Add createdBy only if we're creating a new order
      if (!initialOrder) {
        orderData.createdBy = user?._id || user?.id || '1';
      }

      // Create a new object with the dispatchDate if needed
      const finalOrderData = dispatchDate 
        ? { ...orderData, dispatchDate: dispatchDate.toISOString() } // Convert Date to string
        : orderData;
      
      console.log(`Preparing to ${initialOrder ? 'update' : 'create'} order with data:`, finalOrderData);
      
      let createdOrUpdatedOrder;
      
      // Check if we're updating an existing order or creating a new one
      if (initialOrder) {
        // Update existing order
        if (orderImage) {
          // If we have a new image, use FormData
          const formData = new FormData();
          formData.append('orderData', JSON.stringify(finalOrderData));
          formData.append('orderImage', orderImage);
          
          createdOrUpdatedOrder = await updateOrderWithImage(initialOrder._id, formData);
        } else {
          // Update without changing the image
          createdOrUpdatedOrder = await updateOrder(initialOrder._id, finalOrderData);
        }
        
        toast.success('Order updated successfully');
        
        // Notification system removed as per requirements
      } else {
        // Create new order
        // Create form data
        const formData = new FormData();
        
        // Add order data - ensure it's a string
        formData.append('orderData', JSON.stringify(finalOrderData));
        
        // Add image if exists
        if (orderImage) {
          console.log('Adding image to order:', orderImage.name, orderImage.type, orderImage.size);
          setUploadingImage(true);
          formData.append('orderImage', orderImage);
        }
        
        createdOrUpdatedOrder = await createOrder(formData);
        console.log('Order created successfully:', createdOrUpdatedOrder);
        
        // Notification system removed as per requirements
        
        toast.success('Order created successfully');
      }
      
      // Update product stock (only for new orders)
      if (!initialOrder) {
        for (const item of orderItems) {
          try {
            const product = products.find(p => (p._id === item.productId) || (p.id === item.productId));
            if (product) {
              const newStock = Math.max(0, product.stock - item.quantity);
              await updateProduct(product._id || product.id || '', { stock: newStock });
            }
          } catch (stockError) {
            console.error(`Error updating stock for product ${item.productId}:`, stockError);
            // Continue with next product even if one fails
          }
        }
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/orders');
      }
    } catch (error: any) {
      console.error(`Error ${initialOrder ? 'updating' : 'creating'} order:`, error);
      toast.error(`Error ${initialOrder ? 'updating' : 'creating'} order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };

  // Handle navigation back to orders page
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    
    try {
      // First attempt with React Router navigation
      navigate('/orders');
      
      // Set a timeout to check if we're still on the same page
      setTimeout(() => {
        // If still showing order form, force redirect using window.location
        if (window.location.pathname.includes('/orders')) {
          console.log('Using fallback navigation method');
          window.location.href = '/orders';
        }
      }, 100);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to direct location change
      window.location.href = '/orders';
    }
  };

  // Handle create new product
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
      setSelectedProduct(newProduct._id || newProduct.id);
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

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{initialOrder ? 'Update Order' : 'Create New Order'}</h2>
          <p className="text-sm text-muted-foreground">
            {initialOrder ? 'Edit the existing order details' : 'Add a new customer order to the system'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes or details here"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Order Image (Optional)</FormLabel>
                <div className="mt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full sm:w-auto"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG or GIF, max 5MB
                    </p>
                  </div>
                  
                  {imagePreview && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Order Preview"
                          className="rounded-md max-h-[200px] object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => {
                            setOrderImage(null);
                            setImagePreview(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Order Items */}
            <div className="space-y-4">
              <h3 className="text-md sm:text-lg font-medium">Order Items</h3>
              
              <div className="space-y-2">
                <div ref={searchRef} className="relative mb-4">
                  <Label htmlFor="product">Product</Label>
                  <div className="mt-1.5">
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
                  </div>
                  
                  {selectedProduct && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {(() => {
                        const product = products.find(p => p._id === selectedProduct || p.id === selectedProduct);
                        if (product) {
                          return (
                            <span>
                              Selected: <strong>{product.name}</strong> - 
                              <span className="font-medium">{product.dimension || 'Pc'}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  
                  {/* Search results */}
                  {showProductResults && productSearch && (
                    <div className="absolute w-full z-10 mt-1 border rounded-md bg-background shadow-lg">
                      <ScrollArea className="h-60">
                        {productsLoading ? (
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
                            {filteredProducts.map((product) => (
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
                                  <div className="text-xs text-muted-foreground">
                                    {product.dimension || 'Pc'}
                                  </div>
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
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
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
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                            <TableCell className="text-center">{item.dimension || 'Pc'}</TableCell>
                            <TableCell className="text-right p-0 pr-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
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
                  <p className="text-muted-foreground">No items added yet</p>
                </div>
              )}
              
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
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isLoading || uploadingImage}
            >
              {(isLoading || uploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploadingImage ? 'Uploading Image...' : 
               isLoading ? (initialOrder ? 'Updating Order...' : 'Creating Order...') : 
               (initialOrder ? 'Update Order' : 'Create Order')}
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
