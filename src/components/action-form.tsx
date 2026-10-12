"use client";

import { useActionState, type ReactNode } from "react";
import type { UserActionResult } from "@/actions/users";

// Form whose server action returns { ok, error } instead of throwing, so a failure is shown in place.
export function ActionForm({
  action,
  className,
  children,
  successText = "Kaydedildi.",
}: {
  action: (prev: UserActionResult, formData: FormData) => Promise<UserActionResult>;
  className?: string;
  children: ReactNode;
  successText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as UserActionResult);

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {children}
      {state.error ? (
        <p role="alert" className="basis-full text-xs font-medium text-destructive sm:col-span-2 lg:col-span-4">
          {state.error}
        </p>
      ) : state.ok ? (
        <p role="status" className="basis-full text-xs text-emerald-700 sm:col-span-2 lg:col-span-4">
          {successText}
        </p>
      ) : null}
    </form>
  );
}
