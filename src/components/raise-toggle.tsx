"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { setRaiseTarget } from "@/actions/raise";
import { cn } from "cn";

export function RaiseToggle({ companyId, name, selected: initial }: { companyId: string; name: string; selected: boolean }) {
  const [selected, setSelected] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${name} RAISE hedefi`}
      title={selected ? "RAISE hedefinden çıkar" : "RAISE hedefi olarak işaretle"}
      onClick={() => {
        const next = !selected;
        setSelected(next);
        startTransition(async () => {
          try {
            await setRaiseTarget(companyId, next);
          } catch {
            setSelected(!next);
            toast.error("Kaydedilemedi, tekrar deneyin.");
          }
        });
      }}
      className={cn(
        "flex size-5 items-center justify-center rounded border transition-colors",
        selected ? "border-violet-500 bg-violet-500 text-white" : "border-input bg-background hover:border-violet-400",
        pending && "opacity-60",
      )}
    >
      {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </button>
  );
}
