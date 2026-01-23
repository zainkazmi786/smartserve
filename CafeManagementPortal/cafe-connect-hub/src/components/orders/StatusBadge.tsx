import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/data/mockData';
import { cn } from '@/lib/utils';

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-secondary text-secondary-foreground hover:bg-secondary border-border',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20',
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, 'font-medium', className)}
    >
      {config.label}
    </Badge>
  );
}
