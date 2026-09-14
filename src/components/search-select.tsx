"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: string; label: string };

export function SearchSelect({
  name,
  searchUrl,
  placeholder,
  defaultValue,
}: {
  name: string;
  searchUrl: string;
  placeholder?: string;
  defaultValue?: Option | null;
}) {
  const [query, setQuery] = useState(defaultValue?.label ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue?.id ?? "");
  const [results, setResults] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      fetch(`${searchUrl}?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: Option[]) => setResults(data))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, searchUrl]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        className="field-input"
        placeholder={placeholder}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 ? (
        <ul className="absolute top-full left-0 z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card shadow-md">
          {results.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setSelectedId(option.id);
                  setQuery(option.label);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
