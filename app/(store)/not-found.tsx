import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export default function StoreNotFound() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center max-w-md mx-auto">
        <div className="text-7xl font-bold text-muted-foreground/20 mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          We couldn&apos;t find what you&apos;re looking for.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/products">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Products
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
