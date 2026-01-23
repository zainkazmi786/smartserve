import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Clock, CheckCircle2, Image as ImageIcon, Maximize2, Minimize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  getActiveKitchenOrder,
  getKitchenQueue,
  markOrderReady,
  Order as BackendOrder,
} from '@/services/orderService';
import { initializeSocket, subscribeToKitchenUpdates, disconnectSocket } from '@/services/socketService';
import { formatOrderNumber } from '@/utils/orderUtils';
import { AnalogCountdownTimer } from '@/components/kitchen/AnalogCountdownTimer';

export default function Kitchen() {
  const { user, activeCafeId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const kitchenContainerRef = useRef<HTMLDivElement>(null);

  const isReadOnly = user?.role?.name === 'receptionist';

  // Fullscreen toggle - only fullscreen the kitchen container, not sidebar
  const toggleFullscreen = async () => {
    if (!kitchenContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await kitchenContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fetch active order
  const {
    data: activeOrder,
    isLoading: activeOrderLoading,
    refetch: refetchActiveOrder,
  } = useQuery<BackendOrder | null>({
    queryKey: ['kitchenActiveOrder'],
    queryFn: getActiveKitchenOrder,
    refetchInterval: false, // We'll use WebSocket for updates
  });

  // Fetch queue
  const {
    data: queueOrders = [],
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = useQuery<BackendOrder[]>({
    queryKey: ['kitchenQueue'],
    queryFn: getKitchenQueue,
    refetchInterval: false, // We'll use WebSocket for updates
  });

  // Proactive check: Refetch when countdown expires
  useEffect(() => {
    if (!activeOrder?.hasLongItems || !activeOrder?.timeoutAt) return;

    const checkTimeout = () => {
      const timeout = new Date(activeOrder.timeoutAt!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((timeout - now) / 1000));
      
      // If time expired, proactively refetch (backend might have requeued)
      if (remaining <= 0) {
        // Wait a bit for backend job to run, then refetch
        setTimeout(() => {
          refetchActiveOrder();
          refetchQueue();
        }, 1500); // 1.5 seconds to allow backend job to complete
      }
    };

    // Check every second
    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [activeOrder?.timeoutAt, activeOrder?.hasLongItems, refetchActiveOrder, refetchQueue]);

  // Mark ready mutation
  const markReadyMutation = useMutation({
    mutationFn: markOrderReady,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenActiveOrder'] });
      queryClient.invalidateQueries({ queryKey: ['kitchenQueue'] });
      toast({
        title: 'Order Ready',
        description: 'Order has been marked as ready.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark order ready',
        variant: 'destructive',
      });
    },
  });

  // WebSocket setup
  useEffect(() => {
    if (!user || !activeCafeId) return;

    const socket = initializeSocket(
      user._id,
      user.role?.name || '',
      activeCafeId ? [activeCafeId] : []
    );

    const unsubscribe = subscribeToKitchenUpdates(activeCafeId, {
      onActiveOrderChanged: async (data) => {
        // Animate transition - slide out current, slide in new
        setIsTransitioning(true);
        
        // Wait for slide-out animation
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Refetch active order and queue
        await Promise.all([refetchActiveOrder(), refetchQueue()]);
        
        // Wait a bit before slide-in
        await new Promise((resolve) => setTimeout(resolve, 100));
        setIsTransitioning(false);
      },
      onQueueUpdated: async () => {
        await refetchQueue();
      },
      onOrderReady: async () => {
        // Order was marked ready, animate transition to next order
        setIsTransitioning(true);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await Promise.all([refetchActiveOrder(), refetchQueue()]);
        await new Promise((resolve) => setTimeout(resolve, 100));
        setIsTransitioning(false);
      },
    });

    return () => {
      unsubscribe();
      // Don't disconnect socket here - it might be used by other components
      // disconnectSocket();
    };
  }, [user, activeCafeId, refetchActiveOrder, refetchQueue]);

  const handleMarkReady = () => {
    if (!activeOrder) return;
    markReadyMutation.mutate(activeOrder._id);
  };

  const isLoading = activeOrderLoading || queueLoading;

  // Calculate dynamic item size based on number of items
  const itemCount = activeOrder?.items.length || 0;
  const getItemGridCols = () => {
    if (itemCount === 0) return 'grid-cols-1';
    if (itemCount === 1) return 'grid-cols-1';
    if (itemCount === 2) return 'grid-cols-2';
    if (itemCount === 3) return 'grid-cols-3';
    if (itemCount === 4) return 'grid-cols-4'; // Single row for 4 items - better for TV
    if (itemCount === 5) return 'grid-cols-5';
    if (itemCount === 6) return 'grid-cols-3 grid-rows-2'; // 3x2 grid for 6 items
    if (itemCount <= 9) return 'grid-cols-3 grid-rows-3'; // 3x3 grid for 7-9 items
    return 'grid-cols-4 grid-rows-3'; // 4x3 grid for 10+ items
  };

  const getImageSize = () => {
    if (itemCount === 0) return 'w-80 h-80';
    if (itemCount === 1) return 'w-96 h-96';
    if (itemCount === 2) return 'w-72 h-72';
    if (itemCount === 3) return 'w-64 h-64';
    if (itemCount === 4) return 'w-56 h-56'; // Larger for 4 items in a row
    if (itemCount === 5) return 'w-52 h-52';
    if (itemCount === 6) return 'w-56 h-56';
    if (itemCount <= 9) return 'w-48 h-48';
    return 'w-40 h-40';
  };

  const getTextSize = () => {
    if (itemCount === 1) return { title: 'text-4xl', desc: 'text-2xl', badge: 'text-xl' };
    if (itemCount === 2) return { title: 'text-3xl', desc: 'text-xl', badge: 'text-lg' };
    if (itemCount === 3) return { title: 'text-3xl', desc: 'text-xl', badge: 'text-lg' };
    if (itemCount === 4) return { title: 'text-2xl', desc: 'text-lg', badge: 'text-base' };
    if (itemCount === 5) return { title: 'text-2xl', desc: 'text-lg', badge: 'text-base' };
    if (itemCount === 6) return { title: 'text-2xl', desc: 'text-lg', badge: 'text-base' };
    if (itemCount <= 9) return { title: 'text-xl', desc: 'text-base', badge: 'text-sm' };
    return { title: 'text-lg', desc: 'text-sm', badge: 'text-xs' };
  };

  const textSizes = getTextSize();

  return (
    <div
      ref={kitchenContainerRef}
      className={cn(
        'animate-in fade-in duration-500 relative overflow-hidden bg-background',
        isFullscreen
          ? 'fixed left-64 top-0 right-0 bottom-0 z-[9999] p-6'
          : 'h-[calc(100vh-8rem)]'
      )}
    >
      {/* Fullscreen Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          className="bg-background/90 backdrop-blur-sm shadow-lg"
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )}
        </Button>
      </div>

      {isReadOnly && !isFullscreen && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          👁️ You're viewing the kitchen board in read-only mode
        </div>
      )}

      <div className={cn('flex gap-4', isFullscreen ? 'h-full' : 'h-full')}>
        {/* Active Order Column - 85% */}
        <div className="w-[85%] flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 p-6 flex flex-col overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : activeOrder ? (
                <div
                  className={cn(
                    'flex flex-col h-full transition-all duration-500 ease-in-out',
                    isTransitioning
                      ? 'opacity-0 translate-x-[-50px] scale-95'
                      : 'opacity-100 translate-x-0 scale-100'
                  )}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between border-b pb-4 mb-4 flex-shrink-0 relative">
                    <div>
                      <h1 className="text-5xl font-bold mb-2">
                        {formatOrderNumber(activeOrder._id)}
                      </h1>
                      <div className="space-y-1">
                        <p className="text-2xl font-medium">{activeOrder.createdBy.name}</p>
                        {activeOrder.createdBy.phone && (
                          <p className="text-lg text-muted-foreground">
                            {activeOrder.createdBy.phone}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-lg text-muted-foreground">
                          <Clock className="h-5 w-5" />
                          <span>
                            {formatDistanceToNow(new Date(activeOrder.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      {/* Countdown Timer for Long Orders - Positioned top-right */}
                      {activeOrder.hasLongItems && activeOrder.timeoutAt && (
                        <AnalogCountdownTimer
                          timeoutAt={activeOrder.timeoutAt}
                          size={140}
                          className="bg-background/95 backdrop-blur-sm rounded-full p-2 shadow-lg border-2"
                        />
                      )}
                      <Badge variant="outline" className="text-xl px-6 py-3">
                        {activeOrder.payment.method === 'receipt' ? 'Receipt' : 'Cash'}
                      </Badge>
                    </div>
                  </div>

                  {/* Order Items - Dynamic Grid */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <h2 className="text-3xl font-semibold mb-6 flex-shrink-0">Order Items</h2>
                    <div className={cn('grid gap-6 flex-1', getItemGridCols(), 'auto-rows-fr', 'overflow-hidden')}>
                      {activeOrder.items.map((orderItem) => (
                        <Card
                          key={orderItem._id}
                          className="p-6 flex flex-col items-center justify-center hover:shadow-lg transition-shadow overflow-hidden min-h-0"
                        >
                          {/* Item Image */}
                          {orderItem.item.images && orderItem.item.images.length > 0 ? (
                            <div className="mb-4 flex-shrink-0">
                              <img
                                src={orderItem.item.images[0]}
                                alt={orderItem.item.name}
                                className={cn(
                                  'object-cover rounded-xl border-4 shadow-xl',
                                  getImageSize()
                                )}
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'bg-muted rounded-xl flex items-center justify-center mb-4 border-4 flex-shrink-0',
                                getImageSize()
                              )}
                            >
                              <ImageIcon className={cn(
                                'text-muted-foreground',
                                itemCount === 1 ? 'h-24 w-24' :
                                itemCount === 2 ? 'h-20 w-20' :
                                itemCount <= 4 ? 'h-16 w-16' :
                                itemCount <= 6 ? 'h-12 w-12' : 'h-8 w-8'
                              )} />
                            </div>
                          )}

                          {/* Item Details */}
                          <div className="text-center w-full flex-1 flex flex-col justify-center">
                            <h3 className={cn('font-bold mb-2', textSizes.title)}>
                              {orderItem.quantity}× {orderItem.item.name}
                            </h3>
                            {orderItem.item.description && (
                              <p className={cn('text-muted-foreground mb-3 line-clamp-2', textSizes.desc)}>
                                {orderItem.item.description}
                              </p>
                            )}

                            {/* Item Type Badge */}
                            <div className="flex items-center justify-center gap-3 mt-3">
                              <Badge
                                variant={
                                  (orderItem.cookingOverrideType ||
                                    orderItem.item.type) === 'long'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className={cn('px-4 py-2 font-semibold', textSizes.badge)}
                              >
                                {(orderItem.cookingOverrideType || orderItem.item.type) === 'long'
                                  ? 'Long'
                                  : 'Short'}
                              </Badge>
                              {orderItem.item.timeToCook && (
                                <span className={cn('text-muted-foreground font-medium', textSizes.desc)}>
                                  {Math.floor(orderItem.item.timeToCook / 60)} min
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  {!isReadOnly && (
                    <div className="pt-6 flex-shrink-0 border-t mt-4">
                      <Button
                        size="lg"
                        className="w-full text-2xl py-8"
                        onClick={handleMarkReady}
                        disabled={markReadyMutation.isPending}
                      >
                        <CheckCircle2 className="h-6 w-6 mr-3" />
                        {markReadyMutation.isPending ? 'Marking Ready...' : 'Mark as Ready'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ChefHat className="h-24 w-24 mb-4 opacity-40" />
                  <p className="text-3xl font-medium">No Active Order</p>
                  <p className="text-xl mt-2">Waiting for orders...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Queue Column - 15% */}
        <div className="w-[15%] flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 p-4 overflow-hidden flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0 pb-2 border-b">
                <Clock className="h-5 w-5" />
                <h2 className="font-semibold text-lg">Queue</h2>
                <Badge variant="secondary" className="ml-auto">
                  {queueOrders.length}
                </Badge>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : queueOrders.length > 0 ? (
                <div className="space-y-2 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {queueOrders.map((order, index) => {
                    const isActive = activeOrder?._id === order._id;
                    const isLongOrder = order.hasLongItems;
                    return (
                      <Card
                        key={order._id}
                        className={cn(
                          'p-3 cursor-pointer transition-all hover:shadow-md',
                          isActive && 'border-primary bg-primary/5',
                          !isActive && isLongOrder && 'border-amber-300 bg-amber-50/50 hover:bg-amber-50',
                          !isActive && !isLongOrder && 'hover:bg-muted/50'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p
                              className={cn(
                                'font-semibold',
                                isActive && 'text-primary',
                                !isActive && isLongOrder && 'text-amber-900',
                                !isActive && !isLongOrder && 'text-foreground'
                              )}
                            >
                              {formatOrderNumber(order._id)}
                            </p>
                            <div className="flex items-center gap-1">
                              {isLongOrder && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                  Long
                                </Badge>
                              )}
                              {isActive && (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.createdBy.name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs font-medium">
                              ${order.pricing?.total?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {index === 0 && !isActive && (
                            <Badge variant="outline" className="text-xs mt-1 w-full">
                              Next
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Queue is empty</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
