import React from 'react';
import { cn } from '@/lib/utils';
import { Package, Edit, Eye, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface Product {
  id?: string;
  _id?: string;
  name: string;
  stock: number;
  dimension?: string;
}

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function ProductCard({ 
  product, 
  onView, 
  onEdit, 
  onDelete,
  className
}: ProductCardProps) {
  return (
    <Card className={cn("overflow-hidden group transition-all hover:border-primary", className)}>
      <div 
        className="relative h-48 w-full bg-muted cursor-pointer"
        onClick={onView}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Package className="h-12 w-12 text-muted-foreground opacity-50" />
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="default" size="sm" onClick={(e) => {
            e.stopPropagation();
            onView();
          }}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2 flex justify-between items-start">
          <div>
            <h3 className="font-medium line-clamp-1">{product.name}</h3>
            <p className="text-xs text-muted-foreground">
              {product.dimension || 'Pc'}
            </p>
          </div>
          <Badge variant={product.stock > 10 ? "default" : "destructive"} className="ml-2 flex-shrink-0">
            {product.stock > 0 ? `${product.stock}` : 'Out'}
          </Badge>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
} 