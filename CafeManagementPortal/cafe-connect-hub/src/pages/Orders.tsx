import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Calendar, Eye, MoreHorizontal, CheckCircle2, XCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  listOrders,
  approveOrder,
  disapproveOrder,
  cancelOrder,
  markOrderReady,
  getOrder,
  Order as BackendOrder,
} from '@/services/orderService';
import {
  mapBackendStatusToDisplay,
  getStatusLabel,
  canApproveOrder,
  canDisapproveOrder,
  canCancelOrder,
  canMarkReady,
  getOrderDisplayNumber,
} from '@/utils/orderUtils';

// Status badge component for backend statuses
function StatusBadge({ status }: { status: BackendOrder['status'] }) {
  const displayStatus = mapBackendStatusToDisplay(status);
  const label = getStatusLabel(status);

  const statusConfig: Record<string, { className: string }> = {
    pending: {
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200',
    },
    preparing: {
      className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    },
    ready: {
      className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
    },
    completed: {
      className: 'bg-secondary text-secondary-foreground hover:bg-secondary border-border',
    },
    cancelled: {
      className: 'bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20',
    },
    disapproved: {
      className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
    },
  };

  const config = statusConfig[displayStatus] || statusConfig.pending;

  return (
    <Badge variant="outline" className={`${config.className} font-medium`}>
      {label}
    </Badge>
  );
}

// Payment method badge
function PaymentBadge({ method }: { method: 'receipt' | 'cash' }) {
  return (
    <Badge variant="outline" className="text-xs">
      {method === 'receipt' ? 'Receipt' : 'Cash'}
    </Badge>
  );
}

export default function Orders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDisapproveDialogOpen, setIsDisapproveDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [cookingOverrides, setCookingOverrides] = useState<Record<string, 'short' | 'long'>>({});

  // Build query params
  const queryParams: {
    status?: string;
    paymentMethod?: 'receipt' | 'cash';
  } = {};

  if (statusFilter !== 'all') {
    queryParams.status = statusFilter;
  }
  if (paymentFilter !== 'all') {
    queryParams.paymentMethod = paymentFilter as 'receipt' | 'cash';
  }

  // Fetch orders
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery<BackendOrder[]>({
    queryKey: ['orders', queryParams],
    queryFn: () => listOrders(queryParams),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({
      id,
      paidAmount,
      cookingOverrides,
    }: {
      id: string;
      paidAmount?: number;
      cookingOverrides?: Array<{ orderItemId: string; type: 'short' | 'long' }>;
    }) => approveOrder(id, { paidAmount, cookingOverrides }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsApproveDialogOpen(false);
      setIsDetailDialogOpen(false);
      setCookingOverrides({});
      toast({
        title: 'Order Approved',
        description: 'Order has been approved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve order',
        variant: 'destructive',
      });
    },
  });

  // Disapprove mutation
  const disapproveMutation = useMutation({
    mutationFn: ({ id, rejectionNote }: { id: string; rejectionNote: string }) =>
      disapproveOrder(id, { rejectionNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDisapproveDialogOpen(false);
      setRejectionNote('');
      setIsDetailDialogOpen(false);
      toast({
        title: 'Order Disapproved',
        description: 'Order has been disapproved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disapprove order',
        variant: 'destructive',
      });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, cancellationNote }: { id: string; cancellationNote?: string }) =>
      cancelOrder(id, { cancellationNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDetailDialogOpen(false);
      toast({
        title: 'Order Cancelled',
        description: 'Order has been cancelled successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    },
  });

  // Mark ready mutation
  const markReadyMutation = useMutation({
    mutationFn: markOrderReady,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDetailDialogOpen(false);
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

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const orderNumber = getOrderDisplayNumber(order);
    const customerName = order.createdBy.name.toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch =
      orderNumber.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower) ||
      order.createdBy.email?.toLowerCase().includes(searchLower) ||
      order.createdBy.phone?.includes(searchLower);

    return matchesSearch;
  });

  const handleViewOrder = async (order: BackendOrder) => {
    try {
      // Fetch full order details
      const fullOrder = await getOrder(order._id);
      setSelectedOrder(fullOrder);
      setIsDetailDialogOpen(true);
    } catch (error) {
      // If fetch fails, use the order from list
      setSelectedOrder(order);
      setIsDetailDialogOpen(true);
    }
  };

  const handleApprove = () => {
    if (!selectedOrder) return;
    
    // Convert cookingOverrides object to array format expected by backend
    const overridesArray = Object.entries(cookingOverrides)
      .filter(([_, type]) => type !== undefined)
      .map(([orderItemId, type]) => ({
        orderItemId,
        type: type as 'short' | 'long',
      }));

    approveMutation.mutate({
      id: selectedOrder._id,
      paidAmount: selectedOrder.pricing.total,
      cookingOverrides: overridesArray.length > 0 ? overridesArray : undefined,
    });
  };

  const handleOpenApproveDialog = (order: BackendOrder) => {
    setSelectedOrder(order);
    // Initialize cooking overrides with current item types or empty
    const initialOverrides: Record<string, 'short' | 'long'> = {};
    order.items.forEach((item) => {
      // Don't set default, let user choose
      initialOverrides[item._id] = undefined as any;
    });
    setCookingOverrides(initialOverrides);
    setIsApproveDialogOpen(true);
  };

  const handleCookingOverrideChange = (orderItemId: string, type: 'short' | 'long' | 'default') => {
    setCookingOverrides((prev) => {
      const newOverrides = { ...prev };
      if (type === 'default') {
        // Remove override to use item's default type
        delete newOverrides[orderItemId];
      } else {
        newOverrides[orderItemId] = type;
      }
      return newOverrides;
    });
  };

  const handleDisapprove = () => {
    if (!selectedOrder || !rejectionNote.trim()) {
      toast({
        title: 'Rejection Note Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }
    disapproveMutation.mutate({
      id: selectedOrder._id,
      rejectionNote: rejectionNote.trim(),
    });
  };

  const handleCancel = () => {
    if (!selectedOrder) return;
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate({
        id: selectedOrder._id,
      });
    }
  };

  const handleMarkReady = (orderId?: string) => {
    const orderToMark = orderId ? orders.find((o) => o._id === orderId) : selectedOrder;
    if (!orderToMark) return;
    markReadyMutation.mutate(orderToMark._id);
  };

  const isLoadingMutation =
    approveMutation.isPending ||
    disapproveMutation.isPending ||
    cancelMutation.isPending ||
    markReadyMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading orders. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="payment_uploaded">Payment Uploaded</SelectItem>
                <SelectItem value="cash_selected">Cash Selected</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="disapproved">Disapproved</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewOrder(order)}
                >
                  <TableCell className="font-semibold">
                    {getOrderDisplayNumber(order)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.createdBy.name}</p>
                      {order.createdBy.phone && (
                        <p className="text-xs text-muted-foreground">{order.createdBy.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <PaymentBadge method={order.payment.method} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="cursor-pointer hover:opacity-80 transition-opacity">
                          <StatusBadge status={order.status} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {canApproveOrder(order) && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenApproveDialog(order);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {canDisapproveOrder(order) && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setIsDisapproveDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Disapprove
                          </DropdownMenuItem>
                        )}
                        {canMarkReady(order) && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkReady(order._id);
                            }}
                          >
                            Mark as Ready
                          </DropdownMenuItem>
                        )}
                        {canCancelOrder(order) && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              handleCancel();
                            }}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                        {!canApproveOrder(order) &&
                          !canDisapproveOrder(order) &&
                          !canMarkReady(order) &&
                          !canCancelOrder(order) && (
                            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${order.pricing.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOrder(order);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Order {getOrderDisplayNumber(selectedOrder)}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={selectedOrder.status} />
                    <PaymentBadge method={selectedOrder.payment.method} />
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Customer Info */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <h3 className="font-semibold">Customer Information</h3>
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {selectedOrder.createdBy.name}
                  </p>
                  {selectedOrder.createdBy.email && (
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {selectedOrder.createdBy.email}
                    </p>
                  )}
                  {selectedOrder.createdBy.phone && (
                    <p className="text-sm">
                      <span className="font-medium">Phone:</span> {selectedOrder.createdBy.phone}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedOrder.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((orderItem) => (
                      <div key={orderItem._id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{orderItem.item.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ×{orderItem.quantity}
                            </span>
                            {orderItem.cookingOverrideType && (
                              <Badge variant="outline" className="text-xs">
                                {orderItem.cookingOverrideType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ${orderItem.item.price.toFixed(2)} each
                          </p>
                        </div>
                        <span className="font-medium">
                          ${(orderItem.item.price * orderItem.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                {selectedOrder.payment.receiptImage && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Receipt</h3>
                    <img
                      src={selectedOrder.payment.receiptImage}
                      alt="Receipt"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                {selectedOrder.payment.rejectionNote && (
                  <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                    <h3 className="font-semibold text-red-800">Rejection Note</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {selectedOrder.payment.rejectionNote}
                    </p>
                  </div>
                )}

                {/* Pricing Summary */}
                <div className="rounded-lg bg-primary/5 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedOrder.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${selectedOrder.pricing.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">
                        ${selectedOrder.pricing.total.toFixed(2)}
                      </span>
                    </div>
                    {selectedOrder.payment.paidAmount && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Paid Amount</span>
                        <span>${selectedOrder.payment.paidAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <DialogFooter className="flex-wrap gap-2">
                {canApproveOrder(selectedOrder) && (
                  <Button
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      handleOpenApproveDialog(selectedOrder);
                    }}
                    disabled={isLoadingMutation}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {canDisapproveOrder(selectedOrder) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      setIsDisapproveDialogOpen(true);
                    }}
                    disabled={isLoadingMutation}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Disapprove
                  </Button>
                )}
                {canMarkReady(selectedOrder) && (
                  <Button onClick={handleMarkReady} disabled={isLoadingMutation}>
                    Mark as Ready
                  </Button>
                )}
                {canCancelOrder(selectedOrder) && (
                  <Button variant="outline" onClick={handleCancel} disabled={isLoadingMutation}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Order</DialogTitle>
            <DialogDescription>
              Review the order and set cooking preferences. The order will be sent to the kitchen.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Total Amount */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">${selectedOrder.pricing.total.toFixed(2)}</p>
              </div>

              {/* Cooking Overrides */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Cooking Preferences</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Override the default cooking type (short/long) for each item if needed.
                  </p>
                </div>
                <div className="space-y-3 border rounded-lg p-4">
                  {selectedOrder.items.map((orderItem) => {
                    const currentOverride = cookingOverrides[orderItem._id];
                    const displayType = currentOverride || orderItem.item.type || 'short';
                    const isOverridden = currentOverride !== undefined;

                    return (
                      <div
                        key={orderItem._id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{orderItem.item.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ×{orderItem.quantity}
                            </span>
                            {isOverridden && (
                              <Badge variant="outline" className="text-xs">
                                Overridden
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Default: {orderItem.item.type || 'short'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={currentOverride || 'default'}
                            onValueChange={(value) =>
                              handleCookingOverrideChange(
                                orderItem._id,
                                value as 'short' | 'long' | 'default'
                              )
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">
                                Default ({orderItem.item.type || 'short'})
                              </SelectItem>
                              <SelectItem value="short">Short</SelectItem>
                              <SelectItem value="long">Long</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false);
                setCookingOverrides({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoadingMutation}>
              Approve Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disapprove Dialog */}
      <Dialog open={isDisapproveDialogOpen} onOpenChange={setIsDisapproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disapprove Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionNote">Rejection Note *</Label>
              <Textarea
                id="rejectionNote"
                placeholder="Enter reason for rejection..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisapproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisapprove}
              disabled={isLoadingMutation || !rejectionNote.trim()}
            >
              Disapprove Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
