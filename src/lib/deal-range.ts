import type { Prisma } from "@prisma/client";

export type DealRange = {
  from: string;
  to: string;
  by: "created" | "closed";
  where: Prisma.DealWhereInput;
  active: boolean;
};

function validDate(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "created" = deals that entered the pipeline in the range (a cohort funnel).
// "closed"  = deals closed (won/lost) in the range; deals without a stored closing
// date fall back to their last update, so older records are not silently dropped.
export function parseDealRange(params: { from?: string; to?: string; by?: string }): DealRange {
  const by = params.by === "closed" || params.by === "updated" ? "closed" : "created";
  const fromDate = validDate(params.from, false);
  const toDate = validDate(params.to, true);

  const bounds: Prisma.DateTimeFilter = {};
  if (fromDate) bounds.gte = fromDate;
  if (toDate) bounds.lte = toDate;
  const active = Boolean(fromDate || toDate);

  let where: Prisma.DealWhereInput = {};
  if (active) {
    where =
      by === "created"
        ? { createdAt: bounds }
        : { OR: [{ closedAt: bounds }, { closedAt: null, updatedAt: bounds }] };
  }

  return {
    from: fromDate ? params.from! : "",
    to: toDate ? params.to! : "",
    by,
    where,
    active,
  };
}
