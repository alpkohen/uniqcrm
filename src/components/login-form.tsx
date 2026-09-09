"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {} as AuthState);

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">E-posta</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="ayse@uniq.com.tr"
          className="field-input h-9"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Şifre</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="Uniq2026!"
          className="field-input h-9"
        />
      </label>
      {state?.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-9">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
    </form>
  );
}
