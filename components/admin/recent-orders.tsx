import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getInitials, getStatusColor } from "@/lib/helpers";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  user: { name: string | null; email: string; image: string | null } | null;
  items: { name: string; quantity: number }[];
}

export function RecentOrders({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No orders yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={order.user?.image || ""} />
            <AvatarFallback className="text-xs">
              {getInitials(order.user?.name || order.orderNumber)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {order.user?.name || order.orderNumber}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {order.user?.email || order.orderNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {formatCurrency(order.totalAmount)}
            </p>
            <Badge variant={getStatusColor(order.status)} className="text-[10px]">
              {order.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
