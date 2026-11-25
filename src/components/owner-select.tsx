"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setCompanyOwner } from "@/actions/companies";

// Inline owner picker for a row in the Firmalar list; saves on change and confirms with a toast.
export function CompanyOwnerSelect({
  companyId,
  companyName,
  ownerId: initial,
  users,
}: {
  companyId: string;
  companyName: string;
  ownerId: string;
  users: { id: string; name: string }[];
}) {
  const [ownerId, setOwnerId] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={ownerId}
      disabled={pending}
      aria-label={`${companyName} sorumlusu`}
      onChange={(event) => {
        const next = event.target.value;
        const previous = ownerId;
        setOwnerId(next);
        startTransition(async () => {
          try {
            await setCompanyOwner(companyId, next);
            toast.success(`${companyName}: sorumlu ${users.find((u) => u.id === next)?.name ?? ""}`);
          } catch {
            setOwnerId(previous);
            toast.error("Sorumlu değiştirilemedi.");
          }
        });
      }}
      className="h-8 max-w-44 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-muted-foreground hover:border-input hover:bg-background focus:border-input focus:bg-background disabled:opacity-60"
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
