"use client";

import Image from "next/image";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/lib/store";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function CartSheet() {
  const { items, removeItem, updateQuantity, getTotal, getItemCount } =
    useCartStore();
  const t = useTranslations("common");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 text-muted-foreground hover:text-foreground"
        >
          <ShoppingCart className="h-[18px] w-[18px]" />
          {getItemCount() > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {getItemCount()}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-lg font-bold">
            {t("cart")} ({getItemCount()})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center space-y-4">
              <ShoppingCart className="h-14 w-14 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground font-medium">
                {t("emptyCart")}
              </p>
              <Button asChild variant="outline" className="h-11 px-6">
                <Link href="/products">{t("browseProducts")}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-0 divide-y">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 px-6 py-5">
                    <div className="h-20 w-20 rounded-lg bg-accent/50 overflow-hidden flex-shrink-0 relative">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.name}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm font-bold mt-1.5">
                        {t("sar")} {item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-sm font-semibold w-6 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 ms-auto text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t px-6 py-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="font-bold text-base">{t("sar")} {getTotal().toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("shippingTaxAtCheckout")}
              </p>
              <Button asChild className="w-full h-12 font-semibold text-[15px]">
                <Link href="/checkout">{t("proceedToCheckout")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-11">
                <Link href="/cart">{t("viewCart")}</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
