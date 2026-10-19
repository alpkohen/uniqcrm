"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { FormResult } from "@/lib/form-result";
import { Button } from "@/components/ui/button";

// Form for a server action that edits a record: shows a toast for success or for the error it returns.
export function ToastForm({
  action,
  successMessage = "Kaydedildi.",
  className,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult | void>;
  successMessage?: string;
  className?: string;
  children: ReactNode;
}) {
  const [, formAction] = useActionState(async (_prev: null, formData: FormData) => {
    try {
      const result = await action(formData);
      if (result && result.error) toast.error(result.error);
      else toast.success(successMessage);
    } catch {
      toast.error("Kaydedilemedi. Lütfen tekrar deneyin.");
    }
    return null;
  }, null);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

export function SubmitButton({ children, pendingText = "Kaydediliyor…" }: { children: ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}
