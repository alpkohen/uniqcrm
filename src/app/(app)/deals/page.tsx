import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatTry } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { DealKanban } from "@/components/deal-kanban";
import { DealList } from "@/components/deal-list";
import { StageManager } from "@/components/stage-manager";
import { SearchSelect } from "@/components/search-select";
import { createDeal } from "@/actions/deals";
import { parseDealRange } from "@/lib/deal-range";
import { LOST_REASONS } from "@/lib/constants";

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function presetRange(months: number) {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - (months - 1), 1);
  return { from: iso(from), to: iso(to) };
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string; by?: string }>;
}) {
  const sp = await searchParams;
  const { view } = sp;
  const range = parseDealRange(sp);
  const isListView = view === "list";
  const user = await requireUser();
  const pipeline = await prisma.pipeline.findFirst({
    include: {
      stages: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { deals: true } },
          deals: {
            where: range.where,
            include: { owner: true, company: true, contact: true },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  const summarize = (pick: (stage: { isWon: boolean; isLost: boolean }) => boolean) => {
    const stages = (pipeline?.stages ?? []).filter(pick);
    return {
      count: stages.reduce((n, stage) => n + stage.deals.length, 0),
      amount: stages.reduce((sum, stage) => sum + stage.deals.reduce((acc, deal) => acc + deal.amount, 0), 0),
    };
  };
  const open = summarize((stage) => !stage.isWon && !stage.isLost);
  const won = summarize((stage) => stage.isWon);
  const lost = summarize((stage) => stage.isLost);
  const openTotal = open.amount;
  const reasonCounts = new Map<string, { count: number; amount: number }>();
  for (const stage of pipeline?.stages ?? []) {
    if (!stage.isLost) continue;
    for (const deal of stage.deals) {
      const key = deal.lostReason?.trim() || "Neden girilmemiş";
      const entry = reasonCounts.get(key) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += deal.amount;
      reasonCounts.set(key, entry);
    }
  }
  const reasonRows = [...reasonCounts.entries()]
    .map(([reason, value]) => ({ reason, ...value }))
    .sort((a, b) => b.count - a.count);
  const maxReason = Math.max(1, ...reasonRows.map((row) => row.count));
  const winRate = won.count + lost.count > 0 ? Math.round((won.count / (won.count + lost.count)) * 100) : null;

  const queryFor = (overrides: Record<string, string | undefined> = {}) => {
    const merged: Record<string, string | undefined> = {
      view: isListView ? "list" : undefined,
      from: range.from || undefined,
      to: range.to || undefined,
      by: range.by === "closed" ? "closed" : undefined,
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/deals?${qs}` : "/deals";
  };
  const exportParams = new URLSearchParams();
  if (range.from) exportParams.set("from", range.from);
  if (range.to) exportParams.set("to", range.to);
  if (range.active) exportParams.set("by", range.by);
  const exportHref = exportParams.toString() ? `/api/deals/export?${exportParams.toString()}` : "/api/deals/export";
  const presets = [
    { label: "Bu ay", ...presetRange(1) },
    { label: "Son 3 ay", ...presetRange(3) },
    { label: "Son 12 ay", ...presetRange(12) },
  ];
  const rangeLabel = range.active
    ? `${range.from || "…"} – ${range.to || "…"} arası ${range.by === "closed" ? "kapanan" : "oluşturulan"} fırsatlar`
    : "tüm zamanlar";

  return (
    <div>
      <PageHeader
        title={pipeline?.name ?? "Fırsatlar"}
        description={
          isListView
            ? `Açık pipeline ${formatTry(openTotal)} · ${rangeLabel}`
            : `Açık pipeline ${formatTry(openTotal)} · ${rangeLabel} · kartı sürükleyerek aşama değiştirin.`
        }
        actions={
          <>
            <div className="flex overflow-hidden rounded-lg border text-sm">
              <Link
                href={queryFor({ view: undefined })}
                className={`px-3 py-1.5 ${!isListView ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
              >
                Pipeline
              </Link>
              <Link
                href={queryFor({ view: "list" })}
                className={`border-l px-3 py-1.5 ${isListView ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
              >
                Liste
              </Link>
            </div>
            <Button render={<a href={exportHref} />} variant="outline" nativeButton={false}>
              Dışa aktar
            </Button>
          </>
        }
      />

      <form action="/deals" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3 text-sm">
        {isListView ? <input type="hidden" name="view" value="list" /> : null}
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Başlangıç</span>
          <input type="date" name="from" defaultValue={range.from} className="field-input h-8" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Bitiş</span>
          <input type="date" name="to" defaultValue={range.to} className="field-input h-8" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Tarih alanı</span>
          <select name="by" defaultValue={range.by} className="field-select h-8">
            <option value="created">Oluşturulma tarihi</option>
            <option value="closed">Kapanış tarihi</option>
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          Uygula
        </Button>
        <div className="ml-2 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <Link
              key={preset.label}
              href={queryFor({ from: preset.from, to: preset.to })}
              className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {preset.label}
            </Link>
          ))}
          {range.active ? (
            <Link
              href={queryFor({ from: undefined, to: undefined })}
              className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Tümü
            </Link>
          ) : null}
        </div>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Açık</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{open.count.toLocaleString("tr-TR")}</p>
          <p className="text-xs text-muted-foreground">{formatTry(open.amount)}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-medium text-emerald-700">Kazanıldı</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">{won.count.toLocaleString("tr-TR")}</p>
          <p className="text-xs text-muted-foreground">{formatTry(won.amount)}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-medium text-destructive">Kaybedildi</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-destructive">{lost.count.toLocaleString("tr-TR")}</p>
          <p className="text-xs text-muted-foreground">{formatTry(lost.amount)}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Kazanma oranı</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{winRate === null ? "—" : `%${winRate}`}</p>
          <p className="text-xs text-muted-foreground">kazanılan / (kazanılan + kaybedilen)</p>
        </div>
      </div>

      {reasonRows.length > 0 ? (
        <section className="mb-4 rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">Kaybetme nedenleri</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {reasonRows.map((row) => (
              <div key={row.reason}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className={row.reason === "Neden girilmemiş" ? "text-muted-foreground" : "font-medium"}>
                    {row.reason}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.count.toLocaleString("tr-TR")} · {formatTry(row.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive/70"
                    style={{ width: `${(row.count / maxReason) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {pipeline ? (
        isListView ? (
          <DealList
            deals={pipeline.stages.flatMap((stage) =>
              stage.deals.map((deal) => ({ ...deal, stage: { name: stage.name } })),
            )}
          />
        ) : (
          <DealKanban
            columns={pipeline.stages.map((stage) => ({
              id: stage.id,
              name: stage.name,
              color: stage.color,
              isLost: stage.isLost,
              items: stage.deals,
            }))}
          />
        )
      ) : (
        <p className="text-sm text-muted-foreground">Pipeline henüz yok. Seed çalıştırın.</p>
      )}

      {pipeline ? (
        <StageManager
          pipelineId={pipeline.id}
          stages={pipeline.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            isWon: stage.isWon,
            isLost: stage.isLost,
            dealCount: stage._count.deals,
          }))}
        />
      ) : null}

      <section className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Yeni fırsat</h2>
        <form action={createDeal} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="pipelineId" value={pipeline?.id ?? ""} />
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Başlık</span>
            <input name="title" required className="field-input" placeholder="Örn. Liderlik programı — 2 grup" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tutar (TRY)</span>
            <input name="amount" type="number" min="0" defaultValue={0} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Aşama</span>
            <select name="stageId" className="field-select" defaultValue={pipeline?.stages[0]?.id}>
              {pipeline?.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Kayıp nedeni</span>
            <select name="lostReason" defaultValue="" className="field-select">
              <option value="">— (Kaybedildi aşamasında zorunlu)</option>
              {LOST_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Firma</span>
            <SearchSelect name="companyId" searchUrl="/api/companies/search" placeholder="Firma ara..." />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Kişi</span>
            <SearchSelect name="contactId" searchUrl="/api/contacts/search" placeholder="Kişi ara..." />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Sahip</span>
            <select name="ownerId" defaultValue={user.id} className="field-select">
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit">Fırsat ekle</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
