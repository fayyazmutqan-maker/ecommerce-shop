"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  Star,
  Heart,
  Edit2,
  Save,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/helpers";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
  }[];
  addresses: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    address1: string;
    address2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    status: string;
    createdAt: string;
    product: { id: string; name: string; slug: string };
  }[];
  wishlist: {
    id: string;
    product: { id: string; name: string; slug: string };
  }[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalReviews: number;
    wishlistItems: number;
  };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  async function fetchCustomer() {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomer(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setRole(data.role);
    } catch {
      toast.error("Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          phone: phone || null,
          role,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Customer updated");
      setEditing(false);
      await fetchCustomer();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-32 mt-1" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="pt-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>))}</CardContent></Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="pt-6 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Customer not found</p>
        <Button asChild variant="outline">
          <Link href="/admin/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name || "Unnamed Customer"}</h1>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
          <Badge variant={customer.role === "ADMIN" ? "default" : "secondary"}>{customer.role}</Badge>
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{customer.stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(customer.stats.totalSpent)}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{customer.stats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{customer.stats.wishlistItems}</p>
                <p className="text-xs text-muted-foreground">Wishlist</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Orders ({customer.orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline font-medium">
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          {customer.reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Reviews ({customer.reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customer.reviews.map((review) => (
                    <div key={review.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          href={`/products/${review.product.slug}`}
                          className="text-sm font-medium hover:underline"
                          target="_blank"
                        >
                          {review.product.name}
                        </Link>
                        <Badge variant={review.status === "APPROVED" ? "default" : "outline"}>
                          {review.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTime(review.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Joined: {formatDateTime(customer.createdAt)}</p>
                    <p>Last updated: {formatDateTime(customer.updatedAt)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Addresses ({customer.addresses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No addresses</p>
              ) : (
                <div className="space-y-3">
                  {customer.addresses.map((addr) => (
                    <div key={addr.id} className="text-sm border rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{addr.firstName} {addr.lastName}</p>
                        {addr.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                      <p className="text-muted-foreground">{addr.address1}</p>
                      {addr.address2 && <p className="text-muted-foreground">{addr.address2}</p>}
                      <p className="text-muted-foreground">
                        {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postalCode}
                      </p>
                      <p className="text-muted-foreground">{addr.country}</p>
                      {addr.phone && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" /> {addr.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wishlist */}
          {customer.wishlist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Wishlist ({customer.wishlist.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customer.wishlist.map((item) => (
                    <Link
                      key={item.id}
                      href={`/products/${item.product.slug}`}
                      className="block text-sm hover:underline"
                      target="_blank"
                    >
                      {item.product.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
