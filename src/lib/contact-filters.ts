import type { Prisma } from "@prisma/client";
import { searchContactIds } from "@/lib/search";
import { MAIL_OPTOUT_JSON } from "@/lib/mail-optout";

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
  return {
    AND: [
      ids ? { id: { in: ids } } : {},
      tag ? { tags: { some: { tagId: tag } } } : {},
      owner ? { ownerId: owner } : {},
      mail === "optout" ? { customData: { contains: MAIL_OPTOUT_JSON } } : {},
      mail === "ok" ? { NOT: { customData: { contains: MAIL_OPTOUT_JSON } } } : {},
    ],
  };
}
