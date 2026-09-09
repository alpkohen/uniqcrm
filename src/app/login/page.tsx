import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.27_0.04_215)] lg:flex-row">
      <div className="flex flex-1 flex-col justify-between px-8 py-10 text-white lg:px-14 lg:py-16">
        <p className="text-xs font-medium tracking-[0.28em] uppercase text-[oklch(0.82_0.1_75)]">
          Uniq
        </p>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Eğitim ve danışmanlık satışını tek yerden yönetin.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Nimble yerine Uniq ekibine özel, sade CRM + SFA. Kişiler, fırsatlar,
            iş akışları ve görevler — e-posta senkronu yok, gürültü yok.
          </p>
        </div>
        <p className="text-xs text-white/40">İç kullanım · 2 kullanıcı</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Giriş</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Demo hesaplar hazır: yönetici veya üye.
          </p>
          <LoginForm />
          <div className="mt-6 space-y-1 rounded-lg bg-muted/70 px-3 py-3 text-xs text-muted-foreground">
            <p>ayse@uniq.com.tr · Uniq2026! · Yönetici</p>
            <p>mehmet@uniq.com.tr · Uniq2026! · Üye</p>
          </div>
        </div>
      </div>
    </div>
  );
}
