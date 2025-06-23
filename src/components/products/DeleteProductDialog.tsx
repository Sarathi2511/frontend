import React, { useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from "lucide-react";
import { Product } from '@/lib/types';
import { toast } from 'sonner';

interface DeleteProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onDelete: (productId: string) => Promise<void>;
}

export function DeleteProductDialog({
  isOpen,
  onOpenChange,
  product,
  onDelete,
}: DeleteProductDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const productRef = useRef<Product | null>(null);
  
  // Store product in ref when it changes
  useEffect(() => {
    if (product) {
      console.log("Storing product in ref:", product);
      productRef.current = product;
    }
  }, [product]);
  
  // When dialog opens, log the product data
  useEffect(() => {
    if (isOpen) {
      console.log('Delete Dialog Opened');
      console.log('Product passed to dialog:', product);
      console.log('Product stored in ref:', productRef.current);
      
      // If no product is available, show error and close dialog
      if (!product && !productRef.current) {
        console.error('Product is null or undefined');
        toast.error("Cannot delete: Product information is missing");
        onOpenChange(false);
      }
    }
  }, [isOpen, product, onOpenChange]);

  const handleDelete = async () => {
    // Use either current product or stored product from ref
    const productToDelete = product || productRef.current;
    
    if (!productToDelete) {
      toast.error("Cannot delete: Product information is missing");
      onOpenChange(false);
      return;
    }
    
    const productId = productToDelete._id || productToDelete.id;
    if (!productId) {
      toast.error("Cannot delete: Product ID is missing");
      onOpenChange(false);
      return;
    }
    
    setIsLoading(true);
    try {
      await onDelete(productId);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsLoading(false);
    }
  };

  // No product to display
  if (!product && !productRef.current) {
    return null;
  }

  // Use either current product or stored product from ref
  const productToShow = product || productRef.current;
  
  // Get safe values with fallbacks
  const productName = productToShow?.name || 'Unknown Product';
  const productStock = productToShow?.stock ?? 0;
  const productDimension = productToShow?.dimension || 'Pc';
  const productPrice = productToShow?.price ?? 0;
  
  // Format the price with thousand separators
  const formattedPrice = `₹${productPrice.toLocaleString()}`;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this product? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <p><strong>Product Name:</strong> {productName}</p>
          <p><strong>Current Stock:</strong> {productStock} {productDimension}</p>
          <p><strong>Price:</strong> {formattedPrice}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 