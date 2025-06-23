import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { 
  BarChart4, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Users,
  ShoppingCart,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Order, Product, User } from '@/lib/types';
import { fetchOrders, fetchProducts, fetchStaff, fetchOrdersByExecutives } from '@/lib/api';
import { toast } from 'sonner';
import { useIsMobile, useIsSmallMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export default function Analytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
  // State for executive analysis
  const [executiveData, setExecutiveData] = useState<{
    executives: User[];
    orders: Order[];
  }>({ executives: [], orders: [] });
  const [executiveAnalytics, setExecutiveAnalytics] = useState<{
    ordersByExecutive: { name: string; orders: number; revenue: number }[];
    totalExecutiveRevenue: number;
    totalExecutiveOrders: number;
    popularProducts: { id: string; name: string; count: number; revenue: number }[];
  }>({
    ordersByExecutive: [],
    totalExecutiveRevenue: 0,
    totalExecutiveOrders: 0,
    popularProducts: []
  });
  
  // Responsive hooks
  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();

  // Auth for checking admin role
  const { isAdmin } = useAuth();

  // Fetch data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch all orders and products in parallel
        const [ordersData, productsData] = await Promise.all([
          fetchOrders(),
          fetchProducts()
        ]);
        
        setOrders(ordersData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading analytics data:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Fetch executive data (only for admin users)
  useEffect(() => {
    const loadExecutiveData = async () => {
      if (!isAdmin) return;
      
      try {
        const data = await fetchOrdersByExecutives();
        setExecutiveData(data);
        
        // Calculate analytics for executive orders
        calculateExecutiveAnalytics(data);
      } catch (error) {
        console.error('Error loading executive analytics data:', error);
        toast.error('Failed to load executive analytics');
      }
    };
    
    loadExecutiveData();
  }, [isAdmin]);

  // Calculate executive analytics
  const calculateExecutiveAnalytics = (data: { executives: User[]; orders: Order[] }) => {
    const { executives, orders } = data;
    
    // Group orders by executive
    const ordersByExec = executives.map(exec => {
      const execId = exec._id || exec.id;
      const execOrders = orders.filter(order => order.createdBy === execId);
      const totalRevenue = execOrders.reduce((sum, order) => sum + order.total, 0);
      
      return {
        name: exec.name,
        orders: execOrders.length,
        revenue: totalRevenue
      };
    }).sort((a, b) => b.revenue - a.revenue);
    
    // Calculate totals
    const totalExecutiveRevenue = ordersByExec.reduce((sum, item) => sum + item.revenue, 0);
    const totalExecutiveOrders = ordersByExec.reduce((sum, item) => sum + item.orders, 0);
    
    // Calculate popular products sold by executives
    const productSales: { [key: string]: { name: string, count: number, revenue: number } } = {};
    
    // Collect all executive orders
    const allExecutiveOrders = orders.filter(order => 
      order.createdBy && executives.some(exec => 
        (exec._id === order.createdBy || exec.id === order.createdBy)
      )
    );
    
    // Process each order to count products
    allExecutiveOrders.forEach(order => {
      (order.orderItems || order.items || []).forEach(item => {
        const productId = item.productId;
        const productName = item.productName;
        const amount = item.price * item.quantity;
        
        if (productSales[productId]) {
          productSales[productId].count += item.quantity;
          productSales[productId].revenue += amount;
        } else {
          productSales[productId] = { 
            name: productName, 
            count: item.quantity, 
            revenue: amount 
          };
        }
      });
    });
    
    // Convert to array and sort by count (popularity)
    const popularProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 most popular products
    
    setExecutiveAnalytics({
      ordersByExecutive: ordersByExec,
      totalExecutiveRevenue,
      totalExecutiveOrders,
      popularProducts
    });
  };

  // Calculate analytics from real data
  const calculateAnalytics = () => {
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
  };

  // Calculate sales by period (last 7 days)
  const calculateSalesByPeriod = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const salesByDate = Object.fromEntries(last7Days.map(date => [date, 0]));
    
    // Sum up sales for each date
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      if (last7Days.includes(orderDate)) {
        salesByDate[orderDate] += order.total;
      }
    });
    
    return Object.entries(salesByDate).map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }));
  };

  // Calculate sales by product
  const calculateSalesByProduct = () => {
    const productSales: { [key: string]: { name: string, amount: number } } = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const product = products.find(p => p._id === item.productId || p.id === item.productId);
        if (product) {
          const productId = product._id || product.id || '';
          const productName = product.name;
          const amount = item.price * item.quantity;
          
          if (productSales[productId]) {
            productSales[productId].amount += amount;
          } else {
            productSales[productId] = { name: productName, amount };
          }
        }
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.amount - a.amount)
      .map(({ name, amount }) => ({
        name,
        amount: Number(amount.toFixed(2)),
      }));
  };

  const analytics = calculateAnalytics();
  const salesByPeriod = calculateSalesByPeriod();
  const salesByProduct = calculateSalesByProduct();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 border shadow-elevation-low">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-sm text-primary">
            {typeof formatter === 'function' 
              ? formatter(payload[0].value) 
              : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    trend, 
    icon 
  }: { 
    title: string; 
    value: string; 
    description: string; 
    trend: { value: number; positive: boolean } | null; 
    icon: React.ReactNode 
  }) => (
    <Card className="will-change-transform transform-gpu">
      <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pb-2", 
        isSmallMobile && "px-3 py-2"
      )}>
        <CardTitle className={cn("font-medium", isSmallMobile ? "text-xs" : "text-sm")}>
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className={cn(isSmallMobile && "px-3 py-2")}>
        <div className={cn(isSmallMobile ? "text-base" : "text-2xl", "font-bold")}>{value}</div>
        <p className={cn(
          "text-muted-foreground flex items-center space-x-2",
          isSmallMobile ? "text-xs mt-1" : "mt-2"
        )}>
          <span>{description}</span>
          {trend && (
            <span className={`flex items-center text-xs ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.positive ? <ArrowUpRight className={cn(isSmallMobile ? "h-3 w-3" : "h-4 w-4")} /> : <ArrowDownRight className={cn(isSmallMobile ? "h-3 w-3" : "h-4 w-4")} />}
              <span>{trend.value}%</span>
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-[80vh] flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-medium">Loading analytics data...</h2>
        </div>
      </DashboardLayout>
    );
  }

  // COLORS for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6A7FDB'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight animate-fade-in">Analytics</h1>
          <p className="text-muted-foreground animate-slide-in-bottom">
            Track your sales performance and inventory
          </p>
        </div>

        {isAdmin && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General Analytics</TabsTrigger>
              <TabsTrigger value="executive">Executive Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-6">
              {/* General Analytics Content */}
              <GeneralAnalyticsContent 
                analytics={analytics}
                salesByPeriod={salesByPeriod}
                salesByProduct={salesByProduct}
                formatCurrency={formatCurrency}
                CustomTooltip={CustomTooltip}
                StatCard={StatCard}
                isMobile={isMobile}
                isSmallMobile={isSmallMobile}
              />
            </TabsContent>
            
            <TabsContent value="executive" className="space-y-6">
              {/* Executive Analytics Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="will-change-transform transform-gpu">
                  <CardHeader className={cn(isSmallMobile && "p-3")}>
                    <CardTitle className={cn(isSmallMobile ? "text-base" : "text-lg")}>
                      Executive Performance
                    </CardTitle>
                    <CardDescription className={cn(isSmallMobile && "text-xs")}>
                      Orders & revenue by executive
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={cn(isSmallMobile && "p-3")}>
                    {executiveAnalytics.ordersByExecutive.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                        <p>No executive order data available</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className={cn("h-[300px]", isMobile && "h-[200px]")}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={executiveAnalytics.ordersByExecutive}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 70,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis 
                                yAxisId="revenue"
                                orientation="left"
                                tickFormatter={(value) => `₹${value/1000}k`}
                                tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                              />
                              <YAxis 
                                yAxisId="orders"
                                orientation="right"
                                tickFormatter={(value) => `${value}`}
                                tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                              />
                              <Tooltip />
                              <Legend />
                              <Bar 
                                yAxisId="revenue"
                                dataKey="revenue" 
                                fill="#8884d8" 
                                name="Revenue (₹)" 
                              />
                              <Bar 
                                yAxisId="orders"
                                dataKey="orders" 
                                fill="#82ca9d" 
                                name="Orders" 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="will-change-transform transform-gpu">
                  <CardHeader className={cn(isSmallMobile && "p-3")}>
                    <CardTitle className={cn(isSmallMobile ? "text-base" : "text-lg")}>
                      Revenue Distribution
                    </CardTitle>
                    <CardDescription className={cn(isSmallMobile && "text-xs")}>
                      Revenue share by executive
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={cn(isSmallMobile && "p-3")}>
                    {executiveAnalytics.ordersByExecutive.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                        <p>No executive revenue data available</p>
                      </div>
                    ) : (
                      <div className={cn("h-[300px]", isMobile && "h-[250px]")}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={executiveAnalytics.ordersByExecutive}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="revenue"
                            >
                              {executiveAnalytics.ordersByExecutive.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Executive Revenue"
                  value={formatCurrency(executiveAnalytics.totalExecutiveRevenue)}
                  description="Total sales by executives"
                  trend={null}
                  icon={<TrendingUp className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
                />
                <StatCard
                  title="Executive Orders"
                  value={executiveAnalytics.totalExecutiveOrders.toString()}
                  description="Total orders by executives"
                  trend={null}
                  icon={<ShoppingCart className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
                />
                <StatCard
                  title="Revenue Share"
                  value={`${(executiveAnalytics.totalExecutiveRevenue / analytics.totalSales * 100).toFixed(1)}%`}
                  description="Of total revenue"
                  trend={null}
                  icon={<BarChart4 className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
                />
              </div>
              
              {/* Popular Products By Executives */}
              <Card className="will-change-transform transform-gpu">
                <CardHeader className={cn(isSmallMobile && "p-3")}>
                  <CardTitle className={cn(isSmallMobile ? "text-base" : "text-lg")}>
                    Popular Products By Executives
                  </CardTitle>
                  <CardDescription className={cn(isSmallMobile && "text-xs")}>
                    Most frequently sold products by executive staff
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(isSmallMobile && "p-3")}>
                  {executiveAnalytics.popularProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                      <p>No product data available from executives</p>
                    </div>
                  ) : (
                    <div className={cn("h-[350px]", isMobile && "h-[280px]")}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={executiveAnalytics.popularProducts.slice(0, 8)}
                          layout="vertical"
                          margin={{
                            top: 5,
                            right: isSmallMobile ? 5 : 30,
                            left: isSmallMobile ? 70 : 90,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis 
                            type="number"
                            tickFormatter={(value) => `${value}`}
                            tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                            width={90}
                            tickFormatter={(value) => {
                              if (value.length > 15) {
                                return `${value.substring(0, 13)}...`;
                              }
                              return value;
                            }}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'count') return [`${value} units`, 'Quantity Sold'];
                              if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="count" 
                            name="Quantity Sold" 
                            fill="#8884d8" 
                            radius={[0, 4, 4, 0]} 
                          />
                          <Bar 
                            dataKey="revenue" 
                            name="Revenue" 
                            fill="#82ca9d" 
                            radius={[0, 4, 4, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {!isAdmin && (
          <GeneralAnalyticsContent 
            analytics={analytics}
            salesByPeriod={salesByPeriod}
            salesByProduct={salesByProduct}
            formatCurrency={formatCurrency}
            CustomTooltip={CustomTooltip}
            StatCard={StatCard}
            isMobile={isMobile}
            isSmallMobile={isSmallMobile}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// General Analytics Content component to avoid duplication
const GeneralAnalyticsContent = ({
  analytics,
  salesByPeriod,
  salesByProduct,
  formatCurrency,
  CustomTooltip,
  StatCard,
  isMobile,
  isSmallMobile
}) => (
  <>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(analytics.totalSales)}
        description="Total sales"
        trend={{ value: 12.5, positive: true }}
        icon={<TrendingUp className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
      />
      <StatCard
        title="Orders"
        value={analytics.totalOrders.toString()}
        description="Total orders"
        trend={{ value: 8.2, positive: true }}
        icon={<ShoppingCart className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
      />
      <StatCard
        title="Average Order"
        value={formatCurrency(analytics.averageOrderValue)}
        description="Per order"
        trend={{ value: 3.1, positive: true }}
        icon={<BarChart4 className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
      />
      <StatCard
        title="Pending Orders"
        value={analytics.pendingOrders.toString()}
        description="Awaiting fulfillment"
        trend={null}
        icon={<Users className={cn(isSmallMobile ? "h-3.5 w-3.5" : "h-5 w-5", "text-muted-foreground")} />}
      />
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader className={cn(isSmallMobile && "p-3")}>
          <CardTitle className={cn(isSmallMobile ? "text-base" : "text-lg")}>
            Revenue Over Time
          </CardTitle>
          <CardDescription className={cn(isSmallMobile && "text-xs")}>
            Daily revenue for the past 7 days
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isSmallMobile && "p-3")}>
          <div className={cn("h-[300px]", isMobile && "h-[200px]")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesByPeriod}
                margin={{
                  top: 20,
                  right: isSmallMobile ? 5 : 20,
                  left: isSmallMobile ? 0 : 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { 
                      month: isSmallMobile ? 'numeric' : 'short', 
                      day: 'numeric' 
                    });
                  }}
                  tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => isSmallMobile ? `₹${value/1000}k` : `₹${value}`}
                  tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                  width={isSmallMobile ? 35 : 60}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={formatCurrency} />} 
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className={cn(isSmallMobile && "p-3")}>
          <CardTitle className={cn(isSmallMobile ? "text-base" : "text-lg")}>
            Top Selling Products
          </CardTitle>
          <CardDescription className={cn(isSmallMobile && "text-xs")}>
            Revenue by product
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isSmallMobile && "p-3")}>
          <div className={cn("h-[300px]", isMobile && "h-[250px]")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesByProduct.slice(0, isSmallMobile ? 5 : 7)}
                layout="vertical"
                margin={{
                  top: 5,
                  right: isSmallMobile ? 5 : 20,
                  left: isSmallMobile ? 70 : 90,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => isSmallMobile ? `₹${value/1000}k` : `₹${value}`}
                  tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                  tickFormatter={(value) => {
                    if (isSmallMobile && value.length > 10) {
                      return `${value.substring(0, 8)}...`;
                    }
                    return value;
                  }}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={formatCurrency} />} 
                />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  </>
);
