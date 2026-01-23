import { Badge } from '@/components/ui/badge';
import { OrderType } from '@/data/mockData';
import { Utensils, ShoppingBag, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig: Record<OrderType, { label: string; icon: React.ElementType; className: string }> = {
  'dine-in': {
    label: 'Dine In',
    icon: Utensils,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  takeaway: {
    label: 'Takeaway',
    icon: ShoppingBag,
    className: 'bg-accent text-accent-foreground border-accent-foreground/20',
  },
  delivery: {
    label: 'Delivery',
    icon: Truck,
    className: 'bg-secondary/50 text-secondary-foreground border-secondary',
  },
};

interface OrderTypeBadgeProps {
  type: OrderType;
  className?: string;
}

export function OrderTypeBadge({ type, className }: OrderTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, 'font-medium gap-1', className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
