"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveDeal, setDealLostReason } from "@/actions/deals";
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
  // Reasons picked straight on a card show immediately, before the refresh brings them back.
  const [picked, setPicked] = useState<Record<string, string>>({});

  async function setReasonOnCard(dealId: string, value: string) {
    if (!value) return;
    const previous = picked[dealId];
    setPicked((current) => ({ ...current, [dealId]: value }));
    try {
      await setDealLostReason(dealId, value);
      router.refresh();
    } catch {
      setPicked((current) => {
        const next = { ...current };
        if (previous === undefined) delete next[dealId];
        else next[dealId] = previous;
        return next;
      });
    }
  }

  const lostIds = new Set(columns.filter((column) => column.isLost).map((column) => column.id));
  const columnOf = (dealId: string) =>
    columns.find((column) => column.items.some((item) => item.id === dealId))?.id ?? "";

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
            {lostIds.has(columnOf(deal.id)) ? (
              <select
                aria-label="Kayıp nedeni"
                value={picked[deal.id] ?? deal.lostReason ?? ""}
                onChange={(event) => setReasonOnCard(deal.id, event.target.value)}
                onPointerDown={(event) => event.stopPropagation()}
                className={
                  (picked[deal.id] ?? deal.lostReason)
                    ? "mt-2 max-w-full cursor-pointer rounded-full border-0 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive outline-none"
                    : "mt-2 max-w-full cursor-pointer rounded-full border border-dashed border-destructive/50 bg-transparent px-2 py-0.5 text-[11px] font-medium text-destructive/80 outline-none"
                }
              >
                <option value="">+ Kayıp nedeni seç</option>
                {LOST_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                {deal.lostReason && !(LOST_REASONS as readonly string[]).includes(deal.lostReason) ? (
                  <option value={deal.lostReason}>{deal.lostReason}</option>
                ) : null}
              </select>
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
