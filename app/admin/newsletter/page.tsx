"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Download, Mail, Users, Send, FileText, Eye, History, PenLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Newsletter email templates ──
const EMAIL_TEMPLATES = [
  {
    id: "blank",
    name: "Blank",
    subject: "",
    content: "",
  },
  {
    id: "new-arrivals",
    name: "New Arrivals",
    subject: "🆕 New Arrivals Just Dropped!",
    content: `<h2>Fresh Picks Are Here!</h2>
<p>Hi there,</p>
<p>We've just added exciting new products to our store. Be the first to explore them before they sell out!</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{store_url}}/products" class="btn">Shop New Arrivals</a>
</p>
<p>Happy shopping!<br>The ShopFlow Team</p>`,
  },
  {
    id: "sale",
    name: "Sale / Promotion",
    subject: "🔥 Don't Miss Our Big Sale!",
    content: `<h2>Huge Savings Await!</h2>
<p>Hi there,</p>
<p>For a limited time, enjoy amazing discounts across our entire store. This is your chance to grab what you've been eyeing!</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{store_url}}/collections" class="btn">Shop the Sale</a>
</p>
<p>Hurry — the sale won't last forever!</p>
<p>Best,<br>The ShopFlow Team</p>`,
  },
  {
    id: "seasonal",
    name: "Seasonal Update",
    subject: "🌟 Get Ready for the New Season!",
    content: `<h2>Season's Best Picks</h2>
<p>Hi there,</p>
<p>The new season is here and we've curated the perfect collection for you. From essentials to statement pieces, we've got you covered.</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{store_url}}/collections" class="btn">Explore the Collection</a>
</p>
<p>Warm regards,<br>The ShopFlow Team</p>`,
  },
  {
    id: "back-in-stock",
    name: "Back in Stock",
    subject: "🎉 It's Back! Your Favorites Restocked",
    content: `<h2>Back by Popular Demand!</h2>
<p>Hi there,</p>
<p>Great news! Some of your most-wanted items are back in stock. Don't miss your second chance to get them!</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{store_url}}/products" class="btn">Shop Now</a>
</p>
<p>Cheers,<br>The ShopFlow Team</p>`,
  },
  {
    id: "thank-you",
    name: "Thank You",
    subject: "💙 Thank You for Being Part of Our Community",
    content: `<h2>We Appreciate You!</h2>
<p>Hi there,</p>
<p>We just wanted to take a moment to say thank you for being a valued member of our community. Your support means the world to us.</p>
<p>As a token of our appreciation, enjoy free shipping on your next order with code <strong>THANKYOU</strong>.</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{store_url}}" class="btn">Visit Store</a>
</p>
<p>With gratitude,<br>The ShopFlow Team</p>`,
  },
];

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface SubscriberData {
  subscribers: Subscriber[];
  counts: { active: number; unsubscribed: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Campaign {
  id: string;
  subject: string;
  previewText: string | null;
  status: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  sentAt: string | null;
  sentBy: string | null;
  createdAt: string;
}

export default function NewsletterPage() {
  // ── Subscriber state ──
  const [data, setData] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subStatus, setSubStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);

  // ── Campaign state ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // ── Composer state ──
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("blank");

  // ── Preview dialog ──
  const [showPreview, setShowPreview] = useState(false);

  // ── Confirm send dialog ──
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/newsletter?status=${subStatus}&page=${page}&limit=50`);
      if (res.ok) setData(await res.json());
    } catch {
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }, [subStatus, page]);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch("/api/newsletter/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  function applyTemplate(templateId: string) {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setContent(template.content);
      setSelectedTemplate(templateId);
    }
  }

  function exportCSV() {
    if (!data?.subscribers.length) return;
    const csv = ["Email,Status,Subscribed At,Unsubscribed At"];
    data.subscribers.forEach((s) => {
      csv.push(`${s.email},${s.status},${s.subscribedAt},${s.unsubscribedAt || ""}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${subStatus.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  async function handleSend() {
    if (!subject.trim() || !content.trim()) {
      toast.error("Subject and content are required");
      return;
    }

    setSending(true);
    setShowConfirmSend(false);
    try {
      const res = await fetch("/api/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, previewText: previewText || undefined, content }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to send newsletter");
        return;
      }
      toast.success(result.message || "Newsletter sent!");
      // Reset composer
      setSubject("");
      setPreviewText("");
      setContent("");
      setSelectedTemplate("blank");
      // Refresh campaigns
      fetchCampaigns();
    } catch {
      toast.error("Failed to send newsletter");
    } finally {
      setSending(false);
    }
  }

  function getPreviewHtml() {
    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;font-size:20px;letter-spacing:1px">ShopFlow</h1>
        </div>
        <div style="padding:32px 24px;line-height:1.6">${content.replace(/\{\{store_url\}\}/g, "#")}</div>
        <div style="padding:24px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee">
          <p>ShopFlow — Kingdom of Saudi Arabia</p>
          <p>You received this because you subscribed to our newsletter.</p>
          <p><a href="#" style="color:#999">Unsubscribe</a></p>
        </div>
      </div>`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground">Compose & send newsletters to your subscribers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.counts.active ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Subscribers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.counts.unsubscribed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Unsubscribed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose"><PenLine className="h-4 w-4 mr-1" />Compose</TabsTrigger>
          <TabsTrigger value="campaigns"><History className="h-4 w-4 mr-1" />Sent Campaigns</TabsTrigger>
          <TabsTrigger value="subscribers"><Users className="h-4 w-4 mr-1" />Subscribers</TabsTrigger>
        </TabsList>

        {/* ════════════════ Compose Tab ════════════════ */}
        <TabsContent value="compose" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Compose Newsletter</CardTitle>
              <CardDescription>
                This will be sent to all <strong>{data?.counts.active ?? 0}</strong> active subscribers. An unsubscribe link is automatically included.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selector */}
              <div className="space-y-2">
                <Label>Start from Template</Label>
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject Line <span className="text-red-500">*</span></Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. 🆕 New Arrivals Just Dropped!"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">{subject.length}/200</p>
              </div>

              {/* Preview Text */}
              <div className="space-y-2">
                <Label>Preview Text <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Short text shown in inbox next to subject"
                  maxLength={200}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Email Content (HTML) <span className="text-red-500">*</span></Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your newsletter content. HTML is supported. Use {{store_url}} for your store link."
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{{store_url}}"}</code> for your store URL. HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;a&gt; are supported.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  disabled={!content.trim()}
                >
                  <Eye className="h-4 w-4 mr-2" />Preview
                </Button>
                <Button
                  onClick={() => {
                    if (!subject.trim() || !content.trim()) {
                      toast.error("Subject and content are required");
                      return;
                    }
                    setShowConfirmSend(true);
                  }}
                  disabled={sending || !subject.trim() || !content.trim() || (data?.counts.active ?? 0) === 0}
                >
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {sending ? "Sending..." : `Send to ${data?.counts.active ?? 0} Subscribers`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ Campaign History Tab ════════════════ */}
        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Sent Campaigns</CardTitle>
              <CardDescription>History of all newsletters sent</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {campaignsLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-[40%]" />
                      <Skeleton className="h-4 w-[15%]" />
                      <Skeleton className="h-4 w-[15%]" />
                      <Skeleton className="h-4 w-[20%]" />
                    </div>
                  ))}
                </div>
              ) : !campaigns.length ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Send className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No campaigns sent yet</p>
                  <p className="text-sm">Compose your first newsletter above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Sent By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium max-w-[250px] truncate">{c.subject}</TableCell>
                          <TableCell>
                            <Badge variant={
                              c.status === "SENT" ? "default" :
                              c.status === "SENDING" ? "secondary" :
                              c.status === "FAILED" ? "destructive" : "outline"
                            }>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{c.recipientCount}</TableCell>
                          <TableCell className="text-green-600">{c.successCount}</TableCell>
                          <TableCell className="text-red-600">{c.failureCount || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.sentAt ? new Date(c.sentAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.sentBy || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ Subscribers Tab ════════════════ */}
        <TabsContent value="subscribers" className="mt-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Tabs value={subStatus} onValueChange={(v) => { setSubStatus(v); setPage(1); }}>
              <TabsList>
                <TabsTrigger value="ACTIVE">Active ({data?.counts.active ?? 0})</TabsTrigger>
                <TabsTrigger value="UNSUBSCRIBED">Unsubscribed ({data?.counts.unsubscribed ?? 0})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.subscribers.length}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-[35%]" />
                      <Skeleton className="h-4 w-[15%]" />
                      <Skeleton className="h-4 w-[20%]" />
                      <Skeleton className="h-4 w-[20%]" />
                    </div>
                  ))}
                </div>
              ) : !data?.subscribers.length ? (
                <div className="text-center py-20 text-muted-foreground">No subscribers found</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscribed At</TableHead>
                          <TableHead>Unsubscribed At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.subscribers.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.email}</TableCell>
                            <TableCell>
                              <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"}>
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(sub.subscribedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {sub.unsubscribedAt ? new Date(sub.unsubscribedAt).toLocaleDateString() : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Preview Dialog ── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              <strong>Subject:</strong> {subject || "(no subject)"}
              {previewText && <><br /><strong>Preview:</strong> {previewText}</>}
            </DialogDescription>
          </DialogHeader>
          <div
            className="border rounded-lg overflow-hidden bg-[#f5f5f5] p-4"
            dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Send Dialog ── */}
      <Dialog open={showConfirmSend} onOpenChange={setShowConfirmSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Newsletter?</DialogTitle>
            <DialogDescription>
              This will send the newsletter to <strong>{data?.counts.active ?? 0}</strong> active subscribers. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <p><strong>Subject:</strong> {subject}</p>
            {previewText && <p><strong>Preview text:</strong> {previewText}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSend(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Sending..." : "Confirm & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
