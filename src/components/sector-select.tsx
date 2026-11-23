"use client";

import { useState } from "react";

// Sector picker for company forms: only the sectors already in use can be chosen (keeps spelling consistent).
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
  // A value that is not in the list (older or hand-typed) stays selectable so saving other fields does not wipe it.
  const options = current && !sectors.includes(current) ? [...sectors, current].sort((a, b) => a.localeCompare(b, "tr")) : sectors;
  const [value, setValue] = useState(current);

  return (
    <select name={name} required={required} value={value} onChange={(event) => setValue(event.target.value)} className="field-select">
      <option value="">Sektör seçin…</option>
      {options.map((sector) => (
        <option key={sector} value={sector}>
          {sector}
        </option>
      ))}
    </select>
  );
}
