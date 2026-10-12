import type { Prisma } from "@prisma/client";
import { searchContactIds } from "@/lib/search";
import { getMailOptOutKey, mailOptOutJson } from "@/lib/mail-optout";

export type MailFilter = "" | "optout" | "ok";

export function parseMailFilter(value: string | undefined): MailFilter {
  return value === "optout" || value === "ok" ? value : "";
}

export async function buildContactWhere({
  q,
  tag,
  owner,
  mail = "",
}: {
  q: string;
  tag: string;
  owner: string;
  mail?: MailFilter;
}): Promise<Prisma.ContactWhereInput> {
  const ids = q ? await searchContactIds(q) : null;
  const optOut = mail ? mailOptOutJson(await getMailOptOutKey()) : "";
  return {
    AND: [
      ids ? { id: { in: ids } } : {},
      tag ? { tags: { some: { tagId: tag } } } : {},
      owner ? { ownerId: owner } : {},
      mail === "optout" ? { customData: { contains: optOut } } : {},
      mail === "ok" ? { NOT: { customData: { contains: optOut } } } : {},
    ],
  };
}
