import type { Prisma } from "@prisma/client";

export type DealDateField = "createdAt" | "updatedAt";

export type DealRange = {
  from: string;
  to: string;
  by: "created" | "updated";
  field: DealDateField;
  where: Prisma.DealWhereInput;
  active: boolean;
};

function validDate(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "created" = deals that entered the pipeline in the range (a cohort funnel);
// "updated" = deals touched in the range, which for won/lost deals is the closing date.
export function parseDealRange(params: { from?: string; to?: string; by?: string }): DealRange {
  const by = params.by === "updated" ? "updated" : "created";
  const field: DealDateField = by === "updated" ? "updatedAt" : "createdAt";
  const fromDate = validDate(params.from, false);
  const toDate = validDate(params.to, true);

  const bounds: Prisma.DateTimeFilter = {};
  if (fromDate) bounds.gte = fromDate;
  if (toDate) bounds.lte = toDate;
  const active = Boolean(fromDate || toDate);

  return {
    from: fromDate ? params.from! : "",
    to: toDate ? params.to! : "",
    by,
    field,
    where: active ? { [field]: bounds } : {},
    active,
  };
}
