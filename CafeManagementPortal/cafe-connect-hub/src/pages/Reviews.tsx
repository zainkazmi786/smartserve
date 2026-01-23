import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Star, MessageSquare, Trash2, Eye, Reply, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  listReviews,
  replyToReview,
  deleteReview,
  getReview,
  Review,
} from '@/services/reviewService';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const replySchema = z.object({
  message: z.string().min(1, 'Reply message is required').max(500, 'Reply must be 500 characters or less'),
});

type ReplyFormData = z.infer<typeof replySchema>;

// Star rating display component
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-muted-foreground">({rating})</span>
    </div>
  );
}

export default function Reviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);

  // Check permissions
  const canReply = hasPermission(user, 'reviews', 'update');
  const canDelete = hasPermission(user, 'reviews', 'delete');

  // Build query params
  const queryParams: {
    rating?: number;
    page?: number;
    limit?: number;
    sort?: string;
  } = {
    page,
    limit: 10,
    sort: '-createdAt',
  };

  if (ratingFilter !== 'all') {
    queryParams.rating = parseInt(ratingFilter);
  }

  // Fetch reviews
  const {
    data: reviewsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reviews', queryParams],
    queryFn: () => listReviews(queryParams),
  });

  const reviews = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination;

  // Reply form
  const replyForm = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      message: '',
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      replyToReview(id, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setIsReplyDialogOpen(false);
      replyForm.reset();
      toast({
        title: 'Success',
        description: 'Reply added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add reply',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setDeletingReview(null);
      toast({
        title: 'Success',
        description: 'Review deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete review',
        variant: 'destructive',
      });
    },
  });

  // Handle reply
  const handleReply = (review: Review) => {
    setSelectedReview(review);
    replyForm.reset({
      message: review.managerReply?.message || '',
    });
    setIsReplyDialogOpen(true);
  };

  // Handle view details
  const handleViewDetails = async (review: Review) => {
    try {
      const fullReview = await getReview(review._id);
      setSelectedReview(fullReview);
      setIsDetailDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load review details',
        variant: 'destructive',
      });
    }
  };

  // Filter reviews by search query
  const filteredReviews = reviews.filter((review) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.user.name.toLowerCase().includes(query) ||
      review.user.email?.toLowerCase().includes(query) ||
      review.user.phone?.toLowerCase().includes(query) ||
      review.comment?.toLowerCase().includes(query) ||
      review.item?.name.toLowerCase().includes(query)
    );
  });

  // Submit reply
  const onSubmitReply = (data: ReplyFormData) => {
    if (!selectedReview) return;
    replyMutation.mutate({ id: selectedReview._id, message: data.message });
  };

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load reviews. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground">Manage customer reviews and respond to feedback</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by customer name, email, phone, comment, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} total reviews` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reviews found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Reply</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{review.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {review.user.email || review.user.phone || 'No contact'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {review.item ? (
                          <div className="flex items-center gap-2">
                            {review.item.image && review.item.image[0] && (
                              <img
                                src={review.item.image[0]}
                                alt={review.item.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">{review.item.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StarRating rating={review.rating} />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          {review.comment ? (
                            <p className="text-sm line-clamp-2">{review.comment}</p>
                          ) : (
                            <span className="text-muted-foreground text-sm">No comment</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {review.managerReply ? (
                          <div className="max-w-[200px]">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Replied
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {review.managerReply.message}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500">
                            No reply
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(review)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canReply && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReply(review)}
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingReview(review)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Respond to {selectedReview?.user.name}'s review
            </DialogDescription>
          </DialogHeader>
          <Form {...replyForm}>
            <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="space-y-4">
              <div className="space-y-2">
                <Label>Review</Label>
                <div className="p-3 bg-muted rounded-md">
                  <StarRating rating={selectedReview?.rating || 0} />
                  {selectedReview?.comment && (
                    <p className="mt-2 text-sm">{selectedReview.comment}</p>
                  )}
                </div>
              </div>
              <FormField
                control={replyForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Reply</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Type your reply here..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/500
                      </span>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReplyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={replyMutation.isPending}>
                  {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Review Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedReview.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReview.user.email || selectedReview.user.phone || 'No contact'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rating</Label>
                  <StarRating rating={selectedReview.rating} />
                </div>
                {selectedReview.item && (
                  <div>
                    <Label className="text-muted-foreground">Item</Label>
                    <div className="flex items-center gap-2">
                      {selectedReview.item.image && selectedReview.item.image[0] && (
                        <img
                          src={selectedReview.item.image[0]}
                          alt={selectedReview.item.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{selectedReview.item.name}</p>
                        {selectedReview.item.description && (
                          <p className="text-sm text-muted-foreground">
                            {selectedReview.item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">
                    {new Date(selectedReview.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedReview.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {selectedReview.comment && (
                <div>
                  <Label className="text-muted-foreground">Comment</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{selectedReview.comment}</p>
                </div>
              )}
              {selectedReview.managerReply && (
                <div>
                  <Label className="text-muted-foreground">Manager Reply</Label>
                  <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm">{selectedReview.managerReply.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Replied {formatDistanceToNow(new Date(selectedReview.managerReply.repliedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            {canReply && selectedReview && !selectedReview.managerReply && (
              <Button onClick={() => {
                setIsDetailDialogOpen(false);
                handleReply(selectedReview);
              }}>
                Reply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingReview} onOpenChange={() => setDeletingReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReview && deleteMutation.mutate(deletingReview._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
