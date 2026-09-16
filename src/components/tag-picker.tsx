"use client";

import { useEffect, useRef, useState } from "react";

type Tag = { id: string; name: string };

export function TagPicker({ tags, selectedIds: initialSelectedIds }: { tags: Tag[]; selectedIds: string[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = tags.filter((tag) => selectedIds.includes(tag.id));
  const suggestions = tags
    .filter((tag) => !selectedIds.includes(tag.id))
    .filter((tag) => tag.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div ref={boxRef} className="grid gap-1.5 text-sm">
      <span className="font-medium">Etiketler</span>
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== tag.id))}
              className="opacity-60 hover:opacity-100"
              aria-label={`${tag.name} etiketini kaldır`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Etiket yazın..."
          className="field-input"
        />
        {open && suggestions.length > 0 ? (
          <ul className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-card shadow-md">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds((prev) => [...prev, tag.id]);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
