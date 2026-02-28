"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  ExternalLink,
  Plus,
  X,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  taxable: boolean;
  taxRate: number;
  trackInventory: boolean;
  quantity: number;
  lowStockThreshold: number;
  continueSellingWhenOOS: boolean;
  weight: number | null;
  weightUnit: string;
  status: string;
  productType: string | null;
  vendor: string | null;
  tags: string | null;
  isFeatured: boolean;
  isDigital: boolean;
  requiresShipping: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  customBadge: string | null;
  warrantyInfo: string | null;
  estimatedDelivery: string | null;
  minOrderQty: number;
  maxOrderQty: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string | null;
  countryOfOrigin: string | null;
  hsCode: string | null;
  salePriceFrom: string | null;
  salePriceTo: string | null;
  scheduledAt: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: { categoryId: string; category: { id: string; name: string } }[];
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  isPrimary: boolean;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  quantity: number;
  weight: number | null;
  image: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  isActive: boolean;
}

interface EditableVariant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  quantity: string;
  weight: string;
  isActive: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  children?: CategoryItem[];
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Product data
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [productType, setProductType] = useState("");
  const [vendor, setVendor] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [weight, setWeight] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [customBadge, setCustomBadge] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [minOrderQty, setMinOrderQty] = useState("1");
  const [maxOrderQty, setMaxOrderQty] = useState("");

  const [isFeatured, setIsFeatured] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [taxable, setTaxable] = useState(true);
  const [trackInventory, setTrackInventory] = useState(true);
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [continueSellingWhenOOS, setContinueSellingWhenOOS] = useState(false);

  // Dimensions & customs
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [hsCode, setHsCode] = useState("");

  // Scheduled sale
  const [scheduleSale, setScheduleSale] = useState(false);
  const [salePriceFrom, setSalePriceFrom] = useState("");
  const [salePriceTo, setSalePriceTo] = useState("");

  // Tags as array (chips)
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [editableVariants, setEditableVariants] = useState<EditableVariant[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);

  // Profit calculator
  const profitInfo = useMemo(() => {
    const p = parseFloat(price) || 0;
    const c = parseFloat(costPrice) || 0;
    if (p === 0) return null;
    const profit = p - c;
    const margin = c > 0 ? ((profit / p) * 100).toFixed(1) : "—";
    return { profit: profit.toFixed(2), margin };
  }, [price, costPrice]);

  // Discount percentage
  const discountPct = useMemo(() => {
    const p = parseFloat(price) || 0;
    const cp = parseFloat(compareAtPrice) || 0;
    if (cp > 0 && cp > p) return Math.round(((cp - p) / cp) * 100);
    return 0;
  }, [price, compareAtPrice]);

  // Tag helpers
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tagList.includes(trimmed)) {
      setTagList((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };
  const removeTag = (tag: string) =>
    setTagList((prev) => prev.filter((t) => t !== tag));

  // Variant helper
  const updateVariant = (id: string, field: keyof EditableVariant, value: string | boolean) =>
    setEditableVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );

  useEffect(() => {
    Promise.all([fetchProduct(), fetchCategories()]);
  }, [productId]);

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      const product: Product = await res.json();
      setOriginalProduct(product);

      setName(product.name);
      setDescription(product.description || "");
      setShortDescription(product.shortDescription || "");
      setSku(product.sku || "");
      setBarcode(product.barcode || "");
      setPrice(product.price.toString());
      setCompareAtPrice(product.compareAtPrice?.toString() || "");
      setCostPrice(product.costPrice?.toString() || "");
      setStatus(product.status);
      setProductType(product.productType || "");
      setVendor(product.vendor || "");
      setQuantity(product.quantity.toString());
      setLowStockThreshold(product.lowStockThreshold.toString());
      setWeight(product.weight?.toString() || "");
      setSeoTitle(product.seoTitle || "");
      setSeoDescription(product.seoDescription || "");
      setCustomBadge(product.customBadge || "");
      setWarrantyInfo(product.warrantyInfo || "");
      setEstimatedDelivery(product.estimatedDelivery || "");
      setMinOrderQty(product.minOrderQty.toString());
      setMaxOrderQty(product.maxOrderQty?.toString() || "");

      setIsFeatured(product.isFeatured);
      setIsDigital(product.isDigital);
      setTaxable(product.taxable);
      setTrackInventory(product.trackInventory);
      setRequiresShipping(product.requiresShipping);
      setContinueSellingWhenOOS(product.continueSellingWhenOOS);

      setImages(product.images.sort((a, b) => a.position - b.position).map((img) => img.url));
      setEditableVariants(
        product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku || "",
          barcode: v.barcode || "",
          price: v.price.toString(),
          compareAtPrice: v.compareAtPrice?.toString() || "",
          costPrice: v.costPrice?.toString() || "",
          quantity: v.quantity.toString(),
          weight: v.weight?.toString() || "",
          isActive: v.isActive,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
        }))
      );
      setSelectedCategories(product.categories.map((c) => c.categoryId));

      // Dimensions & customs
      setLength(product.length?.toString() || "");
      setWidth(product.width?.toString() || "");
      setHeight(product.height?.toString() || "");
      setCountryOfOrigin(product.countryOfOrigin || "");
      setHsCode(product.hsCode || "");

      // Scheduled sale
      if (product.salePriceFrom || product.salePriceTo) {
        setScheduleSale(true);
        setSalePriceFrom(product.salePriceFrom ? product.salePriceFrom.slice(0, 16) : "");
        setSalePriceTo(product.salePriceTo ? product.salePriceTo.slice(0, 16) : "");
      }

      // Tags
      setTagList(product.tags ? product.tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setAllCategories(data);
    } catch {
      // Silent fail
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      toast.error("Valid price is required");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description || null,
        shortDescription: shortDescription || null,
        sku: sku || null,
        barcode: barcode || null,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        status,
        productType: productType || null,
        vendor: vendor || null,
        tags: tagList.length > 0 ? tagList.join(", ") : null,
        quantity: parseInt(quantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        weight: weight ? parseFloat(weight) : null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        customBadge: customBadge || null,
        warrantyInfo: warrantyInfo || null,
        estimatedDelivery: estimatedDelivery || null,
        minOrderQty: parseInt(minOrderQty) || 1,
        maxOrderQty: maxOrderQty ? parseInt(maxOrderQty) : null,
        isFeatured,
        isDigital,
        taxable,
        trackInventory,
        requiresShipping,
        continueSellingWhenOOS,
        images: images.map((url, i) => ({
          url,
          position: i,
          isPrimary: i === 0,
        })),
        categoryIds: selectedCategories,
        // Dimensions
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        dimensionUnit: "cm",
        // Customs
        countryOfOrigin: countryOfOrigin || null,
        hsCode: hsCode || null,
        // Scheduled sale
        salePriceFrom: scheduleSale && salePriceFrom ? new Date(salePriceFrom).toISOString() : null,
        salePriceTo: scheduleSale && salePriceTo ? new Date(salePriceTo).toISOString() : null,
      };

      // Include variants
      if (editableVariants.length > 0) {
        body.variants = editableVariants.map((v) => ({
          name: v.name,
          sku: v.sku || undefined,
          barcode: v.barcode || undefined,
          price: parseFloat(v.price) || parseFloat(price),
          compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
          costPrice: v.costPrice ? parseFloat(v.costPrice) : null,
          quantity: parseInt(v.quantity) || 0,
          weight: v.weight ? parseFloat(v.weight) : null,
          option1: v.option1 || undefined,
          option2: v.option2 || undefined,
          option3: v.option3 || undefined,
        }));
      }

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save product");
      }

      toast.success("Product saved successfully");
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }

      const data = await res.json();
      toast.success(data.message || "Product deleted");
      router.push("/admin/products");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete product"
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!originalProduct) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Product not found</p>
        <Button asChild variant="outline">
          <Link href="/admin/products">Back to Products</Link>
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
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Product</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{originalProduct.name}</span>
              <Link
                href={`/products/${originalProduct.slug}`}
                target="_blank"
                className="hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Brief product description for listings"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Full Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed product description"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                First image will be the primary image
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={images}
                onChange={setImages}
                maxImages={10}
              />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price (SAR) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Compare at Price
                    {discountPct > 0 && (
                      <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                        -{discountPct}%
                      </Badge>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
              {profitInfo && (
                <div className="flex items-center gap-6 p-3 bg-accent/50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Profit:</span>
                    <span className={`font-bold ${parseFloat(profitInfo.profit) >= 0 ? "text-green-600" : "text-destructive"}`}>
                      SAR {profitInfo.profit}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin:</span>{" "}
                    <span className="font-bold">{profitInfo.margin}{profitInfo.margin !== "—" && "%"}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={scheduleSale} onCheckedChange={setScheduleSale} />
                <Label>Schedule sale pricing</Label>
              </div>
              {scheduleSale && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sale Starts</Label>
                    <Input
                      type="datetime-local"
                      value={salePriceFrom}
                      onChange={(e) => setSalePriceFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sale Ends</Label>
                    <Input
                      type="datetime-local"
                      value={salePriceTo}
                      onChange={(e) => setSalePriceTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Stock keeping unit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="ISBN, UPC, GTIN, etc."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Track Inventory</Label>
                <Switch
                  checked={trackInventory}
                  onCheckedChange={setTrackInventory}
                />
              </div>

              {trackInventory && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Threshold</Label>
                    <Input
                      type="number"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Continue selling when out of stock</Label>
                <Switch
                  checked={continueSellingWhenOOS}
                  onCheckedChange={setContinueSellingWhenOOS}
                />
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          {editableVariants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Variants ({editableVariants.length})
                </CardTitle>
                <CardDescription>Edit variant details inline. Uncheck to deactivate a variant.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price (SAR)</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Barcode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableVariants.map((v) => (
                      <TableRow key={v.id} className={!v.isActive ? "opacity-40" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={v.isActive}
                            onCheckedChange={(checked) =>
                              updateVariant(v.id, "isActive", !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {v.name}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={v.sku}
                            onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                            placeholder="Auto"
                            className="h-8 w-28 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.price}
                            onChange={(e) => updateVariant(v.id, "price", e.target.value)}
                            placeholder={price || "0.00"}
                            className="h-8 w-24 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={v.quantity}
                            onChange={(e) => updateVariant(v.id, "quantity", e.target.value)}
                            className="h-8 w-20 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={v.barcode}
                            onChange={(e) => updateVariant(v.id, "barcode", e.target.value)}
                            placeholder="Optional"
                            className="h-8 w-28 text-xs"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Requires Shipping</Label>
                <Switch
                  checked={requiresShipping}
                  onCheckedChange={setRequiresShipping}
                />
              </div>
              {requiresShipping && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Length (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Width (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country of Origin</Label>
                      <Input
                        value={countryOfOrigin}
                        onChange={(e) => setCountryOfOrigin(e.target.value)}
                        placeholder="e.g. Saudi Arabia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HS Code (Customs Tariff)</Label>
                      <Input
                        value={hsCode}
                        onChange={(e) => setHsCode(e.target.value)}
                        placeholder="e.g. 6109.10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for international shipping / Saudi Customs
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Delivery</Label>
                    <Input
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      placeholder="e.g. 3-5 business days"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>SEO Title</Label>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Page title for search engines"
                />
                <p className="text-xs text-muted-foreground">
                  {seoTitle.length}/60 characters recommended
                </p>
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Page description for search engines"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {seoDescription.length}/160 characters recommended
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Input
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="e.g. T-Shirt, Shoes"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Vendor or brand"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag} className="h-10 px-3">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tagList.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1 pl-2.5 pr-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Custom Badge</Label>
                <Select
                  value={customBadge}
                  onValueChange={setCustomBadge}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No badge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {[
                      "New",
                      "Sale",
                      "Hot",
                      "Bestseller",
                      "Limited Edition",
                      "Trending",
                    ].map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {allCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories yet.{" "}
                  <Link href="/admin/categories" className="underline">
                    Create one
                  </Link>
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedCategories.includes(cat.id)}
                          onCheckedChange={() =>
                            toggleCategory(cat.id)
                          }
                        />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      {cat.children?.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-2 ml-6 mt-1"
                        >
                          <Checkbox
                            checked={selectedCategories.includes(child.id)}
                            onCheckedChange={() =>
                              toggleCategory(child.id)
                            }
                          />
                          <span className="text-sm">{child.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Product Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Digital Product</Label>
                <Switch
                  checked={isDigital}
                  onCheckedChange={setIsDigital}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Taxable</Label>
                <Switch checked={taxable} onCheckedChange={setTaxable} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Order Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Order Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxOrderQty}
                    onChange={(e) => setMaxOrderQty(e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Warranty Info</Label>
                <Input
                  value={warrantyInfo}
                  onChange={(e) => setWarrantyInfo(e.target.value)}
                  placeholder="e.g. 1 year warranty"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{originalProduct.name}&quot;?
            This action cannot be undone. If this product has orders, it will be
            archived instead.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
