import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui-helpers";

export default async function WorkflowsPage() {
  const boards = await prisma.workflowBoard.findMany({
    include: { _count: { select: { cards: true } }, columns: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="İş akışları"
        description="Lead, seyahat ve benzeri operasyon panoları. Kartlar kişilere bağlanır."
      />
      {boards.length === 0 ? (
        <EmptyState title="Pano yok" description="Seed verisi Lead ve Seyahat panolarını oluşturur." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/workflows/${board.id}`}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <h2 className="text-lg font-semibold">{board.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {board.columns.map((column) => column.name).join(" → ")}
              </p>
              <p className="mt-2 text-sm">{board._count.cards} kart</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
