import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  const b = brand();
  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.27_0.04_215)] lg:flex-row">
      <div className="flex flex-1 flex-col justify-between gap-10 px-8 py-10 text-white lg:px-14 lg:py-16">
        {b.logo ? (
          <Image src={b.logo} alt={b.name} width={997} height={305} priority className="h-10 w-auto self-start" />
        ) : (
          <p className="text-3xl font-semibold tracking-[0.18em]">{b.name}</p>
        )}
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Müşteri ilişkilerinizi ve satış sürecinizi tek yerden yönetin.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            {b.tagline}
          </p>
        </div>
        <p className="text-xs text-white/40">{b.footer}</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Giriş</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Hesabınızla giriş yapın.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
