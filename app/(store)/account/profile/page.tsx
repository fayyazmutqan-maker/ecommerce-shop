import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Package, Heart, MapPin, User, Settings } from "lucide-react";
import { ProfileEditForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span className="text-muted-foreground/40">/</span>
        <Link href="/account" className="hover:text-foreground transition-colors">My Account</Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Profile</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <aside className="space-y-5">
          <nav className="space-y-1">
            {[
              { href: "/account", icon: User, label: "Dashboard" },
              { href: "/account/orders", icon: Package, label: "Orders" },
              { href: "/account/wishlist", icon: Heart, label: "Wishlist" },
              { href: "/account/addresses", icon: MapPin, label: "Addresses" },
              { href: "/account/profile", icon: Settings, label: "Profile", active: true },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  item.active ? "bg-accent font-semibold" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}>
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-3 space-y-8">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">Settings</p>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
          </div>

          <ProfileEditForm
            user={{
              name: session.user.name || "",
              email: session.user.email || "",
              phone: (session.user as any).phone || "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
