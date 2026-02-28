import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/schema";
import { eq, desc, asc } from "drizzle-orm";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const addressList = await db.query.addresses.findMany({
    where: eq(addresses.userId, session.user.id),
    orderBy: [desc(addresses.isDefault), asc(addresses.id)],
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <Link href="/account" className="hover:text-foreground transition-colors">
          Account
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Addresses</span>
      </nav>

      <div className="flex items-center justify-between mb-10">
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
      </div>

      {addressList.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-5 font-medium">
              No saved addresses yet
            </p>
            <p className="text-sm text-muted-foreground">
              Addresses will be saved during checkout
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {addressList.map((address) => (
            <Card key={address.id} className="shadow-none border">
              <CardContent className="p-5 space-y-2">
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
                  <p>
                    {address.firstName} {address.lastName}
                  </p>
                  {address.company && <p>{address.company}</p>}
                  <p>{address.address1}</p>
                  {address.address2 && <p>{address.address2}</p>}
                  <p>
                    {address.city}
                    {address.state ? `, ${address.state}` : ""}
                  </p>
                  <p>
                    {address.postalCode}, {address.country}
                  </p>
                  {address.phone && <p>{address.phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
