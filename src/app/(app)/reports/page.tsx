import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatTry } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { StageFunnel } from "@/components/stage-funnel";

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type MonthlyRow = { month: Date; status: string; count: number; total: number };

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangePreset(months: number) {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - (months - 1), 1);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to ? new Date(`${params.to}T23:59:59`) : today;

  const [pipeline, monthlyRows] = await Promise.all([
    prisma.pipeline.findFirst({
      include: {
        stages: {
          orderBy: { sortOrder: "asc" },
          include: {
            deals: {
              select: {
                id: true,
                title: true,
                amount: true,
                company: { select: { name: true } },
                contact: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.$queryRaw<MonthlyRow[]>`
      SELECT
        date_trunc('month', "updatedAt") as month,
        status,
        COUNT(*)::int as count,
        COALESCE(SUM(amount), 0)::int as total
      FROM "Deal"
      WHERE status IN ('WON', 'LOST')
        AND "updatedAt" >= ${from}
        AND "updatedAt" <= ${to}
      GROUP BY month, status
      ORDER BY month ASC
    `,
  ]);

  const stages = (pipeline?.stages ?? []).map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    deals: stage.deals,
  }));

  const wonStageIds = new Set((pipeline?.stages ?? []).filter((s) => s.isWon).map((s) => s.id));
  const lostStageIds = new Set((pipeline?.stages ?? []).filter((s) => s.isLost).map((s) => s.id));
  const wonCount = (pipeline?.stages ?? []).filter((s) => wonStageIds.has(s.id)).reduce((n, s) => n + s.deals.length, 0);
  const lostCount = (pipeline?.stages ?? []).filter((s) => lostStageIds.has(s.id)).reduce((n, s) => n + s.deals.length, 0);
  const overallWinRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;

  const monthKeys: string[] = [];
  const monthlyMap = new Map<string, { won: number; wonAmount: number; lost: number; lostAmount: number }>();
  for (const row of monthlyRows) {
    const key = `${row.month.getFullYear()}-${String(row.month.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { won: 0, wonAmount: 0, lost: 0, lostAmount: 0 });
      monthKeys.push(key);
    }
    const entry = monthlyMap.get(key)!;
    if (row.status === "WON") {
      entry.won = row.count;
      entry.wonAmount = row.total;
    } else {
      entry.lost = row.count;
      entry.lostAmount = row.total;
    }
  }
  const monthly = monthKeys.map((key) => {
    const [year, month] = key.split("-");
    return { label: `${MONTH_LABELS[Number(month) - 1]} ${year}`, ...monthlyMap.get(key)! };
  });
  const maxMonthlyAmount = Math.max(1, ...monthly.flatMap((m) => [m.wonAmount, m.lostAmount]));

  const presets = [
    { label: "Bu ay", ...rangePreset(1) },
    { label: "Son 3 ay", ...rangePreset(3) },
    { label: "Son 12 ay", ...rangePreset(12) },
  ];

  return (
    <div>
      <PageHeader title="Raporlar" description="Aşama dönüşümü ve aylık kazanılan/kaybedilen fırsatlar." />

      <section className="mb-8 rounded-xl border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium">Aşama dönüşümü</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Genel kazanma oranı: {overallWinRate === null ? "—" : `%${overallWinRate}`} ({wonCount} kazanıldı ·{" "}
          {lostCount} kaybedildi) · bir aşamaya tıklayın, içindeki fırsatları görün.
        </p>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pipeline henüz yok.</p>
        ) : (
          <StageFunnel stages={stages} />
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium">Aylık kazanılan / kaybedilen</h2>
        <p className="mb-4 text-xs text-muted-foreground">Tarih aralığı seçerek istediğiniz dönemi görüntüleyin.</p>
        <form className="mb-4 flex flex-wrap items-end gap-2 text-sm">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Başlangıç</span>
            <input type="date" name="from" defaultValue={toDateInputValue(from)} className="field-input h-8" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Bitiş</span>
            <input type="date" name="to" defaultValue={toDateInputValue(to)} className="field-input h-8" />
          </label>
          <Button type="submit" variant="outline" size="sm">
            Uygula
          </Button>
          <div className="ml-2 flex gap-1.5">
            {presets.map((preset) => (
              <a
                key={preset.label}
                href={`/reports?from=${preset.from}&to=${preset.to}`}
                className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                {preset.label}
              </a>
            ))}
          </div>
        </form>
        {monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">Seçilen aralıkta kapanmış fırsat yok.</p>
        ) : (
          <div className="grid gap-3">
            {monthly.map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.label}</span>
                  <span>
                    Kazanılan {m.won} · {formatTry(m.wonAmount)} — Kaybedilen {m.lost} · {formatTry(m.lostAmount)}
                  </span>
                </div>
                <div className="flex h-2 gap-0.5">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(m.wonAmount / maxMonthlyAmount) * 100}%` }}
                  />
                  <div
                    className="h-full rounded-full bg-destructive"
                    style={{ width: `${(m.lostAmount / maxMonthlyAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
