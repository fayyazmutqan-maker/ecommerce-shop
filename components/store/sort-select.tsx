"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface SortSelectProps {
  defaultValue: string;
}

export function SortSelect({ defaultValue }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("sort");

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "newest") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select defaultValue={defaultValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] max-w-full h-10">
        <SelectValue placeholder={t("sortBy")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{t("newest")}</SelectItem>
        <SelectItem value="price-asc">{t("priceLowHigh")}</SelectItem>
        <SelectItem value="price-desc">{t("priceHighLow")}</SelectItem>
        <SelectItem value="name">{t("nameAZ")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
