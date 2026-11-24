"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setRaiseTarget } from "@/actions/raise";

// A native checkbox, so the tick shows the moment it is clicked; a toast confirms the save.
export function RaiseToggle({ companyId, name, selected: initial }: { companyId: string; name: string; selected: boolean }) {
  const [selected, setSelected] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={selected}
      disabled={pending}
      aria-label={`${name} RAISE hedefi`}
      title={selected ? "RAISE hedefinden çıkar" : "RAISE hedefi olarak işaretle"}
      onChange={(event) => {
        const next = event.target.checked;
        setSelected(next);
        startTransition(async () => {
          try {
            await setRaiseTarget(companyId, next);
            toast.success(next ? `${name} RAISE listesine eklendi` : `${name} RAISE listesinden çıkarıldı`);
          } catch {
            setSelected(!next);
            toast.error("Kaydedilemedi, tekrar deneyin.");
          }
        });
      }}
      className="size-4 cursor-pointer accent-violet-600 disabled:cursor-wait"
    />
  );
}
