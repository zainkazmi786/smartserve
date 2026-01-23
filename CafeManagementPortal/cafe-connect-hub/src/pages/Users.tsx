import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Power, PowerOff, Search, Users as UsersIcon, UserCheck, UserCog, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  listUsers,
  createUser,
  updateUserStatus,
  deleteUser,
  User,
} from '@/services/userService';
import { formatDistanceToNow } from 'date-fns';
import { hasPermission } from '@/lib/permissions';

const receptionistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

type ReceptionistFormData = z.infer<typeof receptionistSchema>;

const ROLE_ICONS = {
  customer: UserX,
  manager: UserCog,
  receptionist: UserCheck,
  superadmin: UsersIcon,
};

const ROLE_COLORS = {
  customer: 'bg-blue-100 text-blue-800 border-blue-200',
  manager: 'bg-purple-100 text-purple-800 border-purple-200',
  receptionist: 'bg-green-100 text-green-800 border-green-200',
  superadmin: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, activeCafeId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Build query params
  const queryParams: { role?: string } = {};
  if (roleFilter !== 'all') {
    queryParams.role = roleFilter;
  }

  // Fetch users
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ['users', queryParams],
    queryFn: () => listUsers(queryParams),
  });

  // Create form
  const createForm = useForm<ReceptionistFormData>({
    resolver: zodResolver(receptionistSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  });


  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ReceptionistFormData) => {
      // For managers, auto-assign their cafe. For superadmin, they need to specify cafes
      const cafes = currentUser?.role?.name === 'superadmin' 
        ? undefined // Superadmin must specify cafes
        : activeCafeId 
          ? [activeCafeId] 
          : currentUser?.cafes?.[0]?._id 
            ? [currentUser.cafes[0]._id] 
            : undefined;
      
      return createUser({
        ...data,
        roleName: 'receptionist',
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password || undefined,
        cafes: cafes,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
        toast({
          title: 'User created successfully',
          description: `Temporary password: ${data.tempPassword}`,
        });
      } else {
        toast({
          title: 'User created successfully',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create user',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) =>
      updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User status updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingUser(null);
      toast({
        title: 'User deleted',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete user',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    return matchesSearch;
  });

  // Group users by role
  const customers = filteredUsers.filter((u) => u.role.name === 'customer');
  const managers = filteredUsers.filter((u) => u.role.name === 'manager');
  const receptionists = filteredUsers.filter((u) => u.role.name === 'receptionist');

  // Handle create
  const handleCreate = (data: ReceptionistFormData) => {
    createMutation.mutate(data);
  };


  // Handle status toggle
  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    updateStatusMutation.mutate({ userId: user._id, status: newStatus });
  };

  // Handle delete
  const handleDelete = () => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser._id);
    }
  };

  // Check permissions using backend RBAC
  const canCreateReceptionist = hasPermission(currentUser, 'users', 'create');
  const canDeleteReceptionist = hasPermission(currentUser, 'users', 'delete');
  const canUpdateStatus = hasPermission(currentUser, 'users', 'update');

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load users. Please try again.</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage customers, managers, and receptionists</p>
        </div>
        {canCreateReceptionist && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Receptionist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Receptionist</DialogTitle>
                <DialogDescription>
                  Create a new receptionist user for your cafe.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="john@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1234567890" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password (Optional)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} placeholder="Leave empty for auto-generated" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        createForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="receptionist">Receptionists</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Managers Section */}
      {managers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Managers</CardTitle>
            <CardDescription>View and manage managers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Cafe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((user) => {
                  const RoleIcon = ROLE_ICONS[user.role.name] || UsersIcon;
                  return (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-muted-foreground" />
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        {user.cafes.length > 0 ? (
                          <Badge variant="outline">{user.cafes[0].name}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'default' : 'secondary'}
                          className={
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ''
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        {canUpdateStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            disabled={updateStatusMutation.isPending}
                          >
                            {user.status === 'active' ? (
                              <PowerOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Receptionists Section */}
      <Card>
        <CardHeader>
          <CardTitle>Receptionists</CardTitle>
          <CardDescription>Manage receptionist users</CardDescription>
        </CardHeader>
        <CardContent>
          {receptionists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No receptionists found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Cafe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receptionists.map((user) => {
                  const RoleIcon = ROLE_ICONS[user.role.name] || UsersIcon;
                  return (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-muted-foreground" />
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        {user.cafes.length > 0 ? (
                          <Badge variant="outline">{user.cafes[0].name}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'default' : 'secondary'}
                          className={
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ''
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdateStatus && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              disabled={updateStatusMutation.isPending}
                            >
                              {user.status === 'active' ? (
                                <PowerOff className="h-4 w-4 text-destructive" />
                              ) : (
                                <Power className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          )}
                          {canDeleteReceptionist && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingUser(user)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>View all customer users</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No customers found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Cafes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((user) => {
                  const RoleIcon = ROLE_ICONS[user.role.name] || UsersIcon;
                  return (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-muted-foreground" />
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.cafes.map((cafe) => (
                            <Badge key={cafe._id} variant="outline">
                              {cafe.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'default' : 'secondary'}
                          className={
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ''
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
