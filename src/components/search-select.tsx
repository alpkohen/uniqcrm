"use client";

import { useEffect, useRef, useState } from "react";

export type SearchOption = { id: string; label: string };
type Option = SearchOption;

// Lets the dropdown offer "create new" when nothing typed matches. `onSelect` receives the typed text and an
// `apply` callback to call with the created option, which then becomes the selection.
export type CreateOption = {
  label: (query: string) => string;
  onSelect: (query: string, apply: (option: Option) => void) => void;
};

function sameText(a: string, b: string) {
  return a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");
}

export function SearchSelect({
  name,
  searchUrl,
  placeholder,
  defaultValue,
  createOption,
}: {
  name: string;
  searchUrl: string;
  placeholder?: string;
  defaultValue?: Option | null;
  createOption?: CreateOption;
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

  const typed = query.trim();
  const canCreate =
    Boolean(createOption) && typed.length >= 2 && !selectedId && !results.some((option) => sameText(option.label, typed));

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
      {open && (results.length > 0 || canCreate) ? (
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
          {canCreate && createOption ? (
            <li className="border-t">
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm font-medium text-primary hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  createOption.onSelect(typed, (created) => {
                    setSelectedId(created.id);
                    setQuery(created.label);
                  });
                }}
              >
                + {createOption.label(typed)}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
