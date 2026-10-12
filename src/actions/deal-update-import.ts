"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// One row of the Nimble deals export, already mapped to these keys by the client.
export type DealUpdateRow = {
  title?: string;
  amount?: string;
  stage?: string;
  status?: string;
  lostReason?: string;
  closedDate?: string;
  createdDate?: string;
  contact?: string;
};

export type DealUpdateResult = {
  applied: boolean;
  total: number;
  matched: number;
  ambiguous: number;
  unmatched: string[];
  unmatchedCount: number;
  willSetReason: number;
  willSetClosed: number;
  willSetCreated: number;
  willSetAmount: number;
  statusDiffers: number;
  lostStillWithoutReason: number;
  created: number;
  createdErrors: string[];
};

function normTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

// Nimble dates carry no timezone ("2025-03-01T00:00"); read them as UTC so a
// date never shifts by a day depending on the server's timezone.
function parseCsvDate(value: string | undefined) {
  const text = value?.trim();
  if (!text) return null;
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sqlTimestamp(date: Date | null) {
  return date ? date.toISOString().slice(0, 19).replace("T", " ") : null;
}

function parseAmount(value: string | undefined) {
  const n = Math.round(Number(String(value ?? "").replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function csvStatus(row: DealUpdateRow): "OPEN" | "WON" | "LOST" {
  const status = (row.status ?? row.stage ?? "").trim().toLowerCase();
  if (status === "won") return "WON";
  if (status === "lost") return "LOST";
  return "OPEN";
}

export async function updateDealsFromCsv(
  rows: DealUpdateRow[],
  options: { apply: boolean; createMissing: boolean },
): Promise<DealUpdateResult> {
  const user = await requireUser();

  const result: DealUpdateResult = {
    applied: options.apply,
    total: rows.length,
    matched: 0,
    ambiguous: 0,
    unmatched: [],
    unmatchedCount: 0,
    willSetReason: 0,
    willSetClosed: 0,
    willSetCreated: 0,
    willSetAmount: 0,
    statusDiffers: 0,
    lostStillWithoutReason: 0,
    created: 0,
    createdErrors: [],
  };

  const deals = await prisma.deal.findMany({
    select: { id: true, title: true, amount: true, status: true, lostReason: true, closedAt: true, createdAt: true },
  });
  const byTitle = new Map<string, typeof deals>();
  for (const deal of deals) {
    const key = normTitle(deal.title);
    const list = byTitle.get(key);
    if (list) list.push(deal);
    else byTitle.set(key, [deal]);
  }

  type Update = {
    id: string;
    lostReason: string | null;
    closedAt: Date | null;
    createdAt: Date | null;
    amount: number | null;
  };
  const updates: Update[] = [];
  const unmatchedRows: DealUpdateRow[] = [];
  const reasonAfter = new Map<string, string | null>(deals.map((deal) => [deal.id, deal.lostReason?.trim() || null]));
  const seen = new Set<string>();

  for (const row of rows) {
    const title = row.title?.trim();
    if (!title) continue;

    const candidates = byTitle.get(normTitle(title)) ?? [];
    let deal = candidates.length === 1 ? candidates[0] : undefined;
    if (candidates.length > 1) {
      const amount = parseAmount(row.amount);
      const byAmount = candidates.filter((item) => item.amount === amount);
      if (byAmount.length === 1) deal = byAmount[0];
      else {
        result.ambiguous += 1;
        continue;
      }
    }
    if (!deal) {
      unmatchedRows.push(row);
      continue;
    }
    if (seen.has(deal.id)) continue;
    seen.add(deal.id);
    result.matched += 1;

    const sourceStatus = csvStatus(row);
    if (sourceStatus !== deal.status) result.statusDiffers += 1;

    const update: Update = { id: deal.id, lostReason: null, closedAt: null, createdAt: null, amount: null };
    let changed = false;

    // The CRM's own state wins: a reason is only attached to deals that are lost here,
    // and never overwrites one that was already chosen.
    const reason = row.lostReason?.trim();
    if (deal.status === "LOST" && reason && !deal.lostReason?.trim()) {
      update.lostReason = reason;
      reasonAfter.set(deal.id, reason);
      result.willSetReason += 1;
      changed = true;
    }

    const closed = parseCsvDate(row.closedDate);
    if (deal.status !== "OPEN" && closed && !deal.closedAt) {
      update.closedAt = closed;
      result.willSetClosed += 1;
      changed = true;
    }

    // Imported deals were all created at import time; the export has the real date.
    const created = parseCsvDate(row.createdDate);
    if (created && Math.abs(created.getTime() - deal.createdAt.getTime()) > 1000) {
      update.createdAt = created;
      result.willSetCreated += 1;
      changed = true;
    }

    const amount = parseAmount(row.amount);
    if (deal.amount === 0 && amount > 0) {
      update.amount = amount;
      result.willSetAmount += 1;
      changed = true;
    }

    if (changed) updates.push(update);
  }

  result.unmatchedCount = unmatchedRows.length;
  result.unmatched = unmatchedRows.slice(0, 15).map((row) => row.title!.trim());
  result.lostStillWithoutReason = deals.filter((deal) => deal.status === "LOST" && !reasonAfter.get(deal.id)).length;

  if (!options.apply) return result;

  // COALESCE keeps the current value for every column the CSV did not supply, and a raw
  // UPDATE does not touch "updatedAt" — so the board ordering is not disturbed.
  if (updates.length > 0) {
    const values = updates.map(
      (u) =>
        Prisma.sql`(${u.id}::text, ${u.lostReason}::text, ${sqlTimestamp(u.closedAt)}::timestamp, ${sqlTimestamp(u.createdAt)}::timestamp, ${u.amount}::int)`,
    );
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Deal" AS d SET
        "lostReason" = COALESCE(v.reason, d."lostReason"),
        "closedAt" = COALESCE(v.closed, d."closedAt"),
        "createdAt" = COALESCE(v.created, d."createdAt"),
        "amount" = COALESCE(v.amount, d."amount")
      FROM (VALUES ${Prisma.join(values)}) AS v(id, reason, closed, created, amount)
      WHERE d.id = v.id
    `);
  }

  if (options.createMissing && unmatchedRows.length > 0) {
    const pipeline = await prisma.pipeline.findFirst({
      include: { stages: { orderBy: { sortOrder: "asc" } } },
    });
    if (pipeline && pipeline.stages.length > 0) {
      const wonStage = pipeline.stages.find((stage) => stage.isWon);
      const lostStage = pipeline.stages.find((stage) => stage.isLost);
      const openStages = pipeline.stages.filter((stage) => !stage.isWon && !stage.isLost);
      const proposalStage = openStages.find((stage) => stage.name.toLowerCase().includes("teklif")) ?? openStages[0];

      for (const row of unmatchedRows) {
        const title = row.title!.trim();
        const status = csvStatus(row);
        const stage = status === "WON" ? wonStage : status === "LOST" ? lostStage : proposalStage;
        if (!stage) {
          result.createdErrors.push(`${title}: uygun aşama bulunamadı`);
          continue;
        }

        let companyId: string | null = null;
        let contactId: string | null = null;
        const related = row.contact?.trim();
        if (related) {
          const company = await prisma.company.findFirst({
            where: { name: { equals: related, mode: "insensitive" } },
            select: { id: true },
          });
          companyId = company?.id ?? null;
          if (!companyId) {
            const [first, ...rest] = related.split(/\s+/);
            const contact = await prisma.contact.findFirst({
              where: {
                firstName: { equals: first, mode: "insensitive" },
                lastName: { equals: rest.join(" "), mode: "insensitive" },
              },
              select: { id: true },
            });
            contactId = contact?.id ?? null;
          }
        }

        try {
          await prisma.deal.create({
            data: {
              title,
              amount: parseAmount(row.amount),
              pipelineId: pipeline.id,
              stageId: stage.id,
              status,
              lostReason: status === "LOST" ? row.lostReason?.trim() || null : null,
              closedAt: status === "OPEN" ? null : parseCsvDate(row.closedDate),
              createdAt: parseCsvDate(row.createdDate) ?? undefined,
              companyId,
              contactId,
              ownerId: user.id,
            },
          });
          result.created += 1;
        } catch {
          result.createdErrors.push(`${title}: eklenemedi`);
        }
      }
    }
  }

  revalidatePath("/deals");
  revalidatePath("/import");
  revalidatePath("/");
  return result;
}
