import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart4, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetClose 
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useIsMobile, useIsTablet, useIsSmallMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// NotificationBell removed as per requirements

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  onClick?: () => void;
  isAdminOnly?: boolean;
  collapsed?: boolean;
}

const NavItem = React.memo(({ 
  icon, 
  label, 
  href, 
  isActive, 
  onClick, 
  isAdminOnly = false,
  collapsed = false
}: NavItemProps) => {
  const { isAdmin } = useAuth();
  
  if (isAdminOnly && !isAdmin) return null;
  
  const item = (
    <Link 
      to={href} 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
        isActive 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {isActive && !collapsed && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {item}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return item;
});

NavItem.displayName = 'NavItem';

const UserInfo = React.memo(({ collapsed = false }: { collapsed?: boolean }) => {
  const { user, logout } = useAuth();
  const isSmallMobile = useIsSmallMobile();
  const isMobile = useIsMobile();
  
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);
  
  if (collapsed) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-10 w-10 border-2 border-primary/20 cursor-pointer">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
                <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {!isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mt-2 text-muted-foreground hover:text-destructive" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Log out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-3 p-4">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10 border-2 border-primary/20">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
          <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className={cn("text-sm font-medium", isSmallMobile && "text-xs")}>{user?.name}</p>
          <div className="flex items-center">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {user?.role}
            </Badge>
          </div>
        </div>
      </div>
      
      {!isMobile && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="justify-start pl-2 text-muted-foreground hover:text-destructive" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      )}
    </div>
  );
});

UserInfo.displayName = 'UserInfo';

const DashboardLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAdmin, user, logout } = useAuth();
  
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Update sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else if (isTablet) {
      setSidebarOpen(true);
      setSidebarCollapsed(true);
    } else {
      setSidebarOpen(true);
      setSidebarCollapsed(false);
    }
  }, [isMobile, isTablet]);

  const navigationItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/',
      icon: <LayoutDashboard className="h-5 w-5" />,
      show: isAdmin,
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: <Package className="h-5 w-5" />,
      show: true,
    },
    {
      name: 'Products',
      href: '/products',
      icon: <Box className="h-5 w-5" />,
      show: isAdmin || user?.role === 'staff',
    },
    {
      name: 'Staff',
      href: '/staff',
      icon: <Users className="h-5 w-5" />,
      show: isAdmin,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: <BarChart4 className="h-5 w-5" />,
      show: isAdmin,
    },
  ], [isAdmin, user?.role]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const SidebarContent = useMemo(() => {
    return (
      <aside className="flex flex-col bg-card border-r shadow-md will-change-transform h-[100dvh] overflow-y-auto overflow-x-hidden custom-scrollbar" aria-label="Main navigation">
        <div className="p-4">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed ? (
              <h2 className="text-xl font-bold">Sarathi Orders</h2>
            ) : (
              <div className="w-full flex justify-center">
                <h2 className="text-xl font-bold">E</h2>
              </div>
            )}
            {isMobile ? (
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebarCollapse} 
                className="hidden md:flex"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain custom-scrollbar">
          {navigationItems.map((item) => 
            item.show ? (
              <NavItem
                key={item.href}
                icon={item.icon}
                label={item.name}
                href={item.href}
                isActive={pathname === item.href}
                onClick={closeSidebar}
                collapsed={sidebarCollapsed}
              />
            ) : null
          )}
        </nav>
        <Separator />
        <UserInfo collapsed={sidebarCollapsed} />
      </aside>
    );
  }, [pathname, isMobile, navigationItems, closeSidebar, sidebarCollapsed, toggleSidebarCollapse]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-muted/50">
      {/* Mobile Header */}
      {isMobile && (
        <header 
          className={cn(
            "sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm",
            "border-b py-3 px-4 flex items-center justify-between"
          )}
        >
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleLogout}
                    className="bg-background"
                    aria-label="Log out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Log out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>
      )}

      <div className="flex-1 flex">
        {/* Sidebar */}
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[80vw] max-w-[300px]" aria-label="Mobile navigation menu">
              {SidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <div 
              className={cn(
                "shrink-0 will-change-transform fixed top-0 bottom-0 left-0 z-30",
                sidebarCollapsed ? "w-16" : "w-64"
              )}
              style={{
                transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              {SidebarContent}
            </div>
            {/* Add a spacer div to prevent content from being hidden behind the fixed sidebar */}
            <div className={cn(
              "shrink-0",
              sidebarCollapsed ? "w-16" : "w-64"
            )}></div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 relative overflow-x-hidden" role="main" aria-label="Main content">
          <div className="container mx-auto p-4 md:p-6 min-h-[100dvh]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
});

DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;
