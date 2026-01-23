import { X, Phone, User, Clock, MapPin } from 'lucide-react';
import { Order } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from './StatusBadge';
import { OrderTypeBadge } from './OrderTypeBadge';
import { formatDistanceToNow } from 'date-fns';

interface OrderDetailDrawerProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (orderId: string, newStatus: Order['status']) => void;
}

export function OrderDetailDrawer({ 
  order, 
  open, 
  onOpenChange,
  onStatusChange 
}: OrderDetailDrawerProps) {
  if (!order) return null;

  const getNextStatus = (): Order['status'] | null => {
    switch (order.status) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'completed';
      default: return null;
    }
  };

  const nextStatus = getNextStatus();
  const nextStatusLabel: Record<string, string> = {
    preparing: 'Start Preparing',
    ready: 'Mark as Ready',
    completed: 'Complete Order',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">{order.orderNumber}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <OrderTypeBadge type={order.type} />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Customer Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerName}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.tableNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Table {order.tableNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-0.5 italic">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="rounded-lg bg-primary/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (0%)</span>
              <span>$0.00</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className="sticky bottom-0 mt-6 pt-4 pb-2 bg-card border-t flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onStatusChange?.(order.id, 'cancelled')}
            >
              Cancel Order
            </Button>
            {nextStatus && (
              <Button 
                className="flex-1"
                onClick={() => onStatusChange?.(order.id, nextStatus)}
              >
                {nextStatusLabel[nextStatus]}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
