import type { Prisma } from "@prisma/client";
import { searchContactIds } from "@/lib/search";

export async function buildContactWhere({
  q,
  tag,
  owner,
}: {
  q: string;
  tag: string;
  owner: string;
}): Promise<Prisma.ContactWhereInput> {
  const ids = q ? await searchContactIds(q) : null;
  return {
    AND: [
      ids ? { id: { in: ids } } : {},
      tag ? { tags: { some: { tagId: tag } } } : {},
      owner ? { ownerId: owner } : {},
    ],
  };
}
