import { ShoppingCart, Clock, DollarSign, TrendingUp, ChefHat, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardStats, mockOrders } from '@/data/mockData';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { OrderTypeBadge } from '@/components/orders/OrderTypeBadge';
import { formatDistanceToNow } from 'date-fns';
import cafeHero from '@/assets/cafe-hero.jpg';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const recentOrders = mockOrders
    .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
    .slice(0, 4);

  const kitchenOrders = mockOrders.filter((o) => o.status === 'preparing').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl h-40">
        <img 
          src={cafeHero} 
          alt="Cafe interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/40" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6">
          <h2 className="text-2xl font-bold text-card">Good Morning!</h2>
          <p className="text-card/80 mt-1">Here's what's happening at Harvest Café today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Today's Orders"
          value={dashboardStats.todayOrders}
          subtitle="Total orders received"
          trend={{ value: 12, isPositive: true }}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={dashboardStats.pendingOrders}
          subtitle="Awaiting preparation"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={DollarSign}
          label="Today's Revenue"
          value={`$${dashboardStats.revenue.toFixed(2)}`}
          subtitle="Net sales"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. Order Value"
          value={`$${dashboardStats.averageOrderValue.toFixed(2)}`}
          subtitle="Per transaction"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/30"
          onClick={() => navigate('/kitchen')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
                <ChefHat className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Kitchen</p>
                <p className="text-2xl font-bold">{kitchenOrders} orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Tables</p>
                <p className="text-2xl font-bold">5 / 12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <Clock className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Wait Time</p>
                <p className="text-2xl font-bold">12 min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <button 
            onClick={() => navigate('/orders')}
            className="text-sm text-primary hover:underline font-medium"
          >
            View all
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div 
                key={order.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/orders')}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <OrderTypeBadge type={order.type} />
                  <StatusBadge status={order.status} />
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
