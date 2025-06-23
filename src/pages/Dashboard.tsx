import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart4, Package, ShoppingCart, Clock, Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Order, Product } from '@/lib/types';
import { fetchOrders, fetchProducts } from '@/lib/api';
import { toast } from 'sonner';
import { useIsMobile, useIsSmallMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Memoized summary card component to reduce re-renders
const SummaryCard = memo(({ 
  title, 
  value, 
  subtitle, 
  icon, 
  animationDelay, 
  onClick,
  isSmallMobile
}: { 
  title: string; 
  value: string | number; 
  subtitle: string;
  icon: React.ReactNode;
  animationDelay: string;
  onClick: () => void;
  isSmallMobile: boolean;
}) => (
  <Card 
    className="dashboard-card cursor-pointer hover:shadow-md transition-shadow" 
    style={{ animationDelay }}
    onClick={onClick}
  >
    <CardHeader className={cn("flex flex-row items-center justify-between space-y-0", 
      isSmallMobile ? "px-3 py-2" : "pb-2"
    )}>
      <CardTitle className={cn("font-medium", isSmallMobile ? "text-xs" : "text-sm")}>{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent className={cn(isSmallMobile && "px-3 py-2")}>
      <div className={cn(isSmallMobile ? "text-lg" : "text-2xl", "font-bold")}>
        {value}
      </div>
      <p className={cn(isSmallMobile ? "text-[10px]" : "text-xs", "text-muted-foreground")}>
        {subtitle}
      </p>
    </CardContent>
  </Card>
));

SummaryCard.displayName = 'SummaryCard';

// Memoized order item component
const OrderItem = memo(({ 
  order, 
  formatCurrency,
  isSmallMobile 
}: { 
  order: Order; 
  formatCurrency: (value: number) => string;
  isSmallMobile: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div className="space-y-1">
      <p className={cn(
        "font-medium",
        isSmallMobile ? "text-sm" : ""
      )}>
        Order #{order.orderNumber || (order._id && order._id.substring(0, 8))}
      </p>
      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "w-fit capitalize", 
            isSmallMobile && "text-[10px] px-1 py-0 h-5"
          )}
        >
          {order.status}
        </Badge>
        <p className={cn(
          "text-xs text-muted-foreground",
          isSmallMobile && "text-[10px]"
        )}>
          {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
    <div className={cn(
      "font-medium", 
      isSmallMobile ? "text-sm" : ""
    )}>
      {formatCurrency(order.total)}
    </div>
  </div>
));

OrderItem.displayName = 'OrderItem';

// Memoized product item component
const ProductItem = memo(({ 
  product, 
  isSmallMobile 
}: { 
  product: Product; 
  isSmallMobile: boolean;
}) => (
  <div className={cn(
    "grid gap-2 p-3",
    isSmallMobile ? "grid-cols-8" : "grid-cols-10"
  )}>
    <div className={cn(
      "truncate font-medium",
      isSmallMobile ? "col-span-4" : "col-span-5"
    )}>
      {product.name}
    </div>
    <div className={cn(
      "text-muted-foreground",
      isSmallMobile ? "col-span-2" : "col-span-2"
    )}>
      {product.dimension || 'N/A'}
    </div>
    <div className={cn(
      isSmallMobile ? "col-span-2" : "col-span-3"
    )}>
      <Badge 
        variant={product.stock === 0 ? "destructive" : (typeof product.threshold === 'number' && product.stock < product.threshold ? "destructive" : "outline")} 
        className={cn(
          isSmallMobile && "text-[10px] px-1 py-0 h-5 whitespace-nowrap"
        )}
      >
        {product.stock}/{product.threshold || '-'} {product.dimension || 'items'}
      </Badge>
    </div>
  </div>
));

ProductItem.displayName = 'ProductItem';

export default function Dashboard() {
  const { user, isAdmin, isExecutive } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renderAnimations, setRenderAnimations] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();
  
  // Load data with proper error handling
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [ordersData, productsData] = await Promise.all([
          fetchOrders(),
          fetchProducts()
        ]);
        
        if (!isMounted) return;
        
        setOrders(ordersData);
        setProducts(productsData);
        
        const lowStockItems = productsData.filter(p => 
          typeof p.threshold === 'number' && p.stock < p.threshold
        );
        // Notification system removed
        
        // Delay animations until content is loaded
        setTimeout(() => {
          if (isMounted) {
            setRenderAnimations(true);
          }
        }, 0);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (isMounted) {
          toast.error('Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);
  
  // Memoize calculations to avoid recalculations on re-render
  const analytics = useMemo(() => {
    if (!orders.length) return {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      pendingOrders: 0
    };
    
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    
    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      pendingOrders
    };
  }, [orders]);

  // Memoize sorted lists to avoid recalculations
  const recentOrders = useMemo(() => 
    [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4),
    [orders]
  );
  
  const lowStockProducts = useMemo(() => 
    products
      .filter(p => typeof p.threshold === 'number' && p.stock < p.threshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, isMobile ? 3 : 5),
    [products, isMobile]
  );

  const productCount = useMemo(() => products.length, [products]);
  const lowStockCount = useMemo(() => products.filter(p => 
    typeof p.threshold === 'number' && p.stock < p.threshold
  ).length, [products]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  }, []);

  const navigateToOrders = useCallback(() => {
    navigate('/orders');
  }, [navigate]);

  const navigateToProducts = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-[80vh] flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-medium">Loading dashboard data...</h2>
        </div>
      </DashboardLayout>
    );
  }

  const animationClass = renderAnimations ? "animate-slide-in-bottom" : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col space-y-2">
            <h1 className={cn("font-bold tracking-tight", 
                            isMobile ? "text-2xl" : "text-3xl")}>Dashboard</h1>
            <p className={cn("text-muted-foreground",
                          isSmallMobile ? "text-xs" : "text-sm")}>
              Welcome back, {user?.name}! Here's a summary of your shop.
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard 
              title="Total Revenue"
              value={formatCurrency(analytics.totalSales)}
              subtitle={`From ${orders.length} total orders`}
              icon={<TrendingUp className={cn(isSmallMobile ? "w-3 h-3" : "w-4 h-4", "text-muted-foreground")} />}
              animationDelay="100ms"
              onClick={navigateToOrders}
              isSmallMobile={isSmallMobile}
            />
            
            <SummaryCard 
              title="Orders"
              value={analytics.totalOrders}
              subtitle={`${analytics.pendingOrders} pending`}
              icon={<ShoppingCart className={cn(isSmallMobile ? "w-3 h-3" : "w-4 h-4", "text-muted-foreground")} />}
              animationDelay="200ms"
              onClick={navigateToOrders}
              isSmallMobile={isSmallMobile}
            />
            
            <SummaryCard 
              title="Products"
              value={productCount}
              subtitle={`${lowStockCount} low stock`}
              icon={<Package className={cn(isSmallMobile ? "w-3 h-3" : "w-4 h-4", "text-muted-foreground")} />}
              animationDelay="300ms"
              onClick={navigateToProducts}
              isSmallMobile={isSmallMobile}
            />
            
            <SummaryCard 
              title="Avg. Order"
              value={formatCurrency(analytics.averageOrderValue)}
              subtitle={`From ${orders.length} orders`}
              icon={<BarChart4 className={cn(isSmallMobile ? "w-3 h-3" : "w-4 h-4", "text-muted-foreground")} />}
              animationDelay="400ms"
              onClick={navigateToOrders}
              isSmallMobile={isSmallMobile}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isExecutive && (
              <Card className={cn("dashboard-card", animationClass)} style={{ animationDelay: '600ms' }}>
                <CardHeader className={cn(isSmallMobile && "p-3")}>
                  <CardTitle className={cn("font-medium", isSmallMobile ? "text-base" : "text-lg")}>
                    {isMobile ? "Recent Orders" : "Recently Created Orders"}
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn(isSmallMobile && "p-2")}>
                  {recentOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-25" />
                      <p className="text-muted-foreground">No orders found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.map((order) => (
                        <OrderItem 
                          key={order.id || order._id}
                          order={order}
                          formatCurrency={formatCurrency}
                          isSmallMobile={isSmallMobile}
                        />
                      ))}
                      {orders.length > 4 && (
                        <div className="text-center pt-2">
                          <Link 
                            to="/orders" 
                            className="text-sm text-primary hover:underline"
                          >
                            View all orders
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {isAdmin ? (
              <Card className={cn("dashboard-card", animationClass)} style={{ animationDelay: '700ms' }}>
                <CardHeader className={cn(isSmallMobile && "p-3")}>
                  <div className="flex items-center justify-between">
                    <CardTitle className={cn("font-medium", isSmallMobile ? "text-base" : "text-lg")}>
                      Low Stock Products
                    </CardTitle>
                    <Badge variant="outline" className="ml-2">
                      {lowStockCount} items
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className={cn(isSmallMobile && "p-2")}>
                  {lowStockProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Package className="h-10 w-10 text-muted-foreground mb-3 opacity-25" />
                      <p className="text-muted-foreground">All products are well stocked</p>
                    </div>
                  ) : (
                    <>
                      <div className={cn(
                        "rounded-md border", 
                        isSmallMobile ? "text-sm" : ""
                      )}>
                        <div className={cn(
                          "grid gap-2 p-3 bg-muted/50",
                          isSmallMobile ? "grid-cols-8" : "grid-cols-10"
                        )}>
                          <div className={cn(
                            "text-muted-foreground font-medium text-xs",
                            isSmallMobile ? "col-span-4" : "col-span-5"
                          )}>
                            Product
                          </div>
                          <div className={cn(
                            "text-muted-foreground font-medium text-xs",
                            isSmallMobile ? "col-span-2" : "col-span-2"
                          )}>
                            Dimension
                          </div>
                          <div className={cn(
                            "text-muted-foreground font-medium text-xs",
                            isSmallMobile ? "col-span-2" : "col-span-3"
                          )}>
                            Stock
                          </div>
                        </div>
                        <div className="divide-y">
                          {lowStockProducts.map((product) => (
                            <ProductItem 
                              key={product.id || product._id}
                              product={product}
                              isSmallMobile={isSmallMobile}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {lowStockCount > (isMobile ? 3 : 5) && (
                        <div className="text-center pt-4">
                          <Link to="/products" className="text-sm text-primary hover:underline">
                            View all {lowStockCount} low stock products
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}