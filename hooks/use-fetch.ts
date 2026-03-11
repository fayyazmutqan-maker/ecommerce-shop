"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface UseFetchOptions {
  /** Error toast message (default: "Failed to load data") */
  errorMessage?: string;
  /** Don't fetch on mount */
  manual?: boolean;
}

interface UseFetchResult<T> {
  data: T;
  loading: boolean;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

export function useFetch<T>(
  url: string,
  initialData: T,
  options?: UseFetchOptions
): UseFetchResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(!options?.manual);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error(options?.errorMessage || "Failed to load data");
      }
    } catch {
      toast.error(options?.errorMessage || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [url, options?.errorMessage]);

  useEffect(() => {
    if (!options?.manual) {
      refetch();
    }
  }, [refetch, options?.manual]);

  return { data, loading, refetch, setData };
}
