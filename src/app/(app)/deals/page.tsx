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

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isListView = view === "list";
  const user = await requireUser();
  const pipeline = await prisma.pipeline.findFirst({
    include: {
      stages: {
        orderBy: { sortOrder: "asc" },
        include: {
          deals: {
            include: { owner: true, company: true, contact: true },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  const openTotal =
    pipeline?.stages
      .filter((stage) => !stage.isWon && !stage.isLost)
      .reduce((sum, stage) => sum + stage.deals.reduce((acc, deal) => acc + deal.amount, 0), 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={pipeline?.name ?? "Fırsatlar"}
        description={
          isListView
            ? `Açık pipeline ${formatTry(openTotal)}`
            : `Açık pipeline ${formatTry(openTotal)} · kartı sürükleyerek aşama değiştirin.`
        }
        actions={
          <>
            <div className="flex overflow-hidden rounded-lg border text-sm">
              <Link
                href="/deals"
                className={`px-3 py-1.5 ${!isListView ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
              >
                Pipeline
              </Link>
              <Link
                href="/deals?view=list"
                className={`border-l px-3 py-1.5 ${isListView ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
              >
                Liste
              </Link>
            </div>
            <Button render={<a href="/api/deals/export" />} variant="outline" nativeButton={false}>
              Dışa aktar
            </Button>
          </>
        }
      />

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
            dealCount: stage.deals.length,
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
