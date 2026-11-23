"use client";

import { useState } from "react";

const NEW = "__new";

// Sector picker for company forms: choose from the sectors already in use (keeps spelling consistent),
// or switch to typing a brand-new one. Submits a single "sector" field either way.
export function SectorSelect({
  name = "sector",
  sectors,
  defaultValue,
  required = true,
}: {
  name?: string;
  sectors: string[];
  defaultValue?: string | null;
  required?: boolean;
}) {
  const current = defaultValue ?? "";
  // A value that is not in the list yet (older or hand-typed) stays selectable.
  const options = current && !sectors.includes(current) ? [...sectors, current].sort((a, b) => a.localeCompare(b, "tr")) : sectors;
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState(current);

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          name={name}
          required={required}
          autoFocus
          defaultValue=""
          placeholder="Yeni sektör adı"
          className="field-input min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setValue(current);
          }}
          className="shrink-0 rounded-md border bg-card px-3 text-xs hover:bg-muted"
        >
          Listeden seç
        </button>
      </div>
    );
  }

  return (
    <select
      name={name}
      required={required}
      value={value}
      onChange={(event) => {
        if (event.target.value === NEW) setAdding(true);
        else setValue(event.target.value);
      }}
      className="field-select"
    >
      <option value="">Sektör seçin…</option>
      {options.map((sector) => (
        <option key={sector} value={sector}>
          {sector}
        </option>
      ))}
      <option value={NEW}>+ Yeni sektör ekle…</option>
    </select>
  );
}
