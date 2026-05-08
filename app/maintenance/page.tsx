import Link from "next/link";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border bg-muted">
          <Wrench className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            We&apos;ll be back shortly
          </h1>
          <p className="text-muted-foreground">
            The store is temporarily unavailable while we make updates. Please check back soon.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">Admin login</Link>
        </Button>
      </div>
    </main>
  );
}
