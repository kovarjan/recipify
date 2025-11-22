// contexts/SearchContext.tsx
import { listRecipes } from "@/lib/db";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SearchItem = {
  id: string;
  title: string;
  tags?: string | null;
  updated_at?: number;
  image_uri?: string | null;
};

type SearchContextValue = {
  query: string;
  setQuery: (q: string) => void;
  results: SearchItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children, initialQuery = "" }: { children: React.ReactNode; initialQuery?: string }) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const runSearch = async (q: string) => {
        setLoading(true);
        setError(null);
        try {
            const rows = (await listRecipes(q)) as SearchItem[];
            setResults(rows);
        } catch (e: any) {
            setError(String(e?.message ?? e));
        } finally {
            setLoading(false);
        }
    };

    // debounce on query changes
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            void runSearch(query.trim());
        }, 250);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    const refresh = async () => {
        await runSearch(query.trim());
    };

    const clear = () => {
        setQuery("");
        setResults([]);
        setError(null);
    };

    const value = useMemo(
        () => ({ query, setQuery, results, loading, error, refresh, clear }),
        [query, results, loading, error]
    );

    console.log("SearchContext value:", value);
    console.log("SearchContext results:", results);

    return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
    const ctx = useContext(SearchContext);
    if (!ctx) throw new Error("useSearch must be used within <SearchProvider />");
    return ctx;
}
