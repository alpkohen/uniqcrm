"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveDeal } from "@/actions/deals";
import { KanbanBoard } from "@/components/kanban-board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOST_REASONS } from "@/lib/constants";
import { formatTry, fullName } from "@/lib/format";

type DealCard = {
  id: string;
  title: string;
  amount: number;
  lostReason: string | null;
  owner: { name: string };
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

type Column = { id: string; name: string; color: string; isLost: boolean; items: DealCard[] };

export function DealKanban({ columns }: { columns: Column[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<{ dealId: string; stageId: string; title: string } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lostIds = new Set(columns.filter((column) => column.isLost).map((column) => column.id));

  function closeDialog() {
    if (busy) return;
    setPending(null);
    setError(null);
  }

  async function confirmLoss() {
    if (!pending) return;
    if (!reason) {
      setError("Lütfen bir kayıp nedeni seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await moveDeal(pending.dealId, pending.stageId, reason);
      setPending(null);
      router.refresh();
    } catch {
      setError("Kaydedilemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <KanbanBoard
        columns={columns}
        interceptMove={(dealId, stageId) => {
          if (!lostIds.has(stageId)) return false;
          const source = columns.find((column) => column.items.some((item) => item.id === dealId));
          // Already lost (moving between lost columns): keeps its existing reason.
          if (!source || lostIds.has(source.id)) return false;
          const deal = source.items.find((item) => item.id === dealId);
          setReason("");
          setError(null);
          setPending({ dealId, stageId, title: deal?.title ?? "" });
          return true;
        }}
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
            {deal.lostReason ? (
              <p className="mt-2 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                {deal.lostReason}
              </p>
            ) : null}
          </div>
        )}
      />

      <Dialog open={pending !== null} onOpenChange={(open) => (open ? undefined : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neden kaybedildi?</DialogTitle>
            <DialogDescription>
              {pending?.title ? `“${pending.title}” ` : ""}fırsatını Kaybedildi’ye taşımak için kayıp nedenini seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="field-select h-9"
              autoFocus
            >
              <option value="">Neden seçin…</option>
              {LOST_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={busy}>
              Vazgeç
            </Button>
            <Button type="button" onClick={confirmLoss} disabled={busy}>
              {busy ? "Kaydediliyor…" : "Kaybedildi olarak işaretle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
