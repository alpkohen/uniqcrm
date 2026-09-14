"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResults = {
  contacts: { id: string; label: string; sub: string }[];
  companies: { id: string; label: string }[];
  deals: { id: string; label: string }[];
};

export function GlobalSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: SearchResults) => setResults(data))
        .catch(() => setResults(null));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    onNavigate?.();
    router.push(href);
  }

  const hasResults = Boolean(
    results && (results.contacts.length || results.companies.length || results.deals.length),
  );

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (!value.trim()) setResults(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Ara: kişi, firma, fırsat…"
        className="field-input h-8 w-full text-sm"
      />
      {open && query.trim() ? (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-80 w-full min-w-64 overflow-auto rounded-md border bg-card shadow-md">
          {!results ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Aranıyor…</p>
          ) : !hasResults ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sonuç yok.</p>
          ) : (
            <>
              {results.contacts.length > 0 ? (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase text-muted-foreground">
                    Kişiler
                  </p>
                  {results.contacts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(`/contacts/${item.id}`)}
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {item.label}
                      {item.sub ? <span className="ml-1.5 text-xs text-muted-foreground">{item.sub}</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {results.companies.length > 0 ? (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase text-muted-foreground">
                    Firmalar
                  </p>
                  {results.companies.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(`/companies/${item.id}`)}
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {results.deals.length > 0 ? (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase text-muted-foreground">
                    Fırsatlar
                  </p>
                  {results.deals.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(`/deals/${item.id}`)}
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
