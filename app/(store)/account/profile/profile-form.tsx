"use client";

import * as React from "react";

type ProfileEditFormProps = {
  user: {
    name: string;
    email: string;
    phone?: string;
  };
};

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const [name, setName] = React.useState(user.name);
  const [email, setEmail] = React.useState(user.email);
  const [phone, setPhone] = React.useState(user.phone ?? "");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });

      if (res.ok) {
        setMessage("Profile updated successfully.");
      } else {
        setMessage("Failed to update profile. Please try again.");
      }
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {message && (
        <p className="rounded-lg border px-4 py-3 text-sm">{message}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}