"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/helpers";
import { useTranslations } from "next-intl";
import { StoreProductCardGridSkeleton } from "@/components/store/store-skeletons";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: { url: string }[];
  categories: { category: { name: string; slug: string } }[];
}

export default function SearchPage() {
  const t = useTranslations("searchPage");
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setProducts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timeout);
  }, [query, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
      <div className="max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-center mb-6">{t("title")}</h1>
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="ps-12 h-12 text-lg"
            autoFocus
          />
        </form>
      </div>

      {loading ? (
        <StoreProductCardGridSkeleton />
      ) : query.length >= 2 ? (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {t("results", { total, query })}
          </p>

          {products.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t("noResults")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow border">
                    <div className="aspect-square bg-muted relative">
                      {product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      {product.categories[0] && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {product.categories[0].category.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold">
                          {formatCurrency(product.price)}
                        </span>
                        {product.compareAtPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p>{t("minCharacters")}</p>
        </div>
      )}
    </div>
  );
}
