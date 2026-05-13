"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Star, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AccountSidebarClient } from "@/components/store/account-sidebar-client";

interface Address {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

const emptyForm = {
  label: "",
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
  isDefault: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/addresses");
      if (!res.ok) {
        if (res.status === 401) { router.push("/login"); return; }
        throw new Error();
      }
      setAddresses(await res.json());
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAddresses(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() {
    setEditingAddress(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(address: Address) {
    setEditingAddress(address);
    setForm({
      label: address.label || "",
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company || "",
      address1: address.address1,
      address2: address.address2 || "",
      city: address.city,
      state: address.state || "",
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || "",
      isDefault: address.isDefault,
    });
    setDialogOpen(true);
  }

  function openDelete(address: Address) {
    setDeletingAddress(address);
    setDeleteDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...(editingAddress ? { id: editingAddress.id } : {}),
        label: form.label || null,
        firstName: form.firstName,
        lastName: form.lastName,
        company: form.company || null,
        address1: form.address1,
        address2: form.address2 || null,
        city: form.city,
        state: form.state || null,
        postalCode: form.postalCode,
        country: form.country,
        phone: form.phone || null,
        isDefault: form.isDefault,
      };

      const res = await fetch("/api/addresses", {
        method: editingAddress ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save address");
        return;
      }

      toast.success(editingAddress ? "Address updated" : "Address added");
      setDialogOpen(false);
      fetchAddresses();
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingAddress) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/addresses?id=${deletingAddress.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete address");
        return;
      }
      toast.success("Address deleted");
      setDeleteDialogOpen(false);
      setDeletingAddress(null);
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(address: Address) {
    try {
      const res = await fetch("/api/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: address.id, isDefault: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Default address updated");
      fetchAddresses();
    } catch {
      toast.error("Failed to update default address");
    }
  }

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Addresses" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <AccountSidebarClient active="addresses" />

        <div className="lg:col-span-3 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10">
            <Link href="/account">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
              Account
            </p>
            <h1 className="text-3xl font-bold">My Addresses</h1>
          </div>
        </div>
        <Button onClick={openAdd} className="h-10">
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-5 font-medium">
              No saved addresses yet
            </p>
            <Button onClick={openAdd} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add your first address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {addresses.map((address) => (
            <Card key={address.id} className="shadow-none border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {address.label || `${address.firstName} ${address.lastName}`}
                  </span>
                  {address.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>{address.firstName} {address.lastName}</p>
                  {address.company && <p>{address.company}</p>}
                  <p>{address.address1}</p>
                  {address.address2 && <p>{address.address2}</p>}
                  <p>{address.city}{address.state ? `, ${address.state}` : ""}</p>
                  <p>{address.postalCode}, {address.country}</p>
                  {address.phone && <p>{address.phone}</p>}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(address)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDelete(address)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                  {!address.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault(address)}>
                      <Star className="h-3.5 w-3.5 mr-1.5" />
                      Set Default
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription>
              {editingAddress ? "Update your address details below." : "Enter the details for your new address."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" placeholder="e.g. Home, Work" value={form.label} onChange={(e) => updateField("label", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" required value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" required value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company (optional)</Label>
              <Input id="company" value={form.company} onChange={(e) => updateField("company", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1 *</Label>
              <Input id="address1" required value={form.address1} onChange={(e) => updateField("address1", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address2">Address Line 2 (optional)</Label>
              <Input id="address2" value={form.address2} onChange={(e) => updateField("address2", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" required value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input id="state" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input id="postalCode" required value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input id="country" required value={form.country} onChange={(e) => updateField("country", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isDefault" checked={form.isDefault} onCheckedChange={(checked) => updateField("isDefault", !!checked)} />
              <Label htmlFor="isDefault" className="text-sm font-normal">Set as default address</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAddress ? "Save Changes" : "Add Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the address &quot;{deletingAddress?.label || `${deletingAddress?.firstName} ${deletingAddress?.lastName}`}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
