import { 
  LayoutDashboard, 
  ClipboardList, 
  ChefHat, 
  Bell, 
  BarChart3, 
  LogOut,
  Coffee,
  PanelLeftClose,
  PanelLeft,
  UtensilsCrossed,
  BookOpen,
  Settings2,
  Users,
  Star
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { hasPermission, Resource, Action } from '@/lib/permissions';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  requiredPermission?: { resource: Resource; action: Action };
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ClipboardList, label: 'Orders', href: '/orders' },
  { icon: ChefHat, label: 'Kitchen', href: '/kitchen' },
  { icon: UtensilsCrossed, label: 'Items', href: '/items', requiredPermission: { resource: 'menuItems', action: 'read' } },
  { icon: BookOpen, label: 'Menus', href: '/menus', requiredPermission: { resource: 'menus', action: 'read' } },
  { icon: Users, label: 'Users', href: '/users', requiredPermission: { resource: 'users', action: 'read' } },
  { icon: Star, label: 'Reviews', href: '/reviews', requiredPermission: { resource: 'reviews', action: 'read' } },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: BarChart3, label: 'Reports', href: '/reports', requiredPermission: { resource: 'orders', action: 'read' } },
  { icon: Settings2, label: 'Settings', href: '/settings', requiredPermission: { resource: 'settings', action: 'read' } },
];

export function AppSidebar() {
  const { user, logout, activeCafeId } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    // If no permission required, show to all authenticated users
    if (!item.requiredPermission) return true;
    // Check if user has required permission
    return hasPermission(user, item.requiredPermission.resource, item.requiredPermission.action);
  });

  // Get cafe name from user's cafes array
  const activeCafe = user?.cafes?.find(
    (c) => c._id === activeCafeId || user.cafes[0]?._id === c._id
  );
  const cafeName = activeCafe?.name || 'Cafe';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center w-full')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Coffee className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-serif font-bold text-sidebar-foreground">{cafeName}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {user?.role?.name === 'manager' ? 'Manager Portal' : 'Receptionist Portal'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/10',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary-foreground')} />
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 pb-4">
          <Separator className="mb-4" />
          
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10',
              collapsed && 'justify-center px-2'
            )}
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </Button>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full mt-2 justify-center text-muted-foreground',
              collapsed && 'px-2'
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
