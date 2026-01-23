import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getCafeDetails, updateCafe, Cafe } from '@/services/cafeService';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Cafe settings form validation schema
 */
const cafeSettingsSchema = z.object({
  name: z.string().min(1, 'Cafe name is required'),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  taxPercentage: z
    .number()
    .min(0, 'Tax percentage cannot be negative')
    .max(100, 'Tax percentage cannot exceed 100'),
});

type CafeSettingsFormData = z.infer<typeof cafeSettingsSchema>;

export default function CafeSettings() {
  const { user, activeCafeId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get cafe ID from activeCafeId or user's first cafe
  const cafeId = activeCafeId || user?.cafes?.[0]?._id;

  // Fetch cafe details
  const {
    data: cafe,
    isLoading,
    error: fetchError,
  } = useQuery<Cafe>({
    queryKey: ['cafe', cafeId],
    queryFn: () => getCafeDetails(cafeId!),
    enabled: !!cafeId,
  });

  // Update cafe mutation
  const updateMutation = useMutation({
    mutationFn: (data: CafeSettingsFormData) => updateCafe(cafeId!, data),
    onSuccess: (updatedCafe) => {
      // Update cache
      queryClient.setQueryData(['cafe', cafeId], updatedCafe);
      
      // Update user's cafes array if needed
      if (user?.cafes) {
        const updatedCafes = user.cafes.map((c) =>
          c._id === cafeId ? updatedCafe : c
        );
        queryClient.setQueryData(['user'], {
          ...user,
          cafes: updatedCafes,
        });
      }

      toast({
        title: 'Success',
        description: 'Cafe settings updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update cafe settings',
        variant: 'destructive',
      });
    },
  });

  // Initialize form with cafe data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<CafeSettingsFormData>({
    resolver: zodResolver(cafeSettingsSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      taxPercentage: 0,
    },
  });

  // Reset form when cafe data loads
  useEffect(() => {
    if (cafe) {
      reset({
        name: cafe.name || '',
        email: cafe.email || '',
        phone: cafe.phone || '',
        taxPercentage: cafe.settings?.taxPercentage || 0,
      });
    }
  }, [cafe, reset]);

  const onSubmit = async (data: CafeSettingsFormData) => {
    // Prepare update payload (only send non-empty strings)
    const updateData: Parameters<typeof updateCafe>[1] = {
      name: data.name,
      taxPercentage: data.taxPercentage,
    };

    if (data.email && data.email.trim()) {
      updateData.email = data.email.trim();
    } else {
      updateData.email = undefined;
    }

    if (data.phone && data.phone.trim()) {
      updateData.phone = data.phone.trim();
    } else {
      updateData.phone = undefined;
    }

    updateMutation.mutate(updateData as CafeSettingsFormData);
  };

  if (!cafeId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert>
          <AlertDescription>
            No cafe assigned. Please contact administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive">
          <AlertDescription>
            {fetchError instanceof Error
              ? fetchError.message
              : 'Failed to load cafe settings'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const canUpdateSettings = hasPermission(user, 'settings', 'update');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Cafe Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cafe Information</CardTitle>
          <CardDescription>
            Manage your cafe details and settings. Only managers can update
            these settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Cafe Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Cafe Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                disabled={!canUpdateSettings || updateMutation.isPending}
                placeholder="Enter cafe name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={!canUpdateSettings || updateMutation.isPending}
                placeholder="cafe@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                disabled={!canUpdateSettings || updateMutation.isPending}
                placeholder="+1234567890"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Tax Percentage */}
            <div className="space-y-2">
              <Label htmlFor="taxPercentage">
                Tax Percentage <span className="text-destructive">*</span>
              </Label>
              <Input
                id="taxPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxPercentage', { valueAsNumber: true })}
                disabled={!canUpdateSettings || updateMutation.isPending}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground">
                Tax percentage applied to all orders (0-100)
              </p>
              {errors.taxPercentage && (
                <p className="text-sm text-destructive">
                  {errors.taxPercentage.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            {canUpdateSettings && (
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}

            {!canUpdateSettings && (
              <Alert>
                <AlertDescription>
                  Only managers can update cafe settings.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Read-only Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Cafe ID</Label>
              <p className="mt-1 font-mono text-xs">{cafe?._id}</p>
            </div>
            {cafe?.linkedManager && (
              <div>
                <Label className="text-muted-foreground">Manager</Label>
                <p className="mt-1">{cafe.linkedManager.name}</p>
              </div>
            )}
            {cafe?.createdAt && (
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="mt-1">
                  {new Date(cafe.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {cafe?.updatedAt && (
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <p className="mt-1">
                  {new Date(cafe.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
