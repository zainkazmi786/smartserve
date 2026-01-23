import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Clock, Image as ImageIcon, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import {
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemStatus,
  getCategories,
  MenuItem,
  CreateMenuItemRequest,
} from '@/services/menuItemService';

/**
 * Form validation schema matching backend requirements
 */
const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['short', 'long'], {
    required_error: 'Type is required',
  }),
  timeToCook: z.number().min(1).optional(),
}).refine(
  (data) => {
    // If type is "long", timeToCook is required
    if (data.type === 'long' && (!data.timeToCook || data.timeToCook <= 0)) {
      return false;
    }
    // If type is "short", timeToCook should not be provided
    if (data.type === 'short' && data.timeToCook) {
      return false;
    }
    return true;
  },
  {
    message: 'Cook time is required for long items and must be excluded for short items',
    path: ['timeToCook'],
  }
);

type MenuItemFormData = z.infer<typeof menuItemSchema>;

export default function Items() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Image upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, [imagePreviews]);

  // Build query params for filtering
  const queryParams: { category?: string; isActive?: string } = {};
  if (selectedCategory !== 'all') {
    queryParams.category = selectedCategory;
  }
  if (activeFilter !== 'all') {
    queryParams.isActive = activeFilter === 'active' ? 'true' : 'false';
  }

  // Fetch menu items
  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery<MenuItem[]>({
    queryKey: ['menuItems', queryParams],
    queryFn: () => listMenuItems(queryParams),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['menuItemCategories'],
    queryFn: getCategories,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: ({ data, images }: { data: CreateMenuItemRequest; images?: File[] }) => 
      createMenuItem(data, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuItemCategories'] });
      toast({
        title: 'Success',
        description: 'Menu item created successfully',
      });
      setIsDialogOpen(false);
      handleFormReset();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to create menu item',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data, images }: { id: string; data: CreateMenuItemRequest; images?: File[] }) =>
      updateMenuItem(id, data, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: 'Success',
        description: 'Menu item updated successfully',
      });
      setIsDialogOpen(false);
      handleFormReset();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to update menu item',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: 'Success',
        description: 'Menu item deleted successfully',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to delete menu item',
        variant: 'destructive',
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleMenuItemStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
        defaultValues: {
    name: '',
          description: '',
          category: '',
          price: 0,
          type: 'short',
          timeToCook: undefined,
        },
  });

  const selectedType = watch('type');

  const handleFormReset = () => {
    reset({
      name: '',
      description: '',
      category: '',
      price: 0,
      type: 'short',
      timeToCook: undefined,
    });
    setEditingItem(null);
    setSelectedImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      // Use reset to properly initialize form state and enable isDirty tracking
      reset({
        name: item.name,
        description: item.description || '',
        category: item.category,
        price: item.price,
        type: item.type,
        timeToCook: item.timeToCook ? Math.floor(item.timeToCook / 60) : undefined,
      });
      // Store existing images
      setExistingImages(item.images && item.images.length > 0 ? item.images : []);
      // Clear selected images when editing
      setSelectedImages([]);
      setImagePreviews([]);
    } else {
      handleFormReset();
    }
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({
        title: 'Too many files',
        description: 'You can upload maximum 5 images.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        invalidFiles.push(file.name);
      } else if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} (exceeds 5MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid files',
        description: `Some files were rejected: ${invalidFiles.join(', ')}. Only JPEG, PNG, WebP images under 5MB are allowed.`,
        variant: 'destructive',
      });
    }

    setSelectedImages(validFiles);
    
    // Create previews
    const previews = validFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = (index: number) => {
    const newExistingImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(newExistingImages);
  };

  const onSubmit = async (data: MenuItemFormData) => {
    const menuItemData: CreateMenuItemRequest = {
      name: data.name,
      description: data.description || undefined,
      category: data.category,
      price: data.price,
      type: data.type,
      timeToCook: data.type === 'long' && data.timeToCook ? data.timeToCook * 60 : undefined, // Convert minutes to seconds
    };

    if (editingItem) {
      // For update: if new images selected, upload files (replaces all existing)
      // Otherwise, send existing images array (handles removals)
      if (selectedImages.length > 0) {
        // Upload new files - these will replace all existing images
        updateMutation.mutate({ 
          id: editingItem._id, 
          data: menuItemData,
          images: selectedImages,
        });
      } else {
        // No new files selected - send updated existing images array
        // This handles the case where user removed some existing images
        updateMutation.mutate({ 
          id: editingItem._id, 
          data: {
            ...menuItemData,
            images: existingImages.length > 0 ? existingImages : [],
          },
        });
      }
    } else {
      // For create: upload files if selected
      createMutation.mutate({ 
        data: menuItemData, 
        images: selectedImages.length > 0 ? selectedImages : undefined,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = async (item: MenuItem) => {
    toggleStatusMutation.mutate({
      id: item._id,
      isActive: !item.isActive,
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedCategory('all');
    setActiveFilter('all');
  };

  // Convert seconds to minutes for display
  const formatCookTime = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const isLoadingMutation = createMutation.isPending || updateMutation.isPending;
  const hasActiveFilters = selectedCategory !== 'all' || activeFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Item Management</h2>
          <p className="text-muted-foreground">Manage all menu items and their details</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Update the item details below.'
                  : 'Fill in the details for the new menu item.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Cappuccino"
                  {...register('name')}
                  disabled={isLoadingMutation}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Item description..."
                  {...register('description')}
                  disabled={isLoadingMutation}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category"
                    placeholder="e.g., Beverages"
                    {...register('category')}
                    disabled={isLoadingMutation}
                    list="category-list"
                  />
                  {categories.length > 0 && (
                    <datalist id="category-list">
                      {categories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  )}
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Price ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('price', { valueAsNumber: true })}
                    disabled={isLoadingMutation}
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="type">
                    Type <span className="text-destructive">*</span>
                  </Label>
                <Select
                    value={selectedType}
                    onValueChange={(value: 'short' | 'long') => {
                      setValue('type', value);
                      if (value === 'short') {
                        setValue('timeToCook', undefined);
                      }
                    }}
                    disabled={isLoadingMutation}
                >
                  <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>
                {selectedType === 'long' && (
                  <div className="space-y-2">
                    <Label htmlFor="timeToCook">
                      Cook Time (min) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="timeToCook"
                      type="number"
                      min="1"
                      placeholder="5"
                      {...register('timeToCook', { valueAsNumber: true })}
                      disabled={isLoadingMutation}
                    />
                    {errors.timeToCook && (
                      <p className="text-sm text-destructive">{errors.timeToCook.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Images</Label>
                <div className="flex flex-col gap-2">
                <Input
                    ref={fileInputRef}
                    id="images"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    disabled={isLoadingMutation}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload up to 5 images (JPEG, PNG, WebP, max 5MB each)
                  </p>
                </div>
                
                {/* Existing images preview (for edit mode) */}
                {existingImages.length > 0 && selectedImages.length === 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm font-medium">Existing Images</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {existingImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                            <img
                              src={url}
                              alt={`Existing ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeExistingImage(index)}
                            disabled={isLoadingMutation}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload new images to replace these, or remove individual images above
                    </p>
                  </div>
                )}

                {/* New images preview */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm font-medium">Selected Images</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                            disabled={isLoadingMutation}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoadingMutation}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    isLoadingMutation || 
                    (!editingItem && !isDirty)
                  }
                >
                  {isLoadingMutation
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Item'
                    : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            All Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load menu items. Please try again.
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                  <TableHead>Type</TableHead>
                <TableHead>Cook Time</TableHead>
                  <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                  <TableRow key={item._id}>
                  <TableCell>
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted">
                      <img
                          src={item.images && item.images.length > 0 ? item.images[0] : '/placeholder.svg'}
                        alt={item.name}
                        className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                      />
                    </div>
                  </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                      <Badge variant={item.type === 'long' ? 'default' : 'secondary'}>
                        {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                        {formatCookTime(item.timeToCook)}
                    </div>
                  </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.isActive ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(item)}
                        title={`Click to ${item.isActive ? 'deactivate' : 'activate'}`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                          title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item._id)}
                          disabled={deleteMutation.isPending}
                          title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters
                        ? 'No items found matching your filters.'
                        : 'No items found. Add your first item to get started.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
