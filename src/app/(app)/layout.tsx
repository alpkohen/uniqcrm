import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { brand, features } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // Pages switched off for this brand are hidden from the menu (and refuse to render themselves).
  const hidden = features.trainingHistory() ? [] : ["/training-history"];
  return (
    <AppShell user={user} brandName={brand().name} hiddenNav={hidden}>
      {children}
    </AppShell>
  );
}
