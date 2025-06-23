import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Edit,
  Loader2,
  Package,
  Search,
  Trash,
  ChevronLeft,
  PlusCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Product, ProductDimension } from '@/lib/types';
import { fetchProducts, createProduct, updateProduct as updateProductAPI, deleteProduct as deleteProductAPI } from '@/lib/api';
import { useIsMobile, useIsSmallMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { DeleteProductDialog } from '@/components/products/DeleteProductDialog';

const ITEMS_PER_PAGE = 10;

// Memoized product card component for mobile view
const ProductCard = memo(({ 
  product, 
  onViewProduct, 
  onEditProduct, 
  onDeleteProduct,
  isSmallMobile
}: { 
  product: Product;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product, e?: React.MouseEvent) => void;
  onDeleteProduct: (product: Product, e?: React.MouseEvent) => void;
  isSmallMobile: boolean;
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditProduct(product, e);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteProduct(product, e);
  };
  
  return (
    <div 
      className="border rounded-md p-4 cursor-pointer bg-card hover:bg-muted/50 transition-colors will-change-transform"
      onClick={() => onViewProduct(product)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className={cn("font-medium", isSmallMobile ? "text-sm" : "text-base")}>{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant={product.stock === 0 ? "destructive" : (typeof product.threshold === 'number' && product.stock < product.threshold ? "destructive" : "outline")}
              className={cn(isSmallMobile && "text-xs")}
            >
              {product.stock} {product.dimension || 'items'}
            </Badge>
            {typeof product.threshold === 'number' && (
              <p className="text-xs text-muted-foreground">
                Threshold: {product.threshold}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-destructive" 
            onClick={handleDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// Memoized table row component for desktop view
const ProductRow = memo(({ 
  product, 
  onEditProduct, 
  onDeleteProduct 
}: { 
  product: Product;
  onEditProduct: (product: Product, e?: React.MouseEvent) => void;
  onDeleteProduct: (product: Product, e?: React.MouseEvent) => void;
}) => {
  return (
    <TableRow className="will-change-transform">
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>
        <Badge 
          variant={product.stock === 0 ? "destructive" : (typeof product.threshold === 'number' && product.stock < product.threshold ? "destructive" : "outline")}
        >
          {product.stock} {product.dimension || 'items'}
        </Badge>
      </TableCell>
      <TableCell>{product.dimension || 'N/A'}</TableCell>
      <TableCell>{typeof product.threshold === 'number' ? product.threshold : 'Not set'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={(e) => onEditProduct(product, e)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-destructive" 
            onClick={(e) => onDeleteProduct(product, e)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

ProductRow.displayName = 'ProductRow';

export default function Products() {
  const { isAuthenticated, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderAnimations, setRenderAnimations] = useState(false);
  
  // Form states
  const [productName, setProductName] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productDimension, setProductDimension] = useState<ProductDimension>('Pc');
  const [productThreshold, setProductThreshold] = useState('');

  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();
  const abortControllerRef = useRef<AbortController | null>(null);

  const navigate = useNavigate();

  // Fetch products when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setRenderAnimations(false);
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      try {
        const data = await fetchProducts();
        
        // Check if request was aborted before updating state
        if (signal.aborted) return;
        
        // Ensure all products have consistent ID properties
        const processedProducts = data.map((product: any) => {
          const processedProduct = { ...product };
          if (product._id && !product.id) {
            processedProduct.id = product._id;
          } else if (product.id && !product._id) {
            processedProduct._id = product.id;
          }
          return processedProduct;
        });
        
        setProducts(processedProducts);
        setCurrentPage(1); // Reset to first page
        
        // Delay animations until content is loaded
        setTimeout(() => {
          if (!signal.aborted) {
            setRenderAnimations(true);
          }
        }, 0);
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error loading products:', error);
          toast.error('Failed to load products');
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    if (isAuthenticated) {
      loadProducts();
    } else {
      toast.error('Authentication required');
      navigate('/login');
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, user, navigate]);

  // Populate form fields when editing a product
  useEffect(() => {
    if (selectedProduct && isEditing) {
      setProductName(selectedProduct.name || '');
      setProductStock(selectedProduct.stock.toString() || '');
      setProductDimension((selectedProduct.dimension as ProductDimension) || 'Pc');
      setProductThreshold(selectedProduct.threshold?.toString() || '');
    } else if (!isEditing) {
      // Reset form when not editing
      resetForm();
    }
  }, [selectedProduct, isEditing]);

  const resetForm = useCallback(() => {
    setProductName('');
    setProductStock('');
    setProductDimension('Pc');
    setProductThreshold('');
    setIsEditing(false);
    setSelectedProduct(null);
  }, []);

  const handleViewProduct = useCallback((product: Product) => {
    handleEditProduct(product);
  }, []);

  // Function to safely get product ID (supports both MongoDB _id and client-side id)
  const getProductId = useCallback((product: Product): string => {
    if (!product) return '';
    return String(product._id || product.id || '');
  }, []);

  // Enhanced handle edit product function
  const handleEditProduct = useCallback((product: Product) => {
    setSelectedProduct({...product});
    setIsProductFormOpen(true);
    setIsEditing(true);
  }, []);

  // Handle opening the delete dialog with product data
  const handleOpenDeleteDialog = useCallback((product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Immediately make a deep copy of the product
    const productData = JSON.parse(JSON.stringify(product));
    
    // Set product to delete and open dialog in single update
    setProductToDelete(productData);
    setIsDeleteDialogOpen(true);
  }, []);

  // Handle product deletion with better error handling
  const handleDeleteProduct = useCallback(async (productId: string): Promise<void> => {
    if (!productId) {
      console.error("Empty product ID provided to handleDeleteProduct");
      toast.error("Cannot delete: Missing product ID");
      return;
    }

    try {
      // Find the product before deletion
      const productToDelete = products.find(p => 
        (p._id === productId || p.id === productId)
      );
      
      if (!productToDelete) {
        console.error(`Product with ID ${productId} not found in products array`);
        toast.error("Product not found in current list");
        return;
      }
      
      // Call API to delete product
      await deleteProductAPI(productId);
      
      // Update local state by filtering out the deleted product
      setProducts(prev => 
        prev.filter(p => !(
          (p._id && p._id === productId) || 
          (p.id && p.id === productId)
        ))
      );
      
      // Show success notification
      toast.success(`${productToDelete.name || 'Product'} deleted successfully`);
      
      // Notification system removed as per requirements
      
      // Clear the product to delete and close dialog only on success
      setProductToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      toast.error(error.message || 'Failed to delete product');
      // Do not close dialog or clear product on error
    }
  }, [products]);

  const handleSubmitProduct = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse the threshold value as number or undefined if empty
      const thresholdValue = productThreshold ? parseInt(productThreshold) : undefined;
      
      const formData = {
        name: productName,
        stock: parseInt(productStock),
        dimension: productDimension,
        threshold: thresholdValue
      };

      let savedProduct;
      
      if (isEditing && selectedProduct) {
        // Update existing product
        const productId = getProductId(selectedProduct);
        savedProduct = await updateProductAPI(productId, formData);
        
        // Update the product in state
        setProducts(prev => 
          prev.map(p => {
            if ((p._id && p._id === productId) || (p.id && p.id === productId)) {
              // Ensure _id is preserved
              return { 
                ...savedProduct,
                _id: p._id || savedProduct._id,
                id: p.id || savedProduct.id
              };
            }
            return p;
          })
        );
        
        toast.success(`${productName} updated successfully`);
        
        // Notification system removed
      } else {
        // Create new product
        savedProduct = await createProduct(formData);
        
        // Ensure consistent ID fields
        if (savedProduct._id && !savedProduct.id) {
          savedProduct.id = savedProduct._id;
        }
        
        setProducts(prev => [savedProduct, ...prev]);
        toast.success(`${productName} added successfully`);
        
        // Notification system removed
      }

      // Reset form and close dialog
      resetForm();
      setIsProductFormOpen(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  }, [productName, productStock, productDimension, productThreshold, isEditing, selectedProduct, getProductId, resetForm]);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    return searchTerm
      ? products.filter(product => 
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;
  }, [products, searchTerm]);

  // Calculate pagination
  const totalPages = useMemo(() => 
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE), 
    [filteredProducts]
  );
  
  // Get current page items
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top smoothly when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col space-y-2">
            <h1 className={cn("font-bold tracking-tight", 
                           isMobile ? "text-2xl" : "text-3xl")}>Products</h1>
            <p className={cn("text-muted-foreground",
                          isSmallMobile ? "text-xs" : "text-sm")}>
              Manage your inventory of products here.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsProductFormOpen(true);
            }}
            className="hidden sm:flex"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card className="will-change-transform">
          <CardHeader className="px-5 pt-5 pb-0">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-8 w-full sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setIsProductFormOpen(true);
                }}
                className="w-full sm:hidden"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="transform-gpu">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full border-4 border-muted"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full border-t-4 border-primary animate-spin"></div>
                    </div>
                  </div>
                </div>
                <p className="ml-4 text-lg text-muted-foreground">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="h-10 w-10 text-muted-foreground" />}
                title="No products found"
                description={
                  searchTerm
                    ? "Try a different search term"
                    : "Add your first product to get started"
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={() => {
                        resetForm();
                        setIsProductFormOpen(true);
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  )
                }
              />
            ) : (
              <div className={cn(
                "transform-gpu",
                renderAnimations ? "animate-fade-in" : ""
              )}>
                {isMobile ? (
                  <div className="space-y-3 mt-4">
                    {currentProducts.map((product) => (
                      <ProductCard
                        key={getProductId(product)}
                        product={product}
                        onViewProduct={handleViewProduct}
                        onEditProduct={handleEditProduct}
                        onDeleteProduct={handleOpenDeleteDialog}
                        isSmallMobile={isSmallMobile}
                      />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.map((product) => (
                        <ProductRow
                          key={getProductId(product)}
                          product={product}
                          onEditProduct={handleEditProduct}
                          onDeleteProduct={handleOpenDeleteDialog}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}

                {totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update product details below'
                : 'Fill in the product details below to add to your inventory'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitProduct}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Steel Bars"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={productStock}
                  onChange={(e) => setProductStock(e.target.value)}
                  placeholder="e.g. 100"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dimension">Dimension/Unit</Label>
                <Select
                  value={productDimension}
                  onValueChange={(value) =>
                    setProductDimension(value as ProductDimension)
                  }
                >
                  <SelectTrigger id="dimension">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bag">Bag</SelectItem>
                    <SelectItem value="Bundle">Bundle</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Carton">Carton</SelectItem>
                    <SelectItem value="Coils">Coils</SelectItem>
                    <SelectItem value="Dozen">Dozen</SelectItem>
                    <SelectItem value="Ft">Feet (Ft)</SelectItem>
                    <SelectItem value="Gross">Gross</SelectItem>
                    <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
                    <SelectItem value="Mtr">Meter (Mtr)</SelectItem>
                    <SelectItem value="Pc">Piece (Pc)</SelectItem>
                    <SelectItem value="Pkt">Packet (Pkt)</SelectItem>
                    <SelectItem value="Set">Set</SelectItem>
                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="threshold">
                  Low Stock Threshold <span className="text-sm text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  value={productThreshold}
                  onChange={(e) => setProductThreshold(e.target.value)}
                  placeholder="e.g. 10"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsProductFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>{isEditing ? 'Update Product' : 'Add Product'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {productToDelete && (
        <DeleteProductDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          product={productToDelete}
          onDelete={handleDeleteProduct}
        />
      )}
    </DashboardLayout>
  );
}
