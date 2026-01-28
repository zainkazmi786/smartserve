import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Clock, Calendar, Power, PowerOff, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  listMenus,
  createMenu,
  updateMenu,
  activateMenu,
  deactivateMenu,
  deleteMenu,
  setTimeSlots,
  removeTimeSlots,
  addItemsToMenu,
  removeItemsFromMenu,
  Menu,
  TimeSlot,
} from '@/services/menuService';
import { listMenuItems, MenuItem } from '@/services/menuItemService';

// Day mapping: frontend day names to backend dayOfWeek (0=Sunday, 6=Saturday)
const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const REVERSE_DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const DAYS_OF_WEEK = [
  { id: 'sunday', label: 'Sun' },
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
];

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

export default function Menus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isTimeSlotDialogOpen, setIsTimeSlotDialogOpen] = useState(false);
  const [selectedMenuForTimeSlots, setSelectedMenuForTimeSlots] = useState<Menu | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    itemIds: [] as string[],
    startTime: '08:00',
    endTime: '22:00',
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as string[],
    priority: 1,
  });

  // Fetch menus
  const {
    data: menus = [],
    isLoading: menusLoading,
    error: menusError,
  } = useQuery<Menu[]>({
    queryKey: ['menus'],
    queryFn: listMenus,
  });

  // Fetch menu items for selection
  const {
    data: menuItems = [],
    isLoading: itemsLoading,
  } = useQuery<MenuItem[]>({
    queryKey: ['menuItems', { isActive: true }],
    queryFn: () => listMenuItems({ isActive: true }),
  });

  // Create menu mutation
  const createMutation = useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Menu Created',
        description: 'Menu has been created successfully.',
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create menu',
        variant: 'destructive',
      });
    },
  });

  // Update menu mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; items?: string[] } }) =>
      updateMenu(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Menu Updated',
        description: 'Menu has been updated successfully.',
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update menu',
        variant: 'destructive',
      });
    },
  });

  // Activate menu mutation
  const activateMutation = useMutation({
    mutationFn: activateMenu,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      // The backend message already includes time slot warning if applicable
      toast({
        title: 'Menu Activated',
        description: 'Menu has been activated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate menu',
        variant: 'destructive',
      });
    },
  });

  // Deactivate menu mutation
  const deactivateMutation = useMutation({
    mutationFn: deactivateMenu,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      // The backend message already includes time slot warning if applicable
      toast({
        title: 'Menu Deactivated',
        description: 'Menu has been deactivated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate menu',
        variant: 'destructive',
      });
    },
  });

  // Delete menu mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Menu Deleted',
        description: 'Menu has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete menu',
        variant: 'destructive',
      });
    },
  });

  // Set time slots mutation
  const setTimeSlotsMutation = useMutation({
    mutationFn: ({ id, timeSlots }: { id: string; timeSlots: TimeSlot[] }) =>
      setTimeSlots(id, { timeSlots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Time Slots Updated',
        description: 'Time slots have been updated successfully.',
      });
      setIsTimeSlotDialogOpen(false);
      setSelectedMenuForTimeSlots(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update time slots',
        variant: 'destructive',
      });
    },
  });

  // Remove time slots mutation
  const removeTimeSlotsMutation = useMutation({
    mutationFn: removeTimeSlots,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Time Slots Removed',
        description: 'Time slots have been removed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove time slots',
        variant: 'destructive',
      });
    },
  });

  // Add items mutation
  const addItemsMutation = useMutation({
    mutationFn: ({ id, itemIds }: { id: string; itemIds: string[] }) =>
      addItemsToMenu(id, { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Items Added',
        description: 'Items have been added to menu successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add items',
        variant: 'destructive',
      });
    },
  });

  // Remove items mutation
  const removeItemsMutation = useMutation({
    mutationFn: ({ id, itemIds }: { id: string; itemIds: string[] }) =>
      removeItemsFromMenu(id, { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({
        title: 'Items Removed',
        description: 'Items have been removed from menu successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove items',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      itemIds: [],
      startTime: '08:00',
      endTime: '22:00',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      priority: 1,
    });
    setEditingMenu(null);
  };

  const handleOpenDialog = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        name: menu.name,
        itemIds: menu.items.map((item) => item._id),
        startTime: menu.timeSlots.length > 0 ? menu.timeSlots[0].startTime : '08:00',
        endTime: menu.timeSlots.length > 0 ? menu.timeSlots[0].endTime : '22:00',
        activeDays:
          menu.timeSlots.length > 0
            ? menu.timeSlots.map((slot) => REVERSE_DAY_MAP[slot.dayOfWeek])
            : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        priority: menu.timeSlots.length > 0 ? menu.timeSlots[0].priority || 1 : 1,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenTimeSlotDialog = (menu: Menu) => {
    setSelectedMenuForTimeSlots(menu);
    if (menu.timeSlots.length > 0) {
      const firstSlot = menu.timeSlots[0];
      setFormData({
        name: menu.name,
        itemIds: menu.items.map((item) => item._id),
        startTime: firstSlot.startTime,
        endTime: firstSlot.endTime,
        activeDays: menu.timeSlots.map((slot) => REVERSE_DAY_MAP[slot.dayOfWeek]),
        priority: firstSlot.priority || 1,
      });
    } else {
      setFormData({
        name: menu.name,
        itemIds: menu.items.map((item) => item._id),
        startTime: '08:00',
        endTime: '22:00',
        activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        priority: 1,
      });
    }
    setIsTimeSlotDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMenu) {
      // Update menu
      if (editingMenu.status === 'active') {
        toast({
          title: 'Cannot Edit Active Menu',
          description: 'Please deactivate the menu first before editing.',
          variant: 'destructive',
        });
        return;
      }

      updateMutation.mutate({
        id: editingMenu._id,
        data: {
          name: formData.name,
          items: formData.itemIds,
        },
      });
    } else {
      // Create menu
      createMutation.mutate({
        name: formData.name,
        items: formData.itemIds,
      });
    }
  };

  const handleTimeSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMenuForTimeSlots) return;

    // Convert active days to time slots
    const timeSlots: TimeSlot[] = formData.activeDays.map((day) => ({
      dayOfWeek: DAY_MAP[day],
      startTime: formData.startTime,
      endTime: formData.endTime,
      priority: formData.priority,
    }));

    setTimeSlotsMutation.mutate({
      id: selectedMenuForTimeSlots._id,
      timeSlots,
    });
  };

  const handleToggleStatus = (menu: Menu) => {
    const hasTimeSlots = menu.timeSlots && menu.timeSlots.length > 0;
    
    if (menu.status === 'active') {
      // Deactivating a menu
      const message = hasTimeSlots
        ? `Are you sure you want to deactivate "${menu.name}"? Time slots will be removed.`
        : `Are you sure you want to deactivate "${menu.name}"?`;
      
      if (window.confirm(message)) {
        deactivateMutation.mutate(menu._id);
      }
    } else {
      // Activating a menu
      const message = hasTimeSlots
        ? `Are you sure you want to activate "${menu.name}"? Time slots will be removed as the menu will be manually controlled.`
        : `Are you sure you want to activate "${menu.name}"?`;
      
      if (window.confirm(message)) {
        activateMutation.mutate(menu._id);
      }
    }
  };

  const handleDelete = (menu: Menu) => {
    if (window.confirm(`Are you sure you want to delete "${menu.name}"?`)) {
      deleteMutation.mutate(menu._id);
    }
  };

  const handleRemoveTimeSlots = (menu: Menu) => {
    if (window.confirm(`Are you sure you want to remove time slots from "${menu.name}"?`)) {
      removeTimeSlotsMutation.mutate(menu._id);
    }
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      activeDays: prev.activeDays.includes(day)
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day],
    }));
  };

  const toggleItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      itemIds: prev.itemIds.includes(itemId)
        ? prev.itemIds.filter((id) => id !== itemId)
        : [...prev.itemIds, itemId],
    }));
  };

  const getItemNames = (itemIds: string[]) => {
    return itemIds
      .map((id) => menuItems.find((item) => item._id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const formatDays = (days: string[]) => {
    return days.map((d) => DAYS_OF_WEEK.find((day) => day.id === d)?.label).join(', ');
  };

  const formatTimeSlots = (menu: Menu) => {
    if (menu.timeSlots.length === 0) {
      return 'No time slots';
    }

    // Group by time range
    const grouped: Record<string, number[]> = {};
    menu.timeSlots.forEach((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(slot.dayOfWeek);
    });

    return Object.entries(grouped)
      .map(([timeRange, days]) => {
        const dayLabels = days.map((d) => REVERSE_DAY_MAP[d]).map((d) => DAYS_OF_WEEK.find((day) => day.id === d)?.label).join(', ');
        return `${dayLabels}: ${timeRange}`;
      })
      .join(' | ');
  };

  const isLoadingMutation =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    deleteMutation.isPending ||
    setTimeSlotsMutation.isPending ||
    removeTimeSlotsMutation.isPending;

  if (menusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading menus...</p>
      </div>
    );
  }

  if (menusError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading menus. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Menu Management</h2>
          <p className="text-muted-foreground">Create and manage your cafe menus</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMenu ? 'Edit Menu' : 'Create New Menu'}</DialogTitle>
              <DialogDescription>
                {editingMenu
                  ? 'Update the menu details. Note: Active menus cannot be edited.'
                  : 'Set up a new menu with items.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="menuName">Menu Name</Label>
                <Input
                  id="menuName"
                  placeholder="e.g., Breakfast Menu"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoadingMutation}
                />
              </div>

              {/* Items Selection */}
              <div className="space-y-3">
                <Label>Menu Items</Label>
                {itemsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading items...</p>
                ) : (
                  <>
                    <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
                      {menuItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No menu items available. Create items first.
                        </p>
                      ) : (
                        menuItems.map((item) => (
                          <label
                            key={item._id}
                            htmlFor={`item-${item._id}`}
                            className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                          >
                            <Checkbox
                              id={`item-${item._id}`}
                              checked={formData.itemIds.includes(item._id)}
                              onCheckedChange={() => toggleItem(item._id)}
                              disabled={isLoadingMutation}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ${item.price.toFixed(2)} • {item.category}
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.itemIds.length} item(s) selected
                    </p>
                  </>
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
                <Button type="submit" disabled={isLoadingMutation}>
                  {isLoadingMutation
                    ? 'Saving...'
                    : editingMenu
                    ? 'Update Menu'
                    : 'Create Menu'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Menus Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menus
          .filter((menu) => menu.status !== 'deleted')
          .map((menu) => (
            <Card key={menu._id} className={cn(menu.status !== 'active' && 'opacity-60')}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {menu.name}
                      <Badge variant={menu.status === 'active' ? 'default' : 'secondary'}>
                        {menu.status === 'active' ? 'Active' : menu.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {menu.items.length} items
                      {menu.timeSlots.length > 0 && ` • ${menu.timeSlots.length} time slot(s)`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={menu.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(menu)}
                      disabled={isLoadingMutation}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Time Slots */}
                {menu.timeSlots.length > 0 ? (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-muted-foreground line-clamp-2">
                        {formatTimeSlots(menu)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>No time slots configured</span>
                  </div>
                )}

                {/* Items Preview */}
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {menu.items.length > 0
                      ? menu.items.map((item) => item.name).join(', ')
                      : 'No items added'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(menu)}
                      disabled={isLoadingMutation || menu.status === 'active'}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant={menu.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleStatus(menu)}
                      disabled={isLoadingMutation}
                    >
                      {menu.status === 'active' ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenTimeSlotDialog(menu)}
                      disabled={isLoadingMutation}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Time Slots
                    </Button>
                    {menu.timeSlots.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTimeSlots(menu)}
                        disabled={isLoadingMutation}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(menu)}
                      disabled={isLoadingMutation}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {menus.filter((menu) => menu.status !== 'deleted').length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              No menus found. Create your first menu to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Time Slot Dialog */}
      <Dialog open={isTimeSlotDialogOpen} onOpenChange={setIsTimeSlotDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Time Slots</DialogTitle>
            <DialogDescription>
              Set when this menu should be active. Time slots take priority over manual activation.
            </DialogDescription>
          </DialogHeader>
          {selectedMenuForTimeSlots && (
            <form onSubmit={handleTimeSlotSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Menu: {selectedMenuForTimeSlots.name}</Label>
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-4">
                <Label>Active Time</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm text-muted-foreground">
                      Start Time
                    </Label>
                    <Select
                      value={formData.startTime}
                      onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                      disabled={isLoadingMutation}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm text-muted-foreground">
                      End Time
                    </Label>
                    <Select
                      value={formData.endTime}
                      onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                      disabled={isLoadingMutation}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                  }
                  disabled={isLoadingMutation}
                />
                <p className="text-sm text-muted-foreground">
                  Higher priority menus take precedence when time slots overlap.
                </p>
              </div>

              {/* Days Selection */}
              <div className="space-y-3">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.id}
                      type="button"
                      variant={formData.activeDays.includes(day.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDay(day.id)}
                      className="min-w-[48px]"
                      disabled={isLoadingMutation}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsTimeSlotDialogOpen(false);
                    setSelectedMenuForTimeSlots(null);
                  }}
                  disabled={isLoadingMutation}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoadingMutation}>
                  {isLoadingMutation ? 'Saving...' : 'Save Time Slots'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
