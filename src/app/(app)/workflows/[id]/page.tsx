import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/search-select";
import { WorkflowKanban } from "@/components/workflow-kanban";
import { createWorkflowCard } from "@/actions/deals";

export default async function WorkflowBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const board = await prisma.workflowBoard.findUnique({
    where: { id },
    include: {
      columns: {
        orderBy: { sortOrder: "asc" },
        include: {
          cards: {
            include: { owner: true, contact: true, company: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
  if (!board) notFound();

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  const addCard = createWorkflowCard.bind(null, board.id);

  return (
    <div>
      <PageHeader title={board.name} description={board.description ?? "Kartları sütunlar arasında sürükleyin."} />
      <WorkflowKanban
        columns={board.columns.map((column) => ({
          id: column.id,
          name: column.name,
          color: column.color,
          items: column.cards,
        }))}
      />
      <section className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Kart ekle</h2>
        <form action={addCard} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Başlık</span>
            <input name="title" required className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Sütun</span>
            <select name="columnId" className="field-select" defaultValue={board.columns[0]?.id}>
              {board.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Kişi</span>
            <SearchSelect name="contactId" searchUrl="/api/contacts/search" placeholder="Kişi ara..." />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Firma</span>
            <SearchSelect name="companyId" searchUrl="/api/companies/search" placeholder="Firma ara..." />
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
          <label className="grid gap-1.5 text-sm sm:col-span-2 lg:col-span-3">
            <span className="font-medium">Not</span>
            <textarea name="notes" className="field-textarea min-h-16" />
          </label>
          <div>
            <Button type="submit">Kart ekle</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
