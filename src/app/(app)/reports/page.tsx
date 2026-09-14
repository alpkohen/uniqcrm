import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatTry } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type MonthlyRow = { month: Date; status: string; count: number; total: number };

export default async function ReportsPage() {
  await requireUser();

  const [users, repGroups, stageGroups, pipeline, monthlyRows] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.deal.groupBy({ by: ["ownerId", "status"], _count: true, _sum: { amount: true } }),
    prisma.deal.groupBy({ by: ["stageId"], _count: true, _sum: { amount: true } }),
    prisma.pipeline.findFirst({ include: { stages: { orderBy: { sortOrder: "asc" } } } }),
    prisma.$queryRaw<MonthlyRow[]>`
      SELECT date_trunc('month', "updatedAt") as month, status, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::int as total
      FROM "Deal"
      WHERE status IN ('WON', 'LOST') AND "updatedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY month, status
      ORDER BY month ASC
    `,
  ]);

  const repStats = users
    .map((user) => {
      const rows = repGroups.filter((g) => g.ownerId === user.id);
      const open = rows.find((r) => r.status === "OPEN");
      const won = rows.find((r) => r.status === "WON");
      const lost = rows.find((r) => r.status === "LOST");
      const wonCount = won?._count ?? 0;
      const lostCount = lost?._count ?? 0;
      const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;
      return {
        user,
        openCount: open?._count ?? 0,
        openAmount: open?._sum.amount ?? 0,
        wonCount,
        wonAmount: won?._sum.amount ?? 0,
        lostCount,
        winRate,
      };
    })
    .sort((a, b) => b.wonAmount - a.wonAmount);

  const stages = (pipeline?.stages ?? []).map((stage) => {
    const group = stageGroups.find((g) => g.stageId === stage.id);
    return { stage, count: group?._count ?? 0, amount: group?._sum.amount ?? 0 };
  });
  const maxStageCount = Math.max(1, ...stages.map((s) => s.count));

  const totalWon = repStats.reduce((sum, r) => sum + r.wonCount, 0);
  const totalLost = repStats.reduce((sum, r) => sum + r.lostCount, 0);
  const overallWinRate = totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : null;

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

  return (
    <div>
      <PageHeader
        title="Raporlar"
        description="Danışman performansı, aşama dönüşümü ve aylık kazanılan/kaybedilen fırsatlar."
      />

      <section className="mb-8 rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Danışman performansı</h2>
        {repStats.every((r) => r.openCount === 0 && r.wonCount === 0 && r.lostCount === 0) ? (
          <p className="text-sm text-muted-foreground">Henüz fırsat yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Danışman</th>
                  <th className="py-2 pr-4 font-medium">Açık</th>
                  <th className="py-2 pr-4 font-medium">Kazanılan</th>
                  <th className="py-2 pr-4 font-medium">Kaybedilen</th>
                  <th className="py-2 pr-4 font-medium">Kazanma oranı</th>
                </tr>
              </thead>
              <tbody>
                {repStats.map((r) => (
                  <tr key={r.user.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{r.user.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {r.openCount} · {formatTry(r.openAmount)}
                    </td>
                    <td className="py-2 pr-4 text-primary">
                      {r.wonCount} · {formatTry(r.wonAmount)}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.lostCount}</td>
                    <td className="py-2 pr-4">{r.winRate === null ? "—" : `%${r.winRate}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium">Aşama dönüşümü</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Genel kazanma oranı: {overallWinRate === null ? "—" : `%${overallWinRate}`} ({totalWon} kazanıldı ·{" "}
          {totalLost} kaybedildi)
        </p>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pipeline henüz yok.</p>
        ) : (
          <div className="grid gap-3">
            {stages.map(({ stage, count, amount }) => (
              <div key={stage.id}>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{stage.name}</span>
                  <span>
                    {count} · {formatTry(amount)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(count / maxStageCount) * 100}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium">Aylık kazanılan / kaybedilen</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Son 12 ay · aşama değişim tarihi olarak son güncelleme tarihi kullanılır.
        </p>
        {monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz kapanmış fırsat yok.</p>
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
