import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLocation, Link } from 'react-router-dom';
import { mockNotifications } from '@/data/mockData';

const pageTitles: Record<string, { title: string; breadcrumb?: string[] }> = {
  '/': { title: 'Dashboard' },
  '/orders': { title: 'Orders', breadcrumb: ['Dashboard', 'Orders'] },
  '/kitchen': { title: 'Kitchen View', breadcrumb: ['Dashboard', 'Kitchen'] },
  '/notifications': { title: 'Notifications', breadcrumb: ['Dashboard', 'Notifications'] },
  '/reports': { title: 'Reports', breadcrumb: ['Dashboard', 'Reports'] },
  '/settings': { title: 'Cafe Settings', breadcrumb: ['Dashboard', 'Settings'] },
};

export function AppHeader() {
  const { user, activeCafeId } = useAuth();
  const location = useLocation();
  
  const pageInfo = pageTitles[location.pathname] || { title: 'Dashboard' };
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  // Get cafe name from user's cafes array
  const activeCafe = user?.cafes?.find(
    (c) => c._id === activeCafeId || user.cafes[0]?._id === c._id
  );
  const cafeName = activeCafe?.name || '';

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Title & Breadcrumb */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{pageInfo.title}</h1>
            {cafeName && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground font-medium">{cafeName}</span>
              </>
            )}
          </div>
          {pageInfo.breadcrumb && (
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              {pageInfo.breadcrumb.map((item, index) => (
                <span key={item} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  <span className={index === pageInfo.breadcrumb!.length - 1 ? 'text-foreground' : ''}>
                    {item}
                  </span>
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Right: Notifications & User */}
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="destructive"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-foreground">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
