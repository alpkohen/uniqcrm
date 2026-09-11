"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveDeal } from "@/actions/deals";
import { KanbanBoard } from "@/components/kanban-board";
import { formatTry, fullName } from "@/lib/format";

type DealCard = {
  id: string;
  title: string;
  amount: number;
  owner: { name: string };
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

export function DealKanban({
  columns,
}: {
  columns: { id: string; name: string; color: string; items: DealCard[] }[];
}) {
  const router = useRouter();

  return (
    <KanbanBoard
      columns={columns}
      onMove={async (dealId, stageId) => {
        await moveDeal(dealId, stageId);
        router.refresh();
      }}
      renderCard={(deal) => (
        <div className="cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing">
          <Link href={`/deals/${deal.id}`} className="text-sm font-medium leading-snug hover:underline">
            {deal.title}
          </Link>
          <p className="mt-1 text-sm text-primary">{formatTry(deal.amount)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {deal.company ? (
              <Link href={`/companies/${deal.company.id}`} className="hover:underline">
                {deal.company.name}
              </Link>
            ) : deal.contact ? (
              <Link href={`/contacts/${deal.contact.id}`} className="hover:underline">
                {fullName(deal.contact.firstName, deal.contact.lastName)}
              </Link>
            ) : (
              deal.owner.name
            )}
          </p>
        </div>
      )}
    />
  );
}
