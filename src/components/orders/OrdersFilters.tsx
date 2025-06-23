import React, { useState } from 'react';
import { Search, RefreshCw, Plus, Calendar, X, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatus } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useIsMobile, useIsSmallMobile, useIsTablet } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface OrdersFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: OrderStatus | 'all' | 'my-orders';
  setActiveTab: (tab: OrderStatus | 'all' | 'my-orders') => void;
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  onRefresh: () => void;
  onCreateOrder: () => void;
  showMyOrders?: boolean;
  isAdmin?: boolean;
}

export function OrdersFilters({
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  dateRange,
  setDateRange,
  onRefresh,
  onCreateOrder,
  showMyOrders = false,
  isAdmin = false,
}: OrdersFiltersProps) {
  const shouldShowMyOrders = showMyOrders && !isAdmin;
  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();
  const isTablet = useIsTablet();
  const [showFilters, setShowFilters] = useState(false);
  
  // Map status values to display names
  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    ...(shouldShowMyOrders ? [{ value: 'my-orders', label: 'My Orders' }] : []),
    { value: 'pending', label: 'Pending' },
    { value: 'dc', label: 'DC Generated' },
    { value: 'invoice', label: 'Invoice Generated' },
    { value: 'dispatched', label: 'Dispatched' }
  ];
  
  return (
    <div className="flex flex-col space-y-4">
      {/* Top row with search and actions - responsive layout */}
      <div className={cn(
        "flex items-center gap-2",
        isMobile ? "flex-col w-full" : "justify-between"
      )}>
        {/* Search and filters area */}
        <div className={cn(
          "flex items-center gap-2",
          isMobile ? "w-full flex-col" : "flex-row"
        )}>
          {/* Search input - full width on mobile */}
          <div className={cn("relative", isMobile && "w-full")}>
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("pl-8", isMobile ? "w-full" : "w-[300px]")}
            />
          </div>
          
          {/* Filter controls - adapt for mobile */}
          {isMobile ? (
            <div className="flex w-full gap-2">
              {/* Mobile filters dropdown */}
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 flex items-center justify-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>{isSmallMobile ? "" : "Filters"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Filter Orders</h4>
                    
                    {/* Date Range Picker */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <CalendarComponent
                        mode="range"
                        selected={{
                          from: dateRange.from,
                          to: dateRange.to,
                        }}
                        onSelect={setDateRange}
                        initialFocus
                        className="border rounded-md"
                      />
                    </div>
                    
                    {/* Clear filters button */}
                    {dateRange.from && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        Clear Date Filter
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              {/* New Order button - on the top row for mobile */}
              <Button onClick={onCreateOrder} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {isSmallMobile ? "New" : "New Order"}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop layouts for filters */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Filter by Date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={setDateRange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {/* Display selected date range as badges */}
              {dateRange.from && (
                <Badge variant="outline" className="flex gap-1 items-center">
                  {dateRange.from && format(dateRange.from, 'MMM dd, yyyy')}
                  {dateRange.to && ` - ${format(dateRange.to, 'MMM dd, yyyy')}`}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  />
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        {/* New Order button - only show in desktop layout and outside the filters group */}
        {!isMobile && (
          <Button onClick={onCreateOrder}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        )}
      </div>

      {/* Display selected date range as badges for mobile */}
      {isMobile && dateRange.from && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex gap-1 items-center">
            {dateRange.from && format(dateRange.from, 'MMM dd, yyyy')}
            {dateRange.to && ` - ${format(dateRange.to, 'MMM dd, yyyy')}`}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => setDateRange({ from: undefined, to: undefined })}
            />
          </Badge>
        </div>
      )}

      {/* Status tabs - responsive adaptation */}
      {isMobile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full flex justify-between">
              <span>
                {statusOptions.find(opt => opt.value === activeTab)?.label || 'All Orders'}
              </span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
            {statusOptions.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setActiveTab(option.value as OrderStatus | 'all' | 'my-orders')}
                className={cn(
                  activeTab === option.value && "bg-primary/10"
                )}
              >
                {option.label}
                {option.value === 'my-orders' && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-sm">
                    Assigned
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderStatus | 'all' | 'my-orders')}>
          <TabsList className={cn(isTablet && "w-full flex flex-wrap gap-1")}>
            <TabsTrigger value="all" className={cn(isTablet && "flex-1")}>All Orders</TabsTrigger>
            {shouldShowMyOrders && (
              <TabsTrigger value="my-orders" className={cn("flex items-center gap-1", isTablet && "flex-1")}>
                My Orders
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-sm">
                  Assigned
                </span>
              </TabsTrigger>
            )}
            <TabsTrigger value="pending" className={cn(isTablet && "flex-1")}>Pending</TabsTrigger>
            <TabsTrigger value="dc" className={cn(isTablet && "flex-1")}>DC Generated</TabsTrigger>
            <TabsTrigger value="invoice" className={cn(isTablet && "flex-1")}>Invoice Generated</TabsTrigger>
            <TabsTrigger value="dispatched" className={cn(isTablet && "flex-1")}>Dispatched</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}