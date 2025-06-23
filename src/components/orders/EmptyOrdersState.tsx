import React from 'react';
import { FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyOrdersStateProps {
  searchTerm: string;
}

export function EmptyOrdersState({ searchTerm }: EmptyOrdersStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {searchTerm ? (
        <>
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No orders found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search term to find what you're looking for.
          </p>
        </>
      ) : (
        <>
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No orders yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by creating your first order.
          </p>
          <Button>Create Order</Button>
        </>
      )}
    </div>
  );
}
