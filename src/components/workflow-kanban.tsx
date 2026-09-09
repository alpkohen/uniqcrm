"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveWorkflowCard } from "@/actions/deals";
import { KanbanBoard } from "@/components/kanban-board";
import { fullName } from "@/lib/format";

type Card = {
  id: string;
  title: string;
  notes: string | null;
  owner: { name: string };
  contact: { id: string; firstName: string; lastName: string } | null;
  company: { id: string; name: string } | null;
};

export function WorkflowKanban({
  columns,
}: {
  columns: { id: string; name: string; color: string; items: Card[] }[];
}) {
  const router = useRouter();

  return (
    <KanbanBoard
      columns={columns}
      onMove={async (cardId, columnId) => {
        await moveWorkflowCard(cardId, columnId);
        router.refresh();
      }}
      renderCard={(card) => (
        <div className="cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing">
          <p className="text-sm font-medium leading-snug">{card.title}</p>
          {card.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.notes}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {card.contact ? (
              <Link href={`/contacts/${card.contact.id}`} className="hover:underline">
                {fullName(card.contact.firstName, card.contact.lastName)}
              </Link>
            ) : card.company ? (
              card.company.name
            ) : (
              card.owner.name
            )}
          </p>
        </div>
      )}
    />
  );
}
