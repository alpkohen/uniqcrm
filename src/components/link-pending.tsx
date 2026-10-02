"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

// Always rendered (opacity only) so toggling it never shifts the layout.
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <Loader2
      aria-hidden
      className={cn(
        "size-3 shrink-0 animate-spin text-muted-foreground transition-opacity",
        pending ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
