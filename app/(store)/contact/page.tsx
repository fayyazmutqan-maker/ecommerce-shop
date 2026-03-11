"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send message");
        return;
      }
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: "Contact Us" }]} />

      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground max-w-2xl">
          Have a question or need help? Fill out the form below and our team will get back to you within 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="your@email.com" type="email" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+966..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="How can we help?" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Tell us more about your inquiry..." rows={5} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-sm text-muted-foreground">support@shopflow.sa</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Phone</p>
                  <p className="text-sm text-muted-foreground">+966 11 XXX XXXX</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Address</p>
                  <p className="text-sm text-muted-foreground">Riyadh, Saudi Arabia</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Business Hours</p>
                  <p className="text-sm text-muted-foreground">Sun - Thu: 9am - 6pm</p>
                  <p className="text-sm text-muted-foreground">Fri - Sat: Closed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
