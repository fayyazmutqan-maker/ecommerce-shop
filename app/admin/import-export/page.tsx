"use client";

import { useTranslations } from "next-intl";
import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface ImportResult {
  message: string;
  created: number;
  updated: number;
  errors: string[];
}

export default function ImportExportPage() {
  const t = useTranslations("admin.importExport");
  const [exportType, setExportType] = useState("products");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/import-export?type=${exportType}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(t("toasts.exportSuccess", { type: exportType }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toasts.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error(t("csvOnlyError"));
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();

      const res = await fetch("/api/import-export?type=products", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportResult(data);
      toast.success(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toasts.importFailed"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const exportOptions = [
    { value: "products", icon: Package, label: t("exportOptions.products.label"), description: t("exportOptions.products.description") },
    { value: "orders", icon: ShoppingCart, label: t("exportOptions.orders.label"), description: t("exportOptions.orders.description") },
    { value: "customers", icon: Users, label: t("exportOptions.customers.label"), description: t("exportOptions.customers.description") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" /> {t("exportData")}
            </CardTitle>
            <CardDescription>{t("exportDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t("whatToExport")}</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Details */}
            {exportOptions.map((opt) => (
              opt.value === exportType && (
                <div key={opt.value} className="flex items-start gap-3 p-4 bg-accent/30 rounded-lg">
                  <opt.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </div>
              )
            ))}

            <Button className="w-full" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("exporting")}</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> {t("exportCsv", { type: exportType })}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" /> {t("importData")}
            </CardTitle>
            <CardDescription>{t("importDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-accent/30 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("productImport")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("productImportDesc")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("csvFormatRequirements")}</Label>
              <div className="text-xs text-muted-foreground space-y-1.5 bg-muted/50 p-3 rounded-lg font-mono">
                <p>Name,Price,SKU,Quantity,Status,Vendor,Tags,Categories</p>
                <p>&quot;Product A&quot;,29.99,SKU001,100,ACTIVE,&quot;Brand&quot;,&quot;tag1;tag2&quot;,&quot;Category 1;Category 2&quot;</p>
                <p>&quot;Product B&quot;,49.99,SKU002,50,DRAFT,&quot;Brand&quot;,,&quot;Category 1&quot;</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("matchNote")}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />

            <Button
              className="w-full"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("importing")}</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> {t("chooseCsvFile")}</>
              )}
            </Button>

            {/* Import Result */}
            {importResult && (
              <Card className="shadow-none border">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">{t("importComplete")}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{importResult.created}</p>
                      <p className="text-xs text-muted-foreground">{t("created")}</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{importResult.updated}</p>
                      <p className="text-xs text-muted-foreground">{t("updated")}</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{importResult.errors.length}</p>
                      <p className="text-xs text-muted-foreground">{t("errors")}</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tips */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t("tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>{t("tips.tip1")}</li>
            <li>{t("tips.tip2")}</li>
            <li>{t("tips.tip3")}</li>
            <li>{t("tips.tip4")}</li>
            <li>{t("statusValues")} <Badge variant="outline" className="text-xs">DRAFT</Badge> <Badge variant="outline" className="text-xs">ACTIVE</Badge> <Badge variant="outline" className="text-xs">ARCHIVED</Badge></li>
            <li>{t("tips.tip5")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
