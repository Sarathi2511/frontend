import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import PrivateRoute from "@/components/route/PrivateRoute";
import AdminRoute from "@/components/route/AdminRoute";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Products from "@/pages/Products";
import Staff from "@/pages/Staff";
import Analytics from "@/pages/Analytics";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { Toaster as SonnerToaster } from "sonner";
import { ScrollManager } from '@/components/layout/ScrollManager';

const queryClient = new QueryClient();

// Home component that redirects based on user role
const Home = () => {
  const { isExecutive } = useAuth();
  return <Navigate to={isExecutive ? "/orders" : "/dashboard"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ScrollManager />
      <Toaster />
      <SonnerToaster position="top-right" closeButton richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
              <Route path="/" element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } />
              <Route path="/login" element={<Login />} />
              
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              
              <Route path="/orders" element={
                <PrivateRoute>
                  <Orders />
                </PrivateRoute>
              } />
              
              <Route path="/products" element={
                <PrivateRoute>
                  <Products />
                </PrivateRoute>
              } />
              
              <Route path="/staff" element={
                <AdminRoute>
                  <Staff />
                </AdminRoute>
              } />
              
              <Route path="/analytics" element={
                <AdminRoute>
                  <Analytics />
                </AdminRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
